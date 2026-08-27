package com.careermate.backend.service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import com.careermate.backend.exception.ExternalServiceException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.extern.slf4j.Slf4j;

/**
 * Thin client for the company's in-house ACE AI Platform (RAG + knowledge
 * graph) — backs AiChatService's search_school_docs tool the same way
 * WorknetService backs search_worknet. One shared bucket for the whole
 * service for now (school-wide 취업지원센터 자료); per-university buckets are
 * a later step once {@link com.careermate.backend.domain.University} carries
 * its own bucket id.
 *
 * ACE's own message-create call already does retrieval AND answer generation
 * in one round trip (POST /messages/{thread_id}/create, scoped by bucket_id)
 * — there's no separate "just give me the matching chunks" endpoint, so this
 * hands back ACE's answer text + cited sources as-is; AiChatService folds
 * that into its own prompt as a tool result, same shape as
 * executeSearchWorknetTool's return value.
 *
 * ask()는 절대 던지지 않는다 — 블랭크 설정이나 실패한 호출 모두 null {@link AceAnswer}로
 * 돌아와서, RAG 장애가 AI 상담 턴 전체를 죽이지 않고 "도구 사용 불가"로 넘어간다.
 *
 * 반면 아래 관리자용 임베딩 등록/조회/삭제 메서드들(uploadFile/embedText/
 * listEmbeddingLogs/deleteBySourceId)은 실패하면 {@link ExternalServiceException}을
 * 그대로 던진다 — 관리자가 지식베이스에 문서를 올렸는지 실패했는지 반드시 알아야
 * 하는 동작이라, ask()처럼 조용히 넘어가면 안 된다(AdminAiKnowledgeController 참고).
 */
@Service
@Slf4j
public class AceService {

    @Value("${career-mate.ace.base-url:}")
    private String baseUrl;

    @Value("${career-mate.ace.api-key:}")
    private String apiKey;

    @Value("${career-mate.ace.bucket-id:}")
    private String bucketId;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper;

    // Lazily created on first real use, reused after. One shared thread is
    // enough — bucket_id (not thread history) is what scopes each call's
    // search, see ACE's MessageCreateRequest. Not race-hardened: a rare
    // double-create under concurrent first calls just wastes one ACE thread
    // row, harmless.
    private volatile String threadId;

    public AceService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public boolean isConfigured() {
        return notBlank(baseUrl) && notBlank(apiKey) && notBlank(bucketId);
    }

    /** Null = "couldn't answer from school docs" — caller (AiChatService) falls back gracefully. */
    public AceAnswer ask(String question) {
        if (!isConfigured()) {
            return null;
        }
        try {
            String tid = ensureThread();
            if (tid == null) {
                return null;
            }

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("contents", List.of(Map.of("role", "user", "content", question)));
            body.put("bucket_id", bucketId);

            JsonNode root = post("/api/v1/messages/" + tid + "/create", body);
            String answer = root.path("answer").asText(null);
            if (answer == null || answer.isBlank()) {
                return null;
            }

            List<String> sources = new ArrayList<>();
            root.path("sources").forEach(s -> sources.add(s.isTextual() ? s.asText() : s.toString()));
            return new AceAnswer(answer, sources);
        } catch (Exception e) {
            log.warn("ACE ask() failed", e);
            return null;
        }
    }

    /**
     * 관리자가 업로드한 파일(PDF/TXT/HWPX/DOCX/PPT/PPTX)을 ACE 지식베이스(공유
     * bucket)에 임베딩. ACE의 "smart" 업로드는 파일 크기/처리 시간에 따라 서버가
     * 알아서 동기(status=success, source_id 즉시 반환)/비동기(status=accepted,
     * job_id로 폴링)를 골라주므로 mode=auto로 맡긴다.
     */
    public AceEmbedResult uploadFile(MultipartFile file) {
        ensureConfiguredOrThrow();
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            headers.set("X_API_KEY", apiKey);

            MultiValueMap<String, Object> form = new LinkedMultiValueMap<>();
            form.add("bucket_id", bucketId);
            form.add("file", file.getResource());
            form.add("mode", "auto");

            JsonNode root = restTemplate.postForObject(
                    baseUrl + "/api/v1/embeddings/file/smart", new HttpEntity<>(form, headers), JsonNode.class);
            return parseEmbedResult(root, file.getOriginalFilename());
        } catch (Exception e) {
            log.warn("ACE file embedding failed", e);
            throw new ExternalServiceException(HttpStatus.BAD_GATEWAY, "파일 임베딩에 실패했습니다. 잠시 후 다시 시도해주세요.");
        }
    }

    /** 관리자가 직접 붙여넣은 텍스트(공지/FAQ 등)를 ACE 지식베이스에 임베딩. */
    public AceEmbedResult embedText(String content, String category) {
        ensureConfiguredOrThrow();
        try {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("bucket_id", bucketId);
            body.put("content", content);
            if (category != null && !category.isBlank()) {
                body.put("metadata", Map.of("category", category));
            }
            JsonNode root = post("/api/v1/embeddings/text", body);
            return parseEmbedResult(root, null);
        } catch (Exception e) {
            log.warn("ACE text embedding failed", e);
            throw new ExternalServiceException(HttpStatus.BAD_GATEWAY, "텍스트 임베딩에 실패했습니다. 잠시 후 다시 시도해주세요.");
        }
    }

    /**
     * 이 bucket에 지금까지 등록된 임베딩 이력 — "logs" 배열은 ACE 쪽 스키마가
     * additionalProperties(자유 형식)라 필드가 고정돼 있지 않다. Map으로 그대로
     * 프론트에 넘기고, 프론트는 흔히 쓰이는 snake_case 키(source_id/source_name/
     * source_type/chunks_processed/created_at 등)를 우선 찾아 표시한다.
     */
    public List<Map<String, Object>> listEmbeddingLogs(int limit) {
        ensureConfiguredOrThrow();
        try {
            JsonNode root = get("/api/v1/buckets/" + bucketId + "/embeddings/logs?limit=" + limit);
            List<Map<String, Object>> logs = new ArrayList<>();
            root.path("logs").forEach(n -> logs.add(objectMapper.convertValue(n, new TypeReference<Map<String, Object>>() { })));
            return logs;
        } catch (Exception e) {
            log.warn("ACE embedding logs fetch failed", e);
            throw new ExternalServiceException(HttpStatus.BAD_GATEWAY, "임베딩 이력 조회에 실패했습니다.");
        }
    }

    /** source_id 기준 임베딩 삭제(지식그래프 데이터도 함께 삭제) — 관리자의 "삭제" 버튼용. */
    public void deleteBySourceId(String sourceId) {
        ensureConfiguredOrThrow();
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("X_API_KEY", apiKey);
            restTemplate.exchange(baseUrl + "/api/v1/embeddings/sources/" + sourceId + "?delete_kg=true",
                    HttpMethod.DELETE, new HttpEntity<>(headers), JsonNode.class);
        } catch (Exception e) {
            log.warn("ACE embedding delete failed", e);
            throw new ExternalServiceException(HttpStatus.BAD_GATEWAY, "임베딩 삭제에 실패했습니다.");
        }
    }

    private void ensureConfiguredOrThrow() {
        if (!isConfigured()) {
            throw new ExternalServiceException(HttpStatus.SERVICE_UNAVAILABLE,
                    "AI 상담 지식베이스 기능이 아직 설정되지 않았습니다. (ACE_BASE_URL/ACE_API_KEY/ACE_BUCKET_ID 미설정)");
        }
    }

    // status=success(SmartSyncFileEmbeddingResult/EmbeddingResult)와 status=accepted
    // (AsyncFileEmbeddingAcceptedResult, job으로 감싸져 옴) 두 응답 모양을 하나로 합쳐서 반환.
    private AceEmbedResult parseEmbedResult(JsonNode root, String fallbackFilename) {
        String status = root.path("status").asText("success");
        if ("accepted".equals(status)) {
            JsonNode job = root.path("job");
            return new AceEmbedResult(status, null, null, null,
                    root.path("filename").asText(fallbackFilename), null, null, null,
                    job.path("job_id").asText(null), job.path("status").asText(null));
        }
        return new AceEmbedResult(
                status,
                root.path("source_id").asText(null),
                root.path("source_type").asText(null),
                root.path("source_name").asText(null),
                root.hasNonNull("filename") ? root.path("filename").asText() : fallbackFilename,
                root.path("chunks_processed").asInt(0),
                root.path("text_length").asInt(0),
                root.hasNonNull("file_size_bytes") ? root.path("file_size_bytes").asLong() : null,
                null, null);
    }

    private JsonNode get(String path) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X_API_KEY", apiKey);
        return restTemplate.exchange(baseUrl + path, HttpMethod.GET, new HttpEntity<>(headers), JsonNode.class).getBody();
    }

    private String ensureThread() {
        String existing = threadId;
        if (existing != null) {
            return existing;
        }
        try {
            JsonNode root = post("/api/v1/threads?user_id=career-mate-school-docs", null);
            String created = root.path("thread").path("thread_id").asText(null);
            threadId = created; // benign race: worst case two threads get created, both usable
            return created;
        } catch (Exception e) {
            log.warn("ACE thread creation failed", e);
            return null;
        }
    }

    private JsonNode post(String path, Object body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X_API_KEY", apiKey);
        return restTemplate.postForObject(baseUrl + path, new HttpEntity<>(body, headers), JsonNode.class);
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }

    public record AceAnswer(String answer, List<String> sources) {
    }

    /**
     * uploadFile/embedText 공통 응답 — ACE의 두 가지 결과 모양(즉시 완료 success /
     * 비동기 접수 accepted)을 하나로 합쳐서 담는다. status="accepted"일 땐 sourceId
     * 등은 null이고 jobId/jobStatus만 채워지며, 관리자 화면은 jobId로 폴링하거나
     * 잠시 후 목록을 새로고침해서 완료 여부를 확인한다.
     */
    public record AceEmbedResult(
            String status,
            String sourceId,
            String sourceType,
            String sourceName,
            String filename,
            Integer chunksProcessed,
            Integer textLength,
            Long fileSizeBytes,
            String jobId,
            String jobStatus) {
    }
}
