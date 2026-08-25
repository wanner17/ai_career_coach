package com.careermate.backend.dto.response;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Response for GET /api/career/ranking?period=ALL|WEEK|MONTH — see
 * RankingService. `entries` is the top slice for the requested period
 * (EXP earned in that window, descending); `me` is the caller's own row
 * regardless of whether it made that slice, so "내 순위" always has
 * something to show even far outside the top of the board. `weeklyExpGained`
 * is always this-week's number regardless of which period was requested —
 * it backs the dashboard-style stat card, not the board itself.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RankingResponse {
    private List<Entry> entries;
    private Entry me;
    private int totalStudents;
    private int weeklyExpGained;

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Entry {
        private int rank;
        /** First character kept, rest masked (e.g. "김미래" -> "김**") — see RankingService#maskName. */
        private String maskedName;
        private String major;
        private Integer grade;
        private int level;
        private String avatarGender;
        /** EXP earned within the requested period (all-time for ALL, this-week's for WEEK, ...). */
        private int exp;
        private boolean isMe;
    }
}
