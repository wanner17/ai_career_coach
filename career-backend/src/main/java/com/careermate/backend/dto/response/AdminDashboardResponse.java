package com.careermate.backend.dto.response;

import java.time.LocalDateTime;
import java.util.List;

import com.careermate.backend.domain.QuestCompletionActivity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * GET /api/admin/dashboard — the admin console's landing page. Deliberately
 * lighter than 통계 (AdminStatsResponse): a handful of headline numbers plus
 * "what just happened" activity, not the full breakdown — see AdminStats for
 * the deep numbers, this is "at a glance".
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminDashboardResponse {
    private int studentCount;
    private double avgLevel;
    private int totalCompletedQuests;
    private List<RecentStudent> recentStudents;
    private List<QuestCompletionActivity> recentActivity;

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecentStudent {
        private String name;
        private String universityCode;
        private Integer level;
        private LocalDateTime createdAt;
    }
}
