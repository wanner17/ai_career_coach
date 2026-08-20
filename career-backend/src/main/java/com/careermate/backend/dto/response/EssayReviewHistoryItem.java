package com.careermate.backend.dto.response;

import java.time.LocalDateTime;
import java.util.List;

import lombok.Builder;
import lombok.Getter;

/**
 * One row for GET /api/career/essay/history — EssayReviewRecord with its
 * JSON columns re-expanded into real arrays (see EssayReviewController).
 * Trend graph on the frontend only needs createdAt + overallScore, but the
 * rest rides along so a history list can render a summary card too.
 */
@Getter
@Builder
public class EssayReviewHistoryItem {
    private Long id;
    private String targetType;
    private String targetLabel;
    private int overallScore;
    private String summary;
    private List<EssayReviewResponse.CategoryScore> categories;
    private LocalDateTime createdAt;
}
