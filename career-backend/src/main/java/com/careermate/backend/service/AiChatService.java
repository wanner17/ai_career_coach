package com.careermate.backend.service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.careermate.backend.domain.ChatMessage;
import com.careermate.backend.domain.Quest;
import com.careermate.backend.domain.SkillScore;
import com.careermate.backend.domain.SkillTarget;
import com.careermate.backend.domain.StudentUser;
import com.careermate.backend.domain.TopicCount;
import com.careermate.backend.dto.response.AiChatResponse;
import com.careermate.backend.dto.response.SkillGain;
import com.careermate.backend.exception.ExternalServiceException;
import com.careermate.backend.mapper.ChatLogMapper;
import com.careermate.backend.mapper.QuestMapper;
import com.careermate.backend.mapper.SkillMapper;
import com.careermate.backend.mapper.UserMapper;
import com.careermate.backend.util.WorknetXmlUtil;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Real OpenAI call, same "don't crash, tell the truth" + no-RAG stance as
 * EssayReviewService — direct context injection (profile, skill scores,
 * incomplete quests, recent turns), not retrieval.
 *
 * Three things make this more than "same as pasting into a generic AI chat
 * site" (per the user's own ask, twice now):
 *   1. search_worknet tool call — when the student asks about a specific
 *      company/posting, the model queries work24.go.kr's live data through
 *      WorknetService instead of guessing. A generic AI platform has no
 *      access to that feed, let alone one scoped to this student's session.
 *   2. recommendedQuestId — the model can tie its advice to one of the
 *      student's actual incomplete quests; the frontend turns that into a
 *      one-click "지금 시작하기" action instead of leaving it as text, so a
 *      chat turn can directly feed the Career Growth Loop.
 *   3. topic tagging — every user turn is classified into a small taxonomy
 *      and persisted, backing a "관심 주제 추이" insight view over time —
 *      AND, for 취업준비/진로탐색 specifically (no dedicated feature page
 *      exists for those), nudges 취업준비도 once per topic per day. See
 *      applyChatSkillBump(). Quests stay EXP/badge-only — 능력치 grows from
 *      real feature usage instead (see SkillActivityService for the other
 *      axes' actual growth points: job/company detail views, 모의면접 visits).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AiChatService {

    private static final String OPENAI_URL = "https://api.openai.com/v1/chat/completions";

    /** Prior turns (both roles combined) replayed back to the model for continuity. */
    private static final int HISTORY_TURNS = 10;

    /** schema.sql's careermate_ai_chat_log.message is VARCHAR(2000) — trim rather than let the insert fail. */
    private static final int MAX_STORED_MESSAGE_LEN = 1900;

    private static final List<String> TOPICS = List.of("직무역량", "자기소개서", "면접", "기업분석", "취업준비", "진로탐색", "기타");

    /**
     * 능력치 정의 v3 — 직무역량/면접역량/기업분석력 now grow from actually
     * opening the matching content page (job/company detail — see
     * WorknetController; 모의면접 — see SkillActivityController), not from
     * chat topic. 취업준비도 has no dedicated feature page to hang a "real
     * usage" signal on, so it's the one axis still driven by genuinely
     * discussing 취업준비/진로탐색 with the AI coach (capped once/day —
     * see applyChatSkillBump). 자기소개서 grows only from EssayReviewService.
     */
    private static final Map<String, SkillTarget> TOPIC_TO_SKILL = Map.of(
            "취업준비", SkillTarget.CAREER_READINESS,
            "진로탐색", SkillTarget.CAREER_READINESS);

    private static final int CHAT_SKILL_POINTS = 2;

    private static final Map<String, Object> SEARCH_WORKNET_TOOL = Map.of(
            "type", "function",
            "function", Map.of(
                    "name", "search_worknet",
                    "description", "work24.go.kr 공공 채용정보에서 실시간 채용공고(NEWS) 또는 기업 개요(COMPANY)를 검색합니다. "
                            + "학생이 특정 기업이나 구체적인 채용 공고에 대해 물어볼 때만 사용하세요. 일반적인 조언 질문에는 쓰지 마세요.",
                    "parameters", Map.of(
                            "type", "object",
                            "properties", Map.of(
                                    "searchType", Map.of("type", "string", "enum", List.of("NEWS", "COMPANY"),
                                            "description", "NEWS = 채용공고 검색, COMPANY = 기업 개요 검색"),
                                    "keyword", Map.of("type", "string", "description", "기업명 또는 채용 관련 키워드")),
                            "required", List.of("searchType", "keyword"))));

    @Value("${career-mate.openai.api-key:}")
    private String apiKey;

    @Value("${career-mate.openai.model:gpt-4o-mini}")
    private String model;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper;
    private final UserMapper userMapper;
    private final SkillMapper skillMapper;
    private final QuestMapper questMapper;
    private final ChatLogMapper chatLogMapper;
    private final WorknetService worknetService;
    private final SkillActivityService skillActivityService;

    public AiChatResponse reply(Long userId, String message) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new ExternalServiceException(HttpStatus.SERVICE_UNAVAILABLE, "AI 상담 기능이 아직 설정되지 않았습니다. (OPENAI_API_KEY 미설정)");
        }

        StudentUser user = userMapper.findById(userId);
        SkillScore skills = skillMapper.findByUserId(userId);
        List<Quest> incompleteQuests = questMapper.findAllForUser(userId).stream()
                .filter(q -> !Boolean.TRUE.equals(q.getCompleted()))
                .limit(5)
                .toList();

        List<ChatMessage> chronological = new ArrayList<>(chatLogMapper.findRecentForUser(userId, HISTORY_TURNS));
        Collections.reverse(chronological); // findRecentForUser is most-recent-first; the model wants oldest-first

        List<Map<String, Object>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", buildSystemPrompt(user, skills, incompleteQuests)));
        chronological.forEach(m -> messages.add(Map.of("role", m.getRole(), "content", m.getMessage())));
        messages.add(Map.of("role", "user", "content", message));

        // Round 1: let the model decide whether it needs live Worknet data first.
        JsonNode firstMessage = callOpenAi(messages, true).path("choices").path(0).path("message");
        JsonNode toolCalls = firstMessage.path("tool_calls");

        JsonNode finalMessage;
        if (toolCalls.isArray() && !toolCalls.isEmpty()) {
            messages.add(assistantToolCallMessage(firstMessage, toolCalls));
            for (JsonNode toolCall : toolCalls) {
                messages.add(toolResultMessage(toolCall));
            }
            // Round 2: tools omitted on purpose — forces a final text answer instead of another tool call.
            finalMessage = callOpenAi(messages, false).path("choices").path(0).path("message");
        } else {
            finalMessage = firstMessage;
        }

        String content = finalMessage.path("content").asText(null);
        if (content == null || content.isBlank()) {
            throw new ExternalServiceException(HttpStatus.BAD_GATEWAY, "AI 응답을 해석하지 못했습니다.");
        }

        ModelOutput parsed = parseModelOutput(content);

        Quest recommended = parsed.recommendedQuestId == null ? null : incompleteQuests.stream()
                .filter(q -> q.getId().equals(parsed.recommendedQuestId))
                .findFirst().orElse(null);
        String topic = TOPICS.contains(parsed.topic) ? parsed.topic : null;

        persist(userId, "user", message, topic);
        persist(userId, "assistant", parsed.reply, null);
        SkillGain skillGain = applyChatSkillBump(userId, topic);

        return AiChatResponse.builder()
                .reply(parsed.reply)
                .recommendedQuest(recommended == null ? null : AiChatResponse.RecommendedQuest.builder()
                        .id(recommended.getId())
                        .title(recommended.getName())
                        .exp(recommended.getExp())
                        .build())
                .skillGain(skillGain)
                .build();
    }

    /**
     * Bumps 취업준비도 once per topic per day — activityKey bakes in today's
     * date, so the shared activity log's UNIQUE constraint (see
     * SkillActivityService) rejects a 2nd credit for the same topic today.
     * No dedicated feature page exists for 취업준비/진로탐색, so this is the
     * one axis still tied to chat engagement rather than a content page.
     */
    private SkillGain applyChatSkillBump(Long userId, String topic) {
        SkillTarget target = TOPIC_TO_SKILL.get(topic);
        if (target == null) {
            return null;
        }
        String activityKey = "chat:" + topic + ":" + LocalDate.now();
        return skillActivityService.credit(userId, target, activityKey, CHAT_SKILL_POINTS);
    }

    /** Chronological (oldest first) — backs the panel's history load on open. */
    public List<ChatMessage> history(Long userId, int limit) {
        List<ChatMessage> recent = new ArrayList<>(chatLogMapper.findRecentForUser(userId, limit));
        Collections.reverse(recent);
        return recent;
    }

    /** Most-discussed topic first — "상담 인사이트" card on the standalone AI 상담 page. */
    public List<TopicCount> insights(Long userId) {
        return chatLogMapper.topicCountsForUser(userId);
    }

    private JsonNode callOpenAi(List<Map<String, Object>> messages, boolean allowTools) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", model);
        body.put("messages", messages);
        body.put("temperature", 0.5);
        body.put("response_format", Map.of("type", "json_object"));
        if (allowTools) {
            body.put("tools", List.of(SEARCH_WORKNET_TOOL));
            body.put("tool_choice", "auto");
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        JsonNode root;
        try {
            root = restTemplate.postForObject(OPENAI_URL, new HttpEntity<>(body, headers), JsonNode.class);
        } catch (Exception e) {
            throw new ExternalServiceException(HttpStatus.BAD_GATEWAY, "AI 상담 요청이 실패했습니다. 잠시 후 다시 시도해주세요.");
        }
        if (root == null) {
            throw new ExternalServiceException(HttpStatus.BAD_GATEWAY, "AI 응답을 해석하지 못했습니다.");
        }
        return root;
    }

    // Rebuilds only the fields the Chat Completions API actually accepts back
    // as request input — the raw response message can carry extra
    // response-only fields (refusal, annotations, ...) that aren't valid here.
    private Map<String, Object> assistantToolCallMessage(JsonNode messageNode, JsonNode toolCalls) {
        Map<String, Object> assistantMsg = new LinkedHashMap<>();
        assistantMsg.put("role", "assistant");
        assistantMsg.put("content", messageNode.path("content").isNull() ? null : messageNode.path("content").asText(null));

        List<Map<String, Object>> toolCallsOut = new ArrayList<>();
        toolCalls.forEach(tc -> {
            Map<String, Object> fn = new LinkedHashMap<>();
            fn.put("name", tc.path("function").path("name").asText());
            fn.put("arguments", tc.path("function").path("arguments").asText());

            Map<String, Object> tcMap = new LinkedHashMap<>();
            tcMap.put("id", tc.path("id").asText());
            tcMap.put("type", "function");
            tcMap.put("function", fn);
            toolCallsOut.add(tcMap);
        });
        assistantMsg.put("tool_calls", toolCallsOut);
        return assistantMsg;
    }

    private Map<String, Object> toolResultMessage(JsonNode toolCall) {
        String toolCallId = toolCall.path("id").asText();
        String argsJson = toolCall.path("function").path("arguments").asText("{}");
        String resultJson = executeSearchWorknetTool(argsJson);

        Map<String, Object> toolMsg = new LinkedHashMap<>();
        toolMsg.put("role", "tool");
        toolMsg.put("tool_call_id", toolCallId);
        toolMsg.put("content", resultJson);
        return toolMsg;
    }

    private String executeSearchWorknetTool(String argsJson) {
        try {
            JsonNode args = objectMapper.readTree(argsJson);
            String searchType = "COMPANY".equals(args.path("searchType").asText("NEWS")) ? "COMPANY" : "NEWS";
            String keyword = args.path("keyword").asText("");
            if (keyword.isBlank()) {
                return "{\"results\":[],\"note\":\"검색어가 없습니다.\"}";
            }

            List<Map<String, String>> results = "COMPANY".equals(searchType)
                    ? searchCompany(keyword)
                    : searchNews(keyword);
            log.info("search_worknet tool call: type={} keyword={} -> {} result(s)", searchType, keyword, results.size());

            return objectMapper.writeValueAsString(Map.of("searchType", searchType, "keyword", keyword, "results", results));
        } catch (Exception e) {
            log.warn("search_worknet tool call failed", e);
            return "{\"results\":[],\"note\":\"검색 중 오류가 발생했습니다.\"}";
        }
    }

    // COMPANY's `coNm` query param is a real server-side company-name filter
    // (unlike NEWS below), so a single page is enough.
    private List<Map<String, String>> searchCompany(String keyword) {
        String xml = worknetService.fetchXml("COMPANY", "L", keyword, "1", "desc", "", "", "", "");
        return WorknetXmlUtil.parseCompanyList(xml).stream().limit(TOOL_RESULT_LIMIT).toList();
    }

    // work24's NEWS list has no real company-name filter — its only keyword
    // param matches posting TITLES only (confirmed empirically, see
    // src/utils/worknetScan.js's frontend counterpart). So when the model
    // asks about a company (not a title phrase), a single-page keyword query
    // silently returns nothing. Scan a few pages and filter on title OR
    // company client-side instead, same workaround the Jobs/CompanyAnalysis
    // pages use — capped low here since this runs inside a chat turn, not a
    // background list view.
    private static final int TOOL_NEWS_SCAN_MAX_PAGES = 5;
    private static final int TOOL_RESULT_LIMIT = 5;

    private List<Map<String, String>> searchNews(String keyword) {
        String lowerKeyword = keyword.toLowerCase();
        String firstPageXml = worknetService.fetchXml("NEWS", "L", "", "1", "desc", "", "", "", "");
        int total = WorknetXmlUtil.parseTotal(firstPageXml);
        int pages = Math.min(TOOL_NEWS_SCAN_MAX_PAGES, Math.max(1, (int) Math.ceil(total / 10.0)));

        List<Map<String, String>> matches = new ArrayList<>();
        List<Map<String, String>> page1Items = WorknetXmlUtil.parseNewsList(firstPageXml);
        matches.addAll(filterNews(page1Items, lowerKeyword));

        for (int page = 2; page <= pages && matches.size() < TOOL_RESULT_LIMIT; page++) {
            String xml = worknetService.fetchXml("NEWS", "L", "", String.valueOf(page), "desc", "", "", "", "");
            matches.addAll(filterNews(WorknetXmlUtil.parseNewsList(xml), lowerKeyword));
        }
        return matches.stream().limit(TOOL_RESULT_LIMIT).toList();
    }

    private List<Map<String, String>> filterNews(List<Map<String, String>> items, String lowerKeyword) {
        return items.stream()
                .filter(item -> item.getOrDefault("title", "").toLowerCase().contains(lowerKeyword)
                        || item.getOrDefault("company", "").toLowerCase().contains(lowerKeyword))
                .toList();
    }

    private ModelOutput parseModelOutput(String content) {
        try {
            return objectMapper.readValue(content, ModelOutput.class);
        } catch (Exception e) {
            // Model occasionally drifts from the JSON envelope despite json_object
            // mode — fall back to showing the raw text rather than erroring the chat.
            ModelOutput fallback = new ModelOutput();
            fallback.reply = content;
            return fallback;
        }
    }

    private void persist(Long userId, String role, String message, String topic) {
        String trimmed = message.length() > MAX_STORED_MESSAGE_LEN ? message.substring(0, MAX_STORED_MESSAGE_LEN) : message;
        try {
            chatLogMapper.insert(ChatMessage.builder().userId(userId).role(role).message(trimmed).topic(topic).build());
        } catch (Exception e) {
            // Best-effort — a lost log row shouldn't take down a reply the student already received.
            log.warn("chat log persist failed for user {}", userId, e);
        }
    }

    private String buildSystemPrompt(StudentUser user, SkillScore skills, List<Quest> incompleteQuests) {
        String questLines = incompleteQuests.isEmpty()
                ? "(미완료 퀘스트 없음)"
                : incompleteQuests.stream()
                        .map(q -> "- [id:" + q.getId() + "] " + q.getName() + " (EXP " + q.getExp() + ")")
                        .collect(Collectors.joining("\n"));

        String skillLine = skills == null ? "(능력치 정보 없음)" : """
                직무역량 %d, 자기소개서 %d, 면접역량 %d, 기업분석력 %d, 취업준비도 %d""".formatted(
                skills.getJobSkill(), skills.getResume(), skills.getInterview(),
                skills.getCompanyAnalysis(), skills.getCareerReadiness());

        return """
                당신은 대학생 취업 준비를 돕는 AI 커리어 코치입니다. 친근하고 격려하는 톤으로
                구체적이고 실행 가능한 조언을 주세요. 5~8문장 내외로 간결하게 작성하고,
                필요하면 "1. " 같은 숫자 목록만 사용하세요. 채팅창에 그대로 표시되니 마크다운
                서식(**굵게**, # 제목 등)은 쓰지 마세요.

                학생이 특정 기업이나 실제 채용공고에 대해 구체적으로 물어보면 search_worknet
                도구로 실시간 데이터를 조회한 뒤 그 결과만 근거로 답변하세요. 도구 결과에 없는
                사실은 지어내지 마세요. 일반적인 조언 질문에는 도구를 쓰지 마세요.

                아래는 상담 중인 학생의 실제 데이터입니다 — 답변에 반드시 참고하세요.

                이름: %s
                전공/학년: %s %s학년
                희망 직무: %s
                Career Level: %d

                현재 능력치 (0~100): %s

                미완료 퀘스트:
                %s

                능력치가 낮은 항목이나 미완료 퀘스트가 질문과 직접 관련 있다면 그 퀘스트의
                id를 recommendedQuestId에 담으세요 (위 목록에 있는 id만 사용, 관련 없으면 null).
                이 메시지의 주제를 다음 중 하나로 분류해 topic에 담으세요:
                직무역량, 자기소개서, 면접, 기업분석, 취업준비, 진로탐색, 기타

                도구를 호출하는 경우가 아니라면 반드시 아래 JSON 형식으로만 응답하세요:
                {
                  "reply": "학생에게 보여줄 답변 텍스트",
                  "recommendedQuestId": 정수 또는 null,
                  "topic": "위 7개 중 하나"
                }
                """.formatted(
                user.getName(),
                user.getMajor() == null ? "미입력" : user.getMajor(),
                user.getGrade() == null ? "?" : user.getGrade(),
                (user.getDesiredJob() == null || user.getDesiredJob().isBlank()) ? "미입력" : user.getDesiredJob(),
                user.getLevel(),
                skillLine,
                questLines);
    }

    /** What we ask the model to hand back — see the JSON envelope spelled out in buildSystemPrompt(). */
    private static class ModelOutput {
        public String reply;
        public Long recommendedQuestId;
        public String topic;
    }
}
