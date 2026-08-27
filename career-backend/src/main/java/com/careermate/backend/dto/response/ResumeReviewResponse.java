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
 * v3 — "AI 분석 대시보드" 레이아웃용 필드 추가(strengths/topImprovementSummary/
 * keyword 충족 카운트/projectedImprovements). 이 중 resumeText와 새로 추가된
 * 필드들은 이번 응답에서만 보여주고 DB엔 저장하지 않는다(ResumeReviewService#persist
 * 참고) — 히스토리에서 다시 볼 땐 이 필드들 없이 v2 수준으로만 보인다. 또래 비교
 * (동일 직무 평균/백분위)는 일부러 넣지 않았다 — 지금 이 서비스엔 비교할 실제
 * 코호트 데이터가 없어서, 그럴듯한 숫자를 지어내는 건 다른 곳에서 지켜온
 * "없는 걸 지어내지 않는다" 원칙에 어긋난다.
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
    /** 채용공고에서 뽑아낸 핵심 키워드 총 개수 — 지원 대상 있을 때만, 없으면 null. */
    private Integer totalKeywordCount;
    /** 그중 이력서에 실제로 있는 키워드 수 — missingKeywords.size()로 역산 가능하지만 표에 바로 쓰려고 별도로 받는다. */
    private Integer matchedKeywordCount;
    /** 대시보드 상단 "강점 TOP 3" — 짧은 한 줄씩, present:true고 score 높은 항목 위주. */
    private List<String> strengths;
    /** "가장 먼저 개선할 부분" 콜아웃 한 문단 — priorityImprovements[0]과 같은 문제를 더 짧게. */
    private String topImprovementSummary;
    private List<SectionScore> sections; // 이력서 구조 분석 — 항목별 완성도 (레이더 차트 + 세부 평가 막대바에 공용)
    private List<ExcerptReview> excerptReviews; // 원문 발췌 → 문제 → 개선 예시
    private List<MissingKeyword> missingKeywords; // 부족 키워드 — 중요도/근거/보완방법 포함
    private List<PriorityImprovement> priorityImprovements; // 우선순위별 개선 제안
    /** "AI 첨삭 적용 예상" — 제안을 다 반영했다고 가정했을 때의 예상 점수. 어디까지나 추정치. */
    private List<ProjectedScore> projectedImprovements;

    /** "이력서 업데이트 하기" 퀘스트 완료 결과 — OpenAI는 절대 보내지 않고(ignoreUnknown이 이 방향을 커버), ResumeReviewService가 파싱 후 채운다. */
    private ResumeGrowth growth;
    /** 업로드된 파일에서 추출한 원문 텍스트 — "이력서 본문 전체 보기"용. AI 프롬프트 대상이 아니라 ResumeReviewService가 직접 채운다(모델에게 요청하지 않음). */
    private String resumeText;

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
        private String name; // "정보완성도", "학력구성", "경력/프로젝트", "기술경쟁력", "자기소개", "성과구체성" 6개 고정
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
        /**
         * improvedExample이 "OO%", "OO초" 같은 자리표시자를 쓰거나 note에 수치 추가를
         * 권하는 내용이 있으면 true — 프론트가 "실제 경험 확인 필요" 배지를 붙여서,
         * 이 문장을 실제 경험 없이 그대로 복사해 붙여넣지 않도록 한다.
         */
        private boolean requiresUserFact;
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
        private String impactLevel; // "HIGH" | "MEDIUM" | "LOW" — 카드 뱃지("영향도 높음"등)용
        private String diagnosis; // 이력서에서 실제로 관찰한 내용 + 왜 문제인지
        /** 방향 자체가 안 맞는 문제일 때 — 학생이 "실제로 겪었다면" 보완할 수 있는 경험 카테고리 목록. */
        private List<String> relatedExperienceOptions;
        /** 이 개선 제안이 관련된 sections 이름들 (예: ["경력/프로젝트", "성과구체성"]) — "추천 항목" 표시용. */
        private List<String> recommendedAreas;
        /** 예상 개선 효과 — 확정치가 아니라 대략치라는 걸 표현 (예: "+10~14점"). */
        private String expectedScoreGain;
        /**
         * 문장 표현/구조가 문제일 때 — "무엇을 → 어떻게 → 어떤 결과" 구조의 재작성 예시.
         * ExcerptReview.improvedExample과 같은 규칙: 원문 사실만으로 완결된 문장이어야
         * 하고, 자리표시자(OO%)를 문장 안에 넣으면 안 된다.
         */
        private String rewriteExample;
        /** 실제 수치가 있으면 더 좋아질 것 같을 때만 채우는 별도 제안 — ExcerptReview.note와 같은 용도. */
        private String note;
        /** note가 채워졌으면(=실제 수치 확인을 권했으면) true — ExcerptReview와 같은 용도. */
        private boolean requiresUserFact;
    }

    /** "AI 첨삭 적용 예상" 한 줄 — 어디까지나 제안을 다 반영했다고 가정한 추정치. */
    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ProjectedScore {
        private String label; // "종합점수", "성과구체성", "직무적합도", "경력/프로젝트" 등
        private int before;
        private int after;
    }
}
