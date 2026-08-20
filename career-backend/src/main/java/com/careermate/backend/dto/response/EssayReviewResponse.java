package com.careermate.backend.dto.response;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Shape the model is prompted to return as JSON (see EssayReviewService) —
 * this class doubles as both the OpenAI response payload's target DTO
 * (Jackson deserializes the model's JSON string straight into it) and the
 * REST response body, so the two never drift apart. `growth` is the one
 * exception: OpenAI never sends it (ignoreUnknown covers that direction),
 * EssayReviewService fills it in after parsing via the plain setter below.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class EssayReviewResponse {

    private int overallScore; // 0-100
    private String summary;
    private List<CategoryScore> categories;
    private List<String> suggestions;
    private String rewrittenExample;

    /** Null only if EssayReviewService couldn't attach it (e.g. quest/skill lookup failed) — see its "best-effort" comment. */
    private EssayGrowth growth;

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class CategoryScore {
        private String name;
        private int score; // 0-100
        private String comment;
    }

    /** Career Growth Loop tie-in — what this review earned, for the frontend's toast. */
    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EssayGrowth {
        private int expGained;
        private boolean alreadyCompleted;
        private boolean leveledUp;
        private Integer fromLevel;
        private Integer toLevel;
        private int resumeSkillBefore;
        private int resumeSkillAfter;
    }
}
