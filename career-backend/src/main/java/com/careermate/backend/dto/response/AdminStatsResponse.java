package com.careermate.backend.dto.response;

import java.util.List;

import com.careermate.backend.domain.TopicCount;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** GET /api/admin/stats — backs the Admin 통계 screen. Computed fresh on every call, no caching (small MVP dataset). */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminStatsResponse {
    private int studentCount;
    private double avgLevel;
    private double avgExp;

    /** Rounded to the nearest int per axis — same shape the student dashboard's skill bars already use. */
    private SkillResponse avgSkills;

    private List<QuestCompletionStat> questCompletion;

    /** Same taxonomy as AI 상담's per-student insights, aggregated across every student. */
    private List<TopicCount> topicDistribution;

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuestCompletionStat {
        private Long questId;
        private String title;
        private int completedCount;
        /** 0.0–1.0, against studentCount — a quest no student has touched yet is simply 0, not missing. */
        private double rate;
    }
}
