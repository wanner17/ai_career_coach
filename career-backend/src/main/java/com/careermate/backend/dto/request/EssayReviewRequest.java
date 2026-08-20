package com.careermate.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Body for POST /api/career/essay/review. userId comes from the JWT (used to pull desiredJob for context), not the body. */
@Getter
@Setter
@NoArgsConstructor
public class EssayReviewRequest {

    /** 자소서 문항 — optional, gives the model the actual question being answered. */
    private String question;

    @NotBlank
    @Size(max = 4000)
    private String content;

    /** "NEWS" | "COMPANY" | null — which Worknet detail the student targeted, if any. See EssayReviewService. */
    private String targetType;

    /** Human label for history/UI, e.g. "삼성전자 · 백엔드 신입 채용". */
    private String targetLabel;

    /** Free text the frontend already had loaded (posting requirements / company intro) — folded into the AI prompt verbatim. */
    private String targetContext;
}
