package com.careermate.backend.controller;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.careermate.backend.domain.ChatMessage;
import com.careermate.backend.domain.TopicCount;
import com.careermate.backend.dto.request.AiChatRequest;
import com.careermate.backend.dto.response.AiChatResponse;
import com.careermate.backend.service.AiChatService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/career/ai")
@RequiredArgsConstructor
public class AiChatController {

    private final AiChatService aiChatService;

    /** Real OpenAI call, grounded in the student's own data — see AiChatService. */
    @PostMapping("/chat")
    public AiChatResponse chat(@Valid @RequestBody AiChatRequest request, @AuthenticationPrincipal Long userId) {
        return aiChatService.reply(userId, request.getMessage());
    }

    /**
     * SSE variant — same underlying turn as chat(), but the reply text arrives as
     * a stream of "chunk" events instead of one blocking response. Event types:
     *   tool  — a tool call (search_worknet/search_school_docs) is in flight
     *   chunk — a fragment of the visible reply text, in order
     *   done  — turn finished; data is a full AiChatResponse (recommendedQuest/skillGain)
     *   error — turn failed after streaming had already started
     * POST (not GET/EventSource) so the existing Bearer-token header still works —
     * see api/client.js's auth pattern on the frontend side.
     */
    @PostMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter chatStream(@Valid @RequestBody AiChatRequest request, @AuthenticationPrincipal Long userId) {
        return aiChatService.replyStream(userId, request.getMessage());
    }

    /** Chronological — AiCoachPanel loads this on open instead of always starting from the fixed greeting. */
    @GetMapping("/chat/history")
    public List<ChatMessage> history(@AuthenticationPrincipal Long userId, @RequestParam(defaultValue = "20") int limit) {
        return aiChatService.history(userId, limit);
    }

    /** Most-discussed topic first — "상담 인사이트" card on the standalone AI 상담 page. */
    @GetMapping("/chat/insights")
    public List<TopicCount> insights(@AuthenticationPrincipal Long userId) {
        return aiChatService.insights(userId);
    }
}
