package com.careermate.backend.service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import com.careermate.backend.domain.ResumeReviewRecord;
import com.careermate.backend.dto.response.ResumeReviewResponse;
import com.careermate.backend.exception.ExternalServiceException;
import com.careermate.backend.mapper.ResumeReviewMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 이력서 첨삭 — EssayReviewService와 같은 "critique against a rubric" 방식의
 * 직접 OpenAI 호출(RAG 아님). 자소서 첨삭과 다른 점은 입력이 자유 텍스트가 아니라
 * 업로드된 파일이라는 것뿐 — PDF/DOCX에서 텍스트를 뽑아낸 뒤로는 완전히 같은 패턴
 * (프롬프트 → JSON 파싱 → 저장 → 응답)을 탄다.
 *
 * PDF/DOCX만 지원한다. HWP(한글과컴퓨터 독점 포맷)는 성숙한 오픈소스 파서가 없어
 * 이번 단계에서 제외 — 업로드하면 명확한 안내 메시지로 거절한다(원인을 삼키지 않음).
 *
 * 이번 단계에는 EXP/능력치 연동이 없다(EssayReviewService와 달리) — 학생이 이력서를
 * 몇 번을 올리든 자연스러운 일이라 자소서처럼 "퀘스트 1회성 완료"에 묶을 이유가
 * 약하다고 판단했다. 필요해지면 EssayReviewService#grantGrowth와 같은 패턴으로
 * 붙이면 된다.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ResumeReviewService {

    private static final String OPENAI_URL = "https://api.openai.com/v1/chat/completions";

    /** 프롬프트 토큰/비용 보호 — 이 이상은 잘라서 보낸다(첨부 이력서가 비정상적으로 길 때 방어). */
    private static final int MAX_RESUME_CHARS = 6000;

    private static final String SYSTEM_PROMPT = """
            당신은 대학생 이력서를 첨삭하는 취업 컨설턴트입니다.
            학생이 제출한 이력서 텍스트를 분석하세요.

            절대 원칙: 이력서에 없는 경험, 성과, 수치를 지어내지 마세요. 개선 예시를 쓸 때도
            이력서에 실제로 있는 내용만 재구성하세요. 구체적인 수치(예: "30% 감소", "2초→0.8초")가
            이력서에 없다면 그 수치를 확정적으로 만들어내지 말고 "실제 수치가 있다면 OO처럼
            추가해보세요"라는 식으로 조건부로만 안내하세요.

            ## 1. 항목별 평가 (sections)
            다음 항목별로 이력서에 해당 내용이 있는지, 있다면 얼마나 잘 작성됐는지 평가하세요:
            기본 정보, 학력, 경력/프로젝트, 자격증/스킬, 자기소개.

            각 항목마다:
            - present: 이력서에 실제로 있는지
            - score: 0~100 (아래 채점 기준 참고)
            - evidence: 이력서에서 실제로 발견한 구체적인 내용을 인용 (예: "교육관리시스템 리뉴얼,
              대학 취업지원 플랫폼 구축 등 프로젝트 경험 3건이 구체적으로 작성되어 있습니다")
            - gap: 감점 이유를 한 문장으로 — 표에도 그대로 쓰일 수 있게 간결하게 (예: "성과 수치 부족")
            - suggestion: 그 항목을 개선할 구체적인 방향 한 문장

            ## 2. 원문 첨삭 (excerptReviews)
            경력/프로젝트나 자기소개 중 개선 여지가 큰 문장을 1~3개 골라서:
            - section: 어느 항목에서 뽑았는지
            - originalText: 이력서에서 그대로 가져온 원문 (한두 문장, 지어내지 말 것)
            - issue: 뭐가 문제인지 (예: "어떤 요구사항을 해결했고 어떤 결과가 있었는지 알기 어렵습니다")
            - improvedExample: "문제 상황 → 행동 → 결과" 순서로 다시 쓴 예시. 원문에 있는 사실만
              사용하세요.
            - note: 수치화를 권할 때만 조건부로 채우고, 필요 없으면 null (위 절대 원칙 참고)

            ## 3. 부족한 키워드 (missingKeywords) — 지원 대상이 있을 때만
            지원 대상(채용공고/기업 정보)이 함께 주어지면, 그 요구사항에서 강조되는 키워드 중
            이력서에 없거나 약한 것들을 골라서:
            - keyword: 키워드
            - importance: "HIGH"/"MEDIUM"/"LOW" — 채용공고에서 얼마나 강조/반복되는지 기준
            - reason: 왜 부족한지 구체적으로 (예: "채용공고에서 3회 언급되었지만 이력서에서는
              관련 경험을 찾지 못했습니다")
            - recommendation: 어디에 어떻게 보완하면 좋을지
            지원 대상이 없으면 missingKeywords는 빈 배열로 두세요.

            ## 4. 우선순위별 개선 제안 (priorityImprovements) — 2~3개
            가장 시급한 문제부터 순서대로:
            - priority: 1(가장 시급)~3
            - title: 문제를 한 줄로 (예: "지원 직무와 경력 불일치")
            - diagnosis: 이력서에서 실제로 관찰한 내용 + 왜 문제인지 (지원 대상이 있으면 그
              요구사항과 대조해서)
            - relatedExperienceOptions: 방향 자체가 안 맞는 문제일 때 — 학생이 "실제로 겪었다면"
              보완할 수 있는 경험 카테고리 목록 (예: ["사용자 데이터 분석", "서비스 이용률 분석"]).
              해당 없으면 빈 배열.
            - rewriteExample: 문장 표현/구조가 문제일 때 — "무엇을 → 어떻게 → 어떤 결과" 구조의
              재작성 예시. 해당 없으면 null.
            (relatedExperienceOptions와 rewriteExample 중 그 문제 성격에 맞는 쪽만 채우세요.)

            ## jobFitScore — 지원 대상이 있을 때만
            그 요구사항과 이력서 내용이 실제로 얼마나 부합하는지 0~100으로 평가하고,
            jobFitReason에 표에 그대로 쓸 수 있게 한두 단어~한 문장으로 짧은 근거를 쓰세요
            (예: "개발 경험 중심", "마케팅 관련 경험 부족"). 지원 대상이 없으면 jobFitScore와
            jobFitReason 둘 다 null로 두세요.

            ## 채점 기준 (모든 점수 공통)
            점수는 절대 관대하게 주지 마세요. 채용 담당자가 수백 장 중 골라내야 하는 상황이라
            생각하고 냉정하게 채점하세요:
            - 90~100점: 상위 5% 수준 — 구체적 수치/성과, 명확한 역할, 빠진 항목이 전혀 없을 때만.
            - 70~89점: 기본은 갖췄지만 특별히 두드러지지 않음 — 대부분의 "무난한 이력서"는 여기.
            - 50~69점: 눈에 띄는 약점(항목 누락, 추상적 서술, 성과 없이 나열만 함 등)이 있음.
            - 50점 미만: 이 상태로는 서류 통과가 어려움.
            항목이 아예 없으면(present:false) 그 항목 score는 반드시 30점 이하로 주세요. 막연히
            "성의 있어 보이니 80점대"처럼 주지 말고, 항목마다 실제 완성도 차이가 있으면 점수도
            그만큼 벌어지게 하세요.

            전체 총평(summary)을 포함해 반드시 다음 JSON 형식으로만 응답하세요. 다른 텍스트는
            절대 포함하지 마세요.

            {
              "overallScore": 0-100 사이 정수,
              "summary": "전체 총평",
              "jobFitScore": 0-100 사이 정수 또는 null,
              "jobFitReason": "..." 또는 null,
              "sections": [
                {"name": "기본 정보", "present": true, "score": 0-100, "evidence": "...", "gap": "...", "suggestion": "..."},
                {"name": "학력", "present": true, "score": 0-100, "evidence": "...", "gap": "...", "suggestion": "..."},
                {"name": "경력/프로젝트", "present": true, "score": 0-100, "evidence": "...", "gap": "...", "suggestion": "..."},
                {"name": "자격증/스킬", "present": true, "score": 0-100, "evidence": "...", "gap": "...", "suggestion": "..."},
                {"name": "자기소개", "present": true, "score": 0-100, "evidence": "...", "gap": "...", "suggestion": "..."}
              ],
              "excerptReviews": [
                {"section": "...", "originalText": "...", "issue": "...", "improvedExample": "...", "note": "..." 또는 null}
              ],
              "missingKeywords": [
                {"keyword": "...", "importance": "HIGH", "reason": "...", "recommendation": "..."}
              ],
              "priorityImprovements": [
                {"priority": 1, "title": "...", "diagnosis": "...", "relatedExperienceOptions": ["...", "..."], "rewriteExample": null}
              ]
            }""";

    @Value("${career-mate.openai.api-key:}")
    private String apiKey;

    @Value("${career-mate.openai.model:gpt-4o-mini}")
    private String model;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper;
    private final ResumeReviewMapper resumeReviewMapper;

    public ResumeReviewResponse review(Long userId, MultipartFile file, String targetType, String targetLabel, String targetContext) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new ExternalServiceException(HttpStatus.SERVICE_UNAVAILABLE, "AI 첨삭 기능이 아직 설정되지 않았습니다. (OPENAI_API_KEY 미설정)");
        }
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("이력서 파일을 첨부해주세요.");
        }

        String resumeText = extractText(file);
        if (resumeText.isBlank()) {
            throw new ExternalServiceException(HttpStatus.BAD_REQUEST,
                    "이력서에서 텍스트를 추출하지 못했습니다. 스캔 이미지가 아닌 텍스트 기반 파일인지 확인해주세요.");
        }
        if (resumeText.length() > MAX_RESUME_CHARS) {
            resumeText = resumeText.substring(0, MAX_RESUME_CHARS);
        }

        boolean hasTarget = targetContext != null && !targetContext.isBlank();
        String targetBlock = hasTarget
                ? """


                        지원 대상: %s
                        공고/기업 정보:
                        %s""".formatted(
                        (targetLabel == null || targetLabel.isBlank()) ? "(라벨 없음)" : targetLabel,
                        targetContext)
                : "";

        String userContent = """
                이력서 내용:
                %s%s""".formatted(resumeText, targetBlock);

        Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "system", "content", SYSTEM_PROMPT),
                        Map.of("role", "user", "content", userContent)),
                "response_format", Map.of("type", "json_object"),
                "temperature", 0.4);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        JsonNode root;
        try {
            root = restTemplate.postForObject(OPENAI_URL, new HttpEntity<>(body, headers), JsonNode.class);
        } catch (Exception e) {
            throw new ExternalServiceException(HttpStatus.BAD_GATEWAY, "AI 이력서 분석 요청이 실패했습니다. 잠시 후 다시 시도해주세요.");
        }

        String content = root != null ? root.path("choices").path(0).path("message").path("content").asText(null) : null;
        if (content == null) {
            throw new ExternalServiceException(HttpStatus.BAD_GATEWAY, "AI 응답을 해석하지 못했습니다.");
        }

        ResumeReviewResponse parsed;
        try {
            parsed = objectMapper.readValue(content, ResumeReviewResponse.class);
        } catch (Exception e) {
            throw new ExternalServiceException(HttpStatus.BAD_GATEWAY, "AI 응답 형식이 올바르지 않습니다.");
        }

        persist(userId, file.getOriginalFilename(), targetType, targetLabel, targetContext, parsed);
        return parsed;
    }

    /** History for the frontend list — most recent first. */
    public List<ResumeReviewRecord> history(Long userId, int limit) {
        return resumeReviewMapper.findAllForUser(userId, limit);
    }

    private void persist(Long userId, String fileName, String targetType, String targetLabel, String targetContext, ResumeReviewResponse parsed) {
        String sectionsJson;
        String excerptReviewsJson;
        String missingKeywordsJson;
        String priorityImprovementsJson;
        try {
            sectionsJson = objectMapper.writeValueAsString(parsed.getSections());
            excerptReviewsJson = objectMapper.writeValueAsString(parsed.getExcerptReviews());
            missingKeywordsJson = objectMapper.writeValueAsString(parsed.getMissingKeywords());
            priorityImprovementsJson = objectMapper.writeValueAsString(parsed.getPriorityImprovements());
        } catch (Exception e) {
            sectionsJson = "[]";
            excerptReviewsJson = "[]";
            missingKeywordsJson = "[]";
            priorityImprovementsJson = "[]";
        }

        resumeReviewMapper.insert(ResumeReviewRecord.builder()
                .userId(userId)
                .fileName(fileName)
                .targetType(targetType)
                .targetLabel(targetLabel)
                .targetContext(targetContext)
                .overallScore(parsed.getOverallScore())
                .jobFitScore(parsed.getJobFitScore())
                .summary(parsed.getSummary())
                .sectionsJson(sectionsJson)
                .excerptReviewsJson(excerptReviewsJson)
                .missingKeywordsJson(missingKeywordsJson)
                // 컬럼명은 여전히 suggestions_json이지만(기존 컬럼 재사용), 이제 우선순위별
                // 개선 제안(priorityImprovements)을 담는다 — see ResumeReviewRecord.
                .suggestionsJson(priorityImprovementsJson)
                .build());
    }

    /**
     * 확장자로 판단 — PDF/DOCX만 실제 파싱하고, HWP를 포함해 그 외 형식은 원인이
     * 분명한 안내 메시지로 바로 거절한다(자동으로 "그냥 텍스트 없음" 취급하지 않음).
     */
    private String extractText(MultipartFile file) {
        String name = file.getOriginalFilename();
        String ext = (name == null) ? "" : name.substring(name.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);

        try {
            return switch (ext) {
                case "pdf" -> extractPdf(file);
                case "docx" -> extractDocx(file);
                // "직접 이력서 작성하기" — 프론트가 타이핑한 본문을 .txt로 감싸서 같은
                // 업로드 엔드포인트로 보낸다(ResumeReviewPanel 참고), 그래서 여기도 처리한다.
                case "txt" -> new String(file.getBytes(), java.nio.charset.StandardCharsets.UTF_8);
                case "hwp" -> throw new ExternalServiceException(HttpStatus.BAD_REQUEST,
                        "HWP 파일은 아직 지원하지 않아요. PDF나 DOCX로 변환해서 업로드해주세요.");
                default -> throw new ExternalServiceException(HttpStatus.BAD_REQUEST,
                        "지원하지 않는 파일 형식이에요. PDF 또는 DOCX 파일을 올려주세요.");
            };
        } catch (IOException e) {
            throw new ExternalServiceException(HttpStatus.BAD_REQUEST, "파일을 읽는 중 문제가 발생했어요. 파일이 손상되지 않았는지 확인해주세요.");
        }
    }

    private String extractPdf(MultipartFile file) throws IOException {
        try (PDDocument doc = Loader.loadPDF(file.getBytes())) {
            return new PDFTextStripper().getText(doc);
        }
    }

    private String extractDocx(MultipartFile file) throws IOException {
        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(file.getBytes()));
             XWPFWordExtractor extractor = new XWPFWordExtractor(doc)) {
            return extractor.getText();
        }
    }
}
