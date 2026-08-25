package com.careermate.backend.dto.response;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Response for GET /api/career/ranking — see RankingService. `entries` is the
 * top slice (Level desc, then EXP desc) within the caller's own university;
 * `me` is the caller's own row regardless of whether it made that slice, so
 * "내 순위" always has something to show even far outside the top of the board.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RankingResponse {
    private List<Entry> entries;
    private Entry me;
    private int totalStudents;

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
        private int currentExp;
        private boolean isMe;
    }
}
