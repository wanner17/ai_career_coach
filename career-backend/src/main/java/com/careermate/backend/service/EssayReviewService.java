package com.careermate.backend.service;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.careermate.backend.domain.EssayReviewRecord;
import com.careermate.backend.domain.Quest;
import com.careermate.backend.domain.SkillScore;
import com.careermate.backend.dto.request.EssayReviewRequest;
import com.careermate.backend.dto.response.EssayReviewResponse;
import com.careermate.backend.dto.response.QuestCompleteResponse;
import com.careermate.backend.exception.ExternalServiceException;
import com.careermate.backend.mapper.EssayReviewMapper;
import com.careermate.backend.mapper.QuestMapper;
import com.careermate.backend.mapper.SkillMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Calls OpenAI's Chat Completions API to grade a 자기소개서 (self-introduction
 * essay) against a fixed rubric and return structured JSON — see
 * EssayReviewResponse for the exact shape the model is asked to produce.
 * No RAG here on purpose: this is a "critique this text against a rubric"
 * task, not a retrieval task, and there's no example-essay corpus in this
 * project to retrieve from yet.
 *
 * What makes this more than "paste into a generic AI chat site" (per the
 * user's own ask): the prompt can be grounded against a real job posting or
 * company the student picked (targetContext), a review persists to history,
 * and — same as every other Quest completion — feeds the existing EXP /
 * skill-score Career Growth Loop instead of living outside it.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EssayReviewService {

    private static final String OPENAI_URL = "https://api.openai.com/v1/chat/completions";

    /** Must match data.sql's seed quest name exactly — see QuestMapper#findByName. */
    private static final String ESSAY_QUEST_NAME = "자기소개서 초안 작성";

    /** Small, fixed nudge per review rather than score-proportional — keeps grading and skill growth independently tunable. */
    private static final int RESUME_SKILL_BUMP = 3;

    private static final String SYSTEM_PROMPT = """
            당신은 대학생 자기소개서를 첨삭하는 취업 컨설턴트입니다.
            학생이 제출한 자기소개서를 아래 5개 항목 기준으로 평가하세요.

            - 구체성: 추상적 표현이 아니라 실제 경험/사례로 뒷받침되는가
            - 직무연관성: 학생의 희망 직무와 얼마나 관련이 있는가
            - 논리적 흐름: 기승전결이 자연스럽고 문단 간 연결이 매끄러운가
            - 표현력: 문장이 간결하고 맞춤법/어법 오류가 없는가
            - 임팩트: 다른 지원자와 차별화되는 인상을 남기는가

            지원 대상(채용공고 또는 기업 정보)이 함께 주어지면 반드시 targetFitScore(0~100)와
            targetFitComment를 채우세요 — targetFitComment에는 그 공고/기업 정보에 실제로 적힌
            구체적인 요구사항(직무, 자격요건, 우대사항 등)을 최소 1개 이상 그대로 인용하면서,
            자소서 내용이 그것과 얼마나/어떻게 부합하거나 부족한지 명시하세요. "직무와 관련이
            있다" 같은 두루뭉술한 문장은 안 됩니다 — 예: "공고의 'AWS 운영 경험 우대' 항목에
            대응되는 내용이 자소서에 없습니다" 처럼 실제 근거를 대세요. 그리고 suggestions 중
            최소 1개는 이 지원 대상의 요구사항을 직접 언급하는 제안이어야 합니다.
            지원 대상이 주어지지 않으면 targetFitScore와 targetFitComment는 둘 다 null로 두세요
            (임의로 만들어내지 마세요).

            지원 대상 유무와 무관하게, 직무연관성 항목도 학생의 희망 직무를 기준으로 평가하세요.

            점수는 절대 관대하게 주지 마세요. 실제 채용 담당자가 수백 명의 지원자 중 골라내야
            하는 상황이라 생각하고 냉정하게 채점하세요. 다음 기준을 따르세요:
            - 90~100점: 상위 5% 수준 — 구체적 성과와 수치, 명확한 논리, 흠잡을 데 없는 문장까지
              전부 갖춘 경우에만. 웬만해서는 주지 마세요.
            - 70~89점: 기본은 하지만 특별히 눈에 띄지 않음 — "무난한 자소서"는 대부분 여기.
            - 50~69점: 눈에 띄는 약점(추상적 서술, 논리 비약, 오탈자 등)이 하나 이상 있음.
            - 50점 미만: 이 상태로 제출하면 서류 탈락 가능성이 높음.
            막연히 "성의 있게 썼으니 80점대"처럼 주지 말고, 실제로 위 기준에 해당하는 문제가
            있으면 그 항목 점수를 과감하게 낮추고 comment에 정확히 어떤 문제인지 쓰세요.
            5개 항목 점수가 전부 비슷하게 몰리는 것도 피하세요 — 항목마다 실제 완성도가 다르면
            점수도 그만큼 벌어져야 합니다.

            각 항목마다 0~100점과 한두 문장 코멘트를 주고,
            전체 총평(summary), 개선 제안 목록(suggestions, 2~4개),
            가장 약한 문단 하나를 더 낫게 고쳐 쓴 예시(rewrittenExample)를 포함해
            반드시 다음 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.

            {
              "overallScore": 0-100 사이 정수,
              "summary": "전체 총평",
              "targetFitScore": 0-100 사이 정수 또는 null,
              "targetFitComment": "..." 또는 null,
              "categories": [
                {"name": "구체성", "score": 0-100, "comment": "..."},
                {"name": "직무연관성", "score": 0-100, "comment": "..."},
                {"name": "논리적 흐름", "score": 0-100, "comment": "..."},
                {"name": "표현력", "score": 0-100, "comment": "..."},
                {"name": "임팩트", "score": 0-100, "comment": "..."}
              ],
              "suggestions": ["...", "..."],
              "rewrittenExample": "..."
            }""";

    @Value("${career-mate.openai.api-key:}")
    private String apiKey;

    @Value("${career-mate.openai.model:gpt-4o-mini}")
    private String model;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper;
    private final QuestMapper questMapper;
    private final SkillMapper skillMapper;
    private final EssayReviewMapper essayReviewMapper;
    private final QuestService questService;

    public EssayReviewResponse review(Long userId, EssayReviewRequest request, String desiredJob) {
        if (apiKey == null || apiKey.isBlank()) {
            // Matches the rest of the app's "don't crash, tell the truth" pattern
            // (see WorknetService's <error> XML) — surfaced to the frontend as a
            // clear message instead of a raw 500.
            throw new ExternalServiceException(HttpStatus.SERVICE_UNAVAILABLE, "AI 첨삭 기능이 아직 설정되지 않았습니다. (OPENAI_API_KEY 미설정)");
        }

        boolean hasTarget = request.getTargetContext() != null && !request.getTargetContext().isBlank();
        String targetBlock = hasTarget
                ? """


                        지원 대상: %s
                        공고/기업 정보:
                        %s""".formatted(
                        (request.getTargetLabel() == null || request.getTargetLabel().isBlank()) ? "(라벨 없음)" : request.getTargetLabel(),
                        request.getTargetContext())
                : "";

        String userContent = """
                희망 직무: %s

                자소서 문항: %s

                자소서 본문:
                %s%s""".formatted(
                (desiredJob == null || desiredJob.isBlank()) ? "미입력" : desiredJob,
                (request.getQuestion() == null || request.getQuestion().isBlank()) ? "(문항 없음)" : request.getQuestion(),
                request.getContent(),
                targetBlock);

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
            throw new ExternalServiceException(HttpStatus.BAD_GATEWAY, "AI 첨삭 요청이 실패했습니다. 잠시 후 다시 시도해주세요.");
        }

        String content = root != null ? root.path("choices").path(0).path("message").path("content").asText(null) : null;
        if (content == null) {
            throw new ExternalServiceException(HttpStatus.BAD_GATEWAY, "AI 응답을 해석하지 못했습니다.");
        }

        EssayReviewResponse parsed;
        try {
            parsed = objectMapper.readValue(content, EssayReviewResponse.class);
        } catch (Exception e) {
            throw new ExternalServiceException(HttpStatus.BAD_GATEWAY, "AI 응답 형식이 올바르지 않습니다.");
        }

        persist(userId, request, parsed);
        parsed.setGrowth(grantGrowth(userId));
        return parsed;
    }

    /** History for the trend graph — most recent first. */
    public List<EssayReviewRecord> history(Long userId, int limit) {
        return essayReviewMapper.findAllForUser(userId, limit);
    }

    private void persist(Long userId, EssayReviewRequest request, EssayReviewResponse parsed) {
        String categoriesJson;
        String suggestionsJson;
        try {
            categoriesJson = objectMapper.writeValueAsString(parsed.getCategories());
            suggestionsJson = objectMapper.writeValueAsString(parsed.getSuggestions());
        } catch (Exception e) {
            categoriesJson = "[]";
            suggestionsJson = "[]";
        }

        essayReviewMapper.insert(EssayReviewRecord.builder()
                .userId(userId)
                .question(request.getQuestion())
                .content(request.getContent())
                .targetType(request.getTargetType())
                .targetLabel(request.getTargetLabel())
                .targetContext(request.getTargetContext())
                .overallScore(parsed.getOverallScore())
                .summary(parsed.getSummary())
                .targetFitScore(parsed.getTargetFitScore())
                .targetFitComment(parsed.getTargetFitComment())
                .categoriesJson(categoriesJson)
                .suggestionsJson(suggestionsJson)
                .rewrittenExample(parsed.getRewrittenExample())
                .build());
    }

    /**
     * Best-effort: a saved, graded review is still worth returning even if the
     * quest/skill tie-in breaks for some reason, so this never lets that
     * failure fail the whole request — it just logs and returns null growth.
     */
    private EssayReviewResponse.EssayGrowth grantGrowth(Long userId) {
        try {
            SkillScore before = skillMapper.findByUserId(userId);
            int beforeResume = before != null ? before.getResume() : 0;
            int afterResume = Math.min(100, beforeResume + RESUME_SKILL_BUMP);
            skillMapper.updateResume(userId, afterResume);

            Quest quest = questMapper.findByName(ESSAY_QUEST_NAME);
            if (quest == null) {
                return EssayReviewResponse.EssayGrowth.builder()
                        .expGained(0)
                        .alreadyCompleted(false)
                        .leveledUp(false)
                        .resumeSkillBefore(beforeResume)
                        .resumeSkillAfter(afterResume)
                        .build();
            }

            QuestCompleteResponse questResult = questService.completeQuest(userId, quest.getId());
            return EssayReviewResponse.EssayGrowth.builder()
                    .expGained(questResult.getExpGained())
                    .alreadyCompleted(questResult.isAlreadyCompleted())
                    .leveledUp(questResult.isLeveledUp())
                    .fromLevel(questResult.getFromLevel())
                    .toLevel(questResult.getToLevel())
                    .resumeSkillBefore(beforeResume)
                    .resumeSkillAfter(afterResume)
                    .build();
        } catch (Exception e) {
            log.warn("essay review growth tie-in failed for user {}", userId, e);
            return null;
        }
    }
}
