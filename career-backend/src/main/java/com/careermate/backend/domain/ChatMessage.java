package com.careermate.backend.domain;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * One turn in the AI 상담 log (careermate_ai_chat_log) — role is "user" or
 * "assistant", matching OpenAI's Chat Completions roles directly so a row
 * can be replayed straight into a messages[] array with no translation.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessage {
    private Long id;
    private Long userId;
    private String role;
    private String message;
    /** Only set on role="user" rows — see AiChatService's topic taxonomy. Null for assistant replies. */
    private String topic;
    private LocalDateTime createdAt;
}
