package com.careermate.backend.domain;

/**
 * The 5 능력치 axes a Quest can be tied to (careermate_quest.skill_target) —
 * see QuestService#completeQuest for how a quest completion bumps one of
 * these by quest.skill_points, capped at 100. Deliberately separate from
 * Quest's own `category` (진로탐색/역량강화/실전준비/교내프로그램): category
 * groups quests for the student-facing filter UI, this maps a quest to the
 * specific skill it's meant to grow — the two don't line up 1:1 (e.g.
 * "이력서 업데이트" and "자기소개서 초안 작성" are both 역량강화 but both
 * feed RESUME, not two different axes).
 */
public enum SkillTarget {
    JOB_SKILL("직무역량"),
    RESUME("자기소개서"),
    INTERVIEW("면접역량"),
    COMPANY_ANALYSIS("기업분석력"),
    CAREER_READINESS("취업준비도");

    private final String label;

    SkillTarget(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }
}
