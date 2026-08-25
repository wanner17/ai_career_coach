package com.careermate.backend.service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Consumer;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

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

    /**
     * Streaming round's plain-text answer / structured-metadata separator —
     * control chars, not real Korean punctuation, so it can't collide with
     * anything the model would naturally write. See streamFinalAnswer().
     */
    private static final String META_DELIMITER = "\n<<<CM_META>>>\n";

    // OpenAI streams deltas as fast as they arrive over the wire — often several
    // per network frame — which reads as an unnaturally instant "typing" burst
    // on the client instead of a readable pace. A small per-chunk pause here
    // (background streamExecutor thread, not the request thread — see
    // replyStream) paces it back down to something legible without adding
    // meaningful latency to the overall reply.
    private static final long STREAM_CHUNK_DELAY_MS = 60;

    /** One thread per in-flight streamed chat turn — MVP traffic, not worth a bounded pool. */
    private final ExecutorService streamExecutor = Executors.newCachedThreadPool();

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

    /**
     * ACE AI Platform(사내 RAG) 기반 — 학교 취업지원센터 자료 검색. AceService가
     * 설정 안 됐으면(bucket 미배정 등) 이 도구 자체를 tools 목록에서 뺀다 —
     * 아직 학교 하나만 지원하는 MVP 단계라 University별 분기는 다음 단계.
     */
    private static final Map<String, Object> SEARCH_SCHOOL_DOCS_TOOL = Map.of(
            "type", "function",
            "function", Map.of(
                    "name", "search_school_docs",
                    "description", "재학 중인 대학 취업지원센터의 공지/프로그램 안내/FAQ 문서에서 검색합니다. "
                            + "그 학교에만 해당하는 제도, 일정, 신청 방법, 운영시간 등을 물어보면 애매하거나 "
                            + "이전 대화에서 비슷한 걸 이미 물어봤어도 매번 먼저 이 도구로 확인하세요 — "
                            + "확실히 모른다고 넘겨짚지 말고 검색부터 하는 쪽을 우선하세요. "
                            + "일반적인 취업 조언 질문(도구와 무관한 조언)에는 쓰지 마세요.",
                    "parameters", Map.of(
                            "type", "object",
                            "properties", Map.of(
                                    "query", Map.of("type", "string", "description", "검색할 질문 또는 키워드")),
                            "required", List.of("query"))));

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
    private final AceService aceService;
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
        messages.add(Map.of("role", "system", "content", buildSystemPrompt(user, skills, incompleteQuests, aceService.isConfigured(), false)));
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
     * SSE variant of reply() — same context building + tool-decision round
     * (round 1, unchanged, still one blocking call), but the final answer
     * (round 2) is streamed token-by-token to the client instead of waited
     * for as one blob. Runs on streamExecutor so the controller can return
     * the SseEmitter to Spring immediately; everything past this point
     * happens off the request thread.
     *
     * apiKey is checked synchronously (before the emitter exists) so a
     * missing key still surfaces as a normal 503 like reply() does, instead
     * of a half-open SSE stream that immediately errors.
     */
    public SseEmitter replyStream(Long userId, String message) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new ExternalServiceException(HttpStatus.SERVICE_UNAVAILABLE, "AI 상담 기능이 아직 설정되지 않았습니다. (OPENAI_API_KEY 미설정)");
        }
        SseEmitter emitter = new SseEmitter(120_000L); // generous — covers a tool-call round + a full streamed answer
        streamExecutor.execute(() -> runStream(userId, message, emitter));
        return emitter;
    }

    private void runStream(Long userId, String message, SseEmitter emitter) {
        try {
            StudentUser user = userMapper.findById(userId);
            SkillScore skills = skillMapper.findByUserId(userId);
            List<Quest> incompleteQuests = questMapper.findAllForUser(userId).stream()
                    .filter(q -> !Boolean.TRUE.equals(q.getCompleted()))
                    .limit(5)
                    .toList();

            List<ChatMessage> chronological = new ArrayList<>(chatLogMapper.findRecentForUser(userId, HISTORY_TURNS));
            Collections.reverse(chronological);

            List<Map<String, Object>> messages = new ArrayList<>();
            messages.add(Map.of("role", "system", "content", buildSystemPrompt(user, skills, incompleteQuests, aceService.isConfigured(), false)));
            chronological.forEach(m -> messages.add(Map.of("role", m.getRole(), "content", m.getMessage())));
            messages.add(Map.of("role", "user", "content", message));

            // Round 1 — identical to reply()'s: decide whether a tool is needed. Its own
            // JSON-envelope content (if it answered directly, no tool) is discarded on
            // purpose — round 2 below always regenerates the visible answer, this time
            // in streaming-friendly plain-text-plus-trailer form (see buildSystemPrompt's
            // streaming branch), so the client only ever sees text meant to be streamed.
            JsonNode firstMessage = callOpenAi(messages, true).path("choices").path(0).path("message");
            JsonNode toolCalls = firstMessage.path("tool_calls");
            if (toolCalls.isArray() && !toolCalls.isEmpty()) {
                emitToolNotice(emitter, toolCalls);
                messages.add(assistantToolCallMessage(firstMessage, toolCalls));
                for (JsonNode toolCall : toolCalls) {
                    messages.add(toolResultMessage(toolCall));
                }
            }
            // Swap in the streaming-mode system prompt for round 2 — same student context,
            // different (non-JSON) output-format instructions at the tail.
            messages.set(0, Map.of("role", "system", "content", buildSystemPrompt(user, skills, incompleteQuests, aceService.isConfigured(), true)));

            StreamResult result = streamFinalAnswer(messages, emitter);
            if (result.reply.isBlank()) {
                throw new ExternalServiceException(HttpStatus.BAD_GATEWAY, "AI 응답을 해석하지 못했습니다.");
            }

            Quest recommended = result.recommendedQuestId == null ? null : incompleteQuests.stream()
                    .filter(q -> q.getId().equals(result.recommendedQuestId))
                    .findFirst().orElse(null);
            String topic = TOPICS.contains(result.topic) ? result.topic : null;

            persist(userId, "user", message, topic);
            persist(userId, "assistant", result.reply, null);
            SkillGain skillGain = applyChatSkillBump(userId, topic);

            AiChatResponse done = AiChatResponse.builder()
                    .reply(result.reply)
                    .recommendedQuest(recommended == null ? null : AiChatResponse.RecommendedQuest.builder()
                            .id(recommended.getId())
                            .title(recommended.getName())
                            .exp(recommended.getExp())
                            .build())
                    .skillGain(skillGain)
                    .build();
            emitter.send(SseEmitter.event().name("done").data(done, MediaType.APPLICATION_JSON));
            emitter.complete();
        } catch (Exception e) {
            log.warn("AI chat stream failed for user {}", userId, e);
            try {
                emitter.send(SseEmitter.event().name("error").data(Map.of("message", "답변 생성 중 오류가 발생했습니다."), MediaType.APPLICATION_JSON));
            } catch (IOException ignored) {
                // client already gone — nothing left to notify
            }
            emitter.completeWithError(e);
        }
    }

    /** Best-effort UX touch (e.g. "학교 자료 검색 중..." on the client) — never worth failing the turn over. */
    private void emitToolNotice(SseEmitter emitter, JsonNode toolCalls) {
        try {
            List<String> names = new ArrayList<>();
            toolCalls.forEach(tc -> names.add(tc.path("function").path("name").asText()));
            emitter.send(SseEmitter.event().name("tool").data(Map.of("tools", names), MediaType.APPLICATION_JSON));
        } catch (IOException e) {
            log.debug("tool notice send failed", e);
        }
    }

    /**
     * Streams round 2 from OpenAI, forwarding plain-text deltas to the client
     * as they arrive, then parses out the trailing META_DELIMITER + JSON
     * block once the stream ends. A hold-back window the size of the
     * delimiter is always kept unsent, so a delimiter split across two
     * network chunks can never leak partway into the visible chat bubble —
     * once found, its start becomes the hard ceiling on what gets flushed.
     * Falls back to "everything is reply text" if the model ever skips the
     * trailer, same spirit as reply()'s parseModelOutput catch-block.
     */
    private StreamResult streamFinalAnswer(List<Map<String, Object>> messages, SseEmitter emitter) {
        StringBuilder full = new StringBuilder();
        AtomicInteger sentUpTo = new AtomicInteger(0);
        int holdBack = META_DELIMITER.length() - 1;

        streamOpenAiCompletion(messages, delta -> {
            full.append(delta);
            int delimIdx = full.indexOf(META_DELIMITER);
            int safeEnd = delimIdx >= 0 ? delimIdx : Math.max(sentUpTo.get(), full.length() - holdBack);
            if (safeEnd > sentUpTo.get()) {
                String chunk = full.substring(sentUpTo.get(), safeEnd);
                sentUpTo.set(safeEnd);
                try {
                    emitter.send(SseEmitter.event().name("chunk").data(chunk));
                } catch (IOException e) {
                    throw new UncheckedIOException(e);
                }
                try {
                    Thread.sleep(STREAM_CHUNK_DELAY_MS);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                }
            }
        });

        String fullText = full.toString();
        int delimIdx = fullText.indexOf(META_DELIMITER);
        StreamResult result = new StreamResult();
        if (delimIdx < 0) {
            result.reply = fullText;
            flushRemainder(emitter, fullText, sentUpTo);
            return result;
        }

        result.reply = fullText.substring(0, delimIdx);
        flushRemainder(emitter, result.reply, sentUpTo);
        String metaJson = fullText.substring(delimIdx + META_DELIMITER.length()).trim();
        try {
            ModelOutput meta = objectMapper.readValue(metaJson, ModelOutput.class);
            result.recommendedQuestId = meta.recommendedQuestId;
            result.topic = meta.topic;
        } catch (Exception e) {
            log.warn("failed to parse streamed meta block: {}", metaJson, e);
        }
        return result;
    }

    private void flushRemainder(SseEmitter emitter, String reply, AtomicInteger sentUpTo) {
        if (sentUpTo.get() >= reply.length()) return;
        try {
            emitter.send(SseEmitter.event().name("chunk").data(reply.substring(sentUpTo.get())));
            sentUpTo.set(reply.length());
        } catch (IOException e) {
            log.debug("final chunk flush failed (client likely disconnected)", e);
        }
    }

    /**
     * Raw OpenAI streaming call (stream:true, no response_format/tools) —
     * reads the SSE response line-by-line off RestTemplate's connection and
     * hands each text delta to onDelta as it arrives, instead of buffering
     * the whole completion like callOpenAi() does.
     */
    private void streamOpenAiCompletion(List<Map<String, Object>> messages, Consumer<String> onDelta) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", model);
        body.put("messages", messages);
        body.put("temperature", 0.5);
        body.put("stream", true);

        restTemplate.execute(OPENAI_URL, HttpMethod.POST, req -> {
            req.getHeaders().setContentType(MediaType.APPLICATION_JSON);
            req.getHeaders().setBearerAuth(apiKey);
            // Forces a fresh TCP connection instead of reusing one from the JDK's
            // keep-alive pool — a pooled connection OpenAI (or something between us
            // and it) has quietly closed shows up as exactly the intermittent
            // "works the first call, dies partway through the next" pattern this
            // was chasing (ERR_INCOMPLETE_CHUNKED_ENCODING on the 2nd/3rd turn).
            req.getHeaders().set("Connection", "close");
            objectMapper.writeValue(req.getBody(), body);
        }, resp -> {
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(resp.getBody(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    if (line.isBlank() || !line.startsWith("data:")) continue;
                    String payload = line.substring(5).trim();
                    if ("[DONE]".equals(payload)) break;
                    try {
                        JsonNode node = objectMapper.readTree(payload);
                        String delta = node.path("choices").path(0).path("delta").path("content").asText(null);
                        if (delta != null && !delta.isEmpty()) {
                            onDelta.accept(delta);
                        }
                    } catch (Exception parseErr) {
                        log.warn("failed to parse OpenAI stream chunk: {}", payload, parseErr);
                    }
                }
            }
            return null;
        });
    }

    /** Round 2's parsed streaming result — same fields reply()'s ModelOutput carries, minus the JSON wrapper. */
    private static class StreamResult {
        String reply = "";
        Long recommendedQuestId;
        String topic;
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
            List<Object> tools = new ArrayList<>();
            tools.add(SEARCH_WORKNET_TOOL);
            if (aceService.isConfigured()) {
                tools.add(SEARCH_SCHOOL_DOCS_TOOL);
            }
            body.put("tools", tools);
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
        String functionName = toolCall.path("function").path("name").asText();
        String argsJson = toolCall.path("function").path("arguments").asText("{}");
        String resultJson = "search_school_docs".equals(functionName)
                ? executeSearchSchoolDocsTool(argsJson)
                : executeSearchWorknetTool(argsJson);

        Map<String, Object> toolMsg = new LinkedHashMap<>();
        toolMsg.put("role", "tool");
        toolMsg.put("tool_call_id", toolCallId);
        toolMsg.put("content", resultJson);
        return toolMsg;
    }

    private String executeSearchSchoolDocsTool(String argsJson) {
        try {
            JsonNode args = objectMapper.readTree(argsJson);
            String query = args.path("query").asText("");
            if (query.isBlank()) {
                return "{\"found\":false,\"note\":\"검색어가 없습니다.\"}";
            }

            AceService.AceAnswer answer = aceService.ask(query);
            log.info("search_school_docs tool call: query={} -> {}", query, answer == null ? "no match" : "matched");

            return answer == null
                    ? "{\"found\":false,\"note\":\"학교 자료에서 관련 내용을 찾지 못했습니다.\"}"
                    : objectMapper.writeValueAsString(Map.of("found", true, "answer", answer.answer(), "sources", answer.sources()));
        } catch (Exception e) {
            log.warn("search_school_docs tool call failed", e);
            return "{\"found\":false,\"note\":\"검색 중 오류가 발생했습니다.\"}";
        }
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

    private String buildSystemPrompt(StudentUser user, SkillScore skills, List<Quest> incompleteQuests, boolean schoolDocsAvailable, boolean streaming) {
        // Streaming round 2 can't use response_format:json_object (that's what makes the
        // reply un-streamable — the client would see raw JSON syntax typing itself out).
        // So it gets plain text instead, with the same recommendedQuestId/topic carried
        // in a JSON line after a delimiter the client never sees — see streamFinalAnswer().
        String outputFormat = streaming
                ? """
                도구를 호출하는 경우가 아니라면, 학생에게 보여줄 답변을 일반 텍스트로 먼저
                작성하세요 (마크다운이나 JSON 없이 채팅창에 그대로 표시됩니다). 답변을 다 쓴
                뒤 반드시 새 줄에 아래 구분자만 정확히 쓰고
                <<<CM_META>>>
                그 다음 줄에 JSON 한 줄을 쓰세요:
                {"recommendedQuestId": 정수 또는 null, "topic": "위 7개 중 하나"}
                답변 본문 안에는 이 구분자나 JSON을 절대 포함하지 마세요."""
                : """
                도구를 호출하는 경우가 아니라면 반드시 아래 JSON 형식으로만 응답하세요:
                {
                  "reply": "학생에게 보여줄 답변 텍스트",
                  "recommendedQuestId": 정수 또는 null,
                  "topic": "위 7개 중 하나"
                }""";

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
                %s
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

                %s
                """.formatted(
                schoolDocsAvailable
                        ? "\n                학교 고유의 제도, 일정, 신청 방법, 운영시간을 물어보면 — 질문이 짧거나 애매해도,\n                이전 턴에서 비슷한 걸 이미 물어봤어도 — 일반 지식으로 짐작해 답하지 말고 매번\n                먼저 search_school_docs 도구로 학교 자료를 확인한 뒤 그 결과만 근거로 답변하세요.\n                도구가 관련 내용을 못 찾았다고 하면 지어내지 말고 학교 홈페이지 확인을 안내하세요.\n"
                        : "",
                user.getName(),
                user.getMajor() == null ? "미입력" : user.getMajor(),
                user.getGrade() == null ? "?" : user.getGrade(),
                (user.getDesiredJob() == null || user.getDesiredJob().isBlank()) ? "미입력" : user.getDesiredJob(),
                user.getLevel(),
                skillLine,
                questLines,
                outputFormat);
    }

    /** What we ask the model to hand back — see the JSON envelope spelled out in buildSystemPrompt(). */
    private static class ModelOutput {
        public String reply;
        public Long recommendedQuestId;
        public String topic;
    }
}
