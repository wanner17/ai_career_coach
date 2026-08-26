package com.careermate.backend.dto.response;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Shape the model is prompted to return as JSON (see ResumeReviewService) —
 * this class doubles as both the OpenAI response payload's target DTO and the
 * REST response body, same pattern as EssayReviewResponse.
 *
 * v2 — every score now carries evidence/gap/suggestion instead of one vague
 * comment, missing keywords carry a reason + recommendation instead of just a
 * bare word, and excerptReviews/priorityImprovements ground the feedback in
 * the actual resume text instead of generic advice (see SYSTEM_PROMPT's
 * anti-hallucination rule — never invent achievements/numbers not in the source).
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ResumeReviewResponse {

    private int overallScore; // 0-100 — 이력서 전반 완성도
    private String summary;
    /** 채용공고/기업을 연동했을 때만 의미 있음 — 연동 안 했으면 모델이 null로 둔다. */
    private Integer jobFitScore; // 0-100
    /** jobFitScore 옆에 표로 보여줄 한 줄 근거 (예: "개발 경험 중심") — jobFitScore와 세트로 null. */
    private String jobFitReason;
    private List<SectionScore> sections; // 이력서 구조 분석 — 항목별 완성도
    private List<ExcerptReview> excerptReviews; // 원문 발췌 → 문제 → 개선 예시
    private List<MissingKeyword> missingKeywords; // 부족 키워드 — 중요도/근거/보완방법 포함
    private List<PriorityImprovement> priorityImprovements; // 우선순위별 개선 제안

    /** "이력서 업데이트 하기" 퀘스트 완료 결과 — OpenAI는 절대 보내지 않고(ignoreUnknown이 이 방향을 커버), ResumeReviewService가 파싱 후 채운다. */
    private ResumeGrowth growth;

    /** EssayReviewResponse.EssayGrowth와 같은 모양 — Career Growth Loop 연동 결과, 프론트 토스트용. */
    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ResumeGrowth {
        private int expGained;
        private boolean alreadyCompleted;
        private boolean leveledUp;
        private Integer fromLevel;
        private Integer toLevel;
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class SectionScore {
        private String name; // 예: "경력/프로젝트", "학력", "자격증/스킬", "자기소개"
        private boolean present; // 이력서에 해당 항목이 아예 있는지
        private int score; // 0-100
        private String evidence; // 이력서에서 실제로 발견한 내용 (구체적으로 인용)
        private String gap; // 감점 이유 — 한 문장, 표에도 그대로 쓸 수 있게 간결하게
        private String suggestion; // 그 항목을 개선할 구체적인 방향
    }

    /** 원문 그대로 인용 → 뭐가 문제인지 → 문제/행동/결과 구조로 다시 쓴 예시. */
    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ExcerptReview {
        private String section; // 어느 항목에서 뽑았는지 (예: "경력/프로젝트")
        private String originalText; // 이력서에서 그대로 가져온 원문
        private String issue;
        private String improvedExample; // 원문에 있는 사실만 재구성 — 없는 성과/수치를 지어내면 안 됨
        /** 수치화를 권할 때만 조건부로 — "실제 수치가 있다면 ~처럼" 형태. 없으면 null. */
        private String note;
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class MissingKeyword {
        private String keyword;
        private String importance; // "HIGH" | "MEDIUM" | "LOW" — 채용공고에서 얼마나 강조/반복되는지 기준
        private String reason; // 왜 부족한지 (예: "채용공고에서 3회 언급되었지만 이력서에서는 관련 경험을 찾지 못했습니다")
        private String recommendation; // 어디에 어떻게 보완하면 좋을지
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class PriorityImprovement {
        private int priority; // 1(가장 시급) ~ 3
        private String title;
        private String diagnosis; // 이력서에서 실제로 관찰한 내용 + 왜 문제인지
        /** 방향 자체가 안 맞는 문제일 때 — 학생이 "실제로 겪었다면" 보완할 수 있는 경험 카테고리 목록. */
        private List<String> relatedExperienceOptions;
        /** 문장 표현/구조가 문제일 때 — "무엇을 → 어떻게 → 어떤 결과" 구조의 재작성 예시. */
        private String rewriteExample;
    }
}
