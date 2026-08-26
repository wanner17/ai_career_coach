package com.careermate.backend.dto.response;

import java.time.LocalDateTime;
import java.util.List;

import lombok.Builder;
import lombok.Getter;

/** One row for GET /api/career/resume/history — see EssayReviewHistoryItem's twin. */
@Getter
@Builder
public class ResumeReviewHistoryItem {
    private Long id;
    private String fileName;
    private String targetType;
    private String targetLabel;
    private int overallScore;
    private Integer jobFitScore;
    private String summary;
    private List<ResumeReviewResponse.SectionScore> sections;
    private List<ResumeReviewResponse.ExcerptReview> excerptReviews;
    private List<ResumeReviewResponse.MissingKeyword> missingKeywords;
    private List<ResumeReviewResponse.PriorityImprovement> priorityImprovements;
    private LocalDateTime createdAt;
}
