package com.careermate.backend.domain;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * One saved 이력서 첨삭 result — see schema.sql's careermate_resume_review.
 * The uploaded file itself is never stored, only the extracted analysis —
 * same "plain JSON columns, re-parsed on read" shape as EssayReviewRecord.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResumeReviewRecord {
    private Long id;
    private Long userId;
    private String fileName;
    private String targetType;
    private String targetLabel;
    private String targetContext;
    private Integer overallScore;
    private Integer jobFitScore;
    private String summary;
    private String sectionsJson;
    private String excerptReviewsJson;
    private String missingKeywordsJson;
    /** 컬럼명은 여전히 suggestions_json(기존 컬럼 재사용)이지만, v2부터는 우선순위별 개선 제안(priorityImprovements)을 담는다. */
    private String suggestionsJson;
    private LocalDateTime createdAt;
}
