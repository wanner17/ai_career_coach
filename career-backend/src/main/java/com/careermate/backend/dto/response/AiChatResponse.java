package com.careermate.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiChatResponse {
    private String reply;

    /** Null unless the model tied this turn to a specific incomplete quest — see AiChatService. */
    private RecommendedQuest recommendedQuest;

    /** Null unless this turn's topic bumped a 능력치 axis (once/day — see AiChatService). */
    private SkillGain skillGain;

    /** Refetched from the DB by id, never taken from the model's own text — guards against a hallucinated title/exp. */
    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecommendedQuest {
        private Long id;
        private String title;
        private Integer exp;
    }
}
