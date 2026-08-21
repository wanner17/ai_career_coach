package com.careermate.backend.service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

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
 * Never throws — a blank config or a failed call both come back as a null
 * {@link AceAnswer}, so a RAG outage degrades to "tool unavailable" instead
 * of taking the whole AI 상담 turn down.
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
}
