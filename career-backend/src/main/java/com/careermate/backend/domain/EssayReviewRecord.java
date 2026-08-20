package com.careermate.backend.domain;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * One saved 자기소개서 첨삭 result — see schema.sql's careermate_essay_review.
 * categoriesJson/suggestionsJson are the same arrays EssayReviewResponse
 * carries, just serialized; EssayReviewService re-parses them on read
 * instead of this app normalizing them into child tables.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EssayReviewRecord {
    private Long id;
    private Long userId;
    private String question;
    private String content;
    private String targetType;
    private String targetLabel;
    private String targetContext;
    private Integer overallScore;
    private String summary;
    private String categoriesJson;
    private String suggestionsJson;
    private String rewrittenExample;
    private LocalDateTime createdAt;
}
