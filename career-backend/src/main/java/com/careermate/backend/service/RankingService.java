package com.careermate.backend.service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;

import com.careermate.backend.domain.RankingRow;
import com.careermate.backend.domain.StudentUser;
import com.careermate.backend.dto.response.RankingResponse;
import com.careermate.backend.exception.NotFoundException;
import com.careermate.backend.mapper.RankingMapper;
import com.careermate.backend.mapper.UserMapper;

import lombok.RequiredArgsConstructor;

/**
 * EXP 순위 — same university's students only (this app is multi-tenant per
 * university, so a cross-school board wouldn't mean anything to a student).
 * Ranked by EXP earned within the requested window, not raw Level — every
 * EXP grant comes from a timestamped quest completion (see QuestService),
 * so "이번 주"/"이번 달" are real, not just "전체" re-labeled. Names are
 * masked (첫 글자만, 나머지는 마스킹) since this lists every other student's
 * standing, not just the viewer's own data like everywhere else in this app.
 */
@Service
@RequiredArgsConstructor
public class RankingService {

    public enum Period { ALL, WEEK, MONTH }

    /** MVP-sized board — small per-university cohort, no pagination needed yet. */
    private static final int TOP_N = 50;

    /** Far enough back to include every completion ever made — the "전체" window's lower bound. */
    private static final LocalDateTime EPOCH = LocalDateTime.of(2000, 1, 1, 0, 0);

    private final UserMapper userMapper;
    private final RankingMapper rankingMapper;

    public RankingResponse getRanking(Long userId, Period period) {
        StudentUser me = userMapper.findById(userId);
        if (me == null) {
            throw new NotFoundException("사용자를 찾을 수 없습니다: " + userId);
        }

        List<RankingRow> ranked = rankingMapper.findRanking(me.getUniversityCode(), periodStart(period));

        List<RankingResponse.Entry> entries = new ArrayList<>();
        RankingResponse.Entry mine = null;

        for (int i = 0; i < ranked.size(); i++) {
            RankingRow row = ranked.get(i);
            int rank = i + 1;
            boolean isMe = row.getId().equals(userId);

            RankingResponse.Entry entry = RankingResponse.Entry.builder()
                    .rank(rank)
                    .maskedName(maskName(row.getName()))
                    .major(row.getMajor())
                    .grade(row.getGrade())
                    .level(row.getLevel())
                    .avatarGender(row.getAvatarGender())
                    .exp(row.getPeriodExp())
                    .isMe(isMe)
                    .build();

            if (isMe) {
                mine = entry;
            }
            if (rank <= TOP_N) {
                entries.add(entry);
            }
        }

        int weeklyExpGained = rankingMapper.sumExpForUser(userId, periodStart(Period.WEEK));

        return RankingResponse.builder()
                .entries(entries)
                .me(mine)
                .totalStudents(ranked.size())
                .weeklyExpGained(weeklyExpGained)
                .build();
    }

    /** Monday 00:00 for WEEK, the 1st 00:00 for MONTH, a fixed epoch for ALL. */
    private LocalDateTime periodStart(Period period) {
        LocalDate today = LocalDate.now();
        return switch (period) {
            case WEEK -> today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).atStartOfDay();
            case MONTH -> today.withDayOfMonth(1).atStartOfDay();
            case ALL -> EPOCH;
        };
    }

    // 마스킹 잠시 꺼둠 — 필요해지면 아래 주석 풀고 return name; 줄만 지우면 됨.
    // /** "김미래" -> "김**". A 1-character name has nothing to mask, shown as-is. */
    // private String maskName(String name) {
    //     if (name == null || name.isBlank()) {
    //         return "익명";
    //     }
    //     if (name.length() <= 1) {
    //         return name;
    //     }
    //     return name.charAt(0) + "*".repeat(name.length() - 1);
    // }
    private String maskName(String name) {
        return name;
    }
}
