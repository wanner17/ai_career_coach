package com.careermate.backend.service;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;

import com.careermate.backend.domain.StudentUser;
import com.careermate.backend.dto.response.RankingResponse;
import com.careermate.backend.exception.NotFoundException;
import com.careermate.backend.mapper.UserMapper;

import lombok.RequiredArgsConstructor;

/**
 * Level 순위 — same university's students only (this app is multi-tenant per
 * university, so a cross-school board wouldn't mean anything to a student).
 * Names are masked (첫 글자만, 나머지는 마스킹) rather than shown in full — see
 * maskName() — since this lists every other student's standing, not just the
 * viewer's own data like everywhere else in this app.
 */
@Service
@RequiredArgsConstructor
public class RankingService {

    /** MVP-sized board — small per-university cohort, no pagination needed yet. */
    private static final int TOP_N = 50;

    private final UserMapper userMapper;

    public RankingResponse getRanking(Long userId) {
        StudentUser me = userMapper.findById(userId);
        if (me == null) {
            throw new NotFoundException("사용자를 찾을 수 없습니다: " + userId);
        }

        List<StudentUser> ranked = userMapper.findRankingForUniversity(me.getUniversityCode());

        List<RankingResponse.Entry> entries = new ArrayList<>();
        RankingResponse.Entry mine = null;

        for (int i = 0; i < ranked.size(); i++) {
            StudentUser u = ranked.get(i);
            int rank = i + 1;
            boolean isMe = u.getId().equals(userId);

            RankingResponse.Entry entry = RankingResponse.Entry.builder()
                    .rank(rank)
                    .maskedName(maskName(u.getName()))
                    .major(u.getMajor())
                    .grade(u.getGrade())
                    .level(u.getLevel())
                    .currentExp(u.getCurrentExp())
                    .isMe(isMe)
                    .build();

            if (isMe) {
                mine = entry;
            }
            if (rank <= TOP_N) {
                entries.add(entry);
            }
        }

        return RankingResponse.builder()
                .entries(entries)
                .me(mine)
                .totalStudents(ranked.size())
                .build();
    }

    /** "김미래" -> "김**". A 1-character name has nothing to mask, shown as-is. */
    private String maskName(String name) {
        if (name == null || name.isBlank()) {
            return "익명";
        }
        if (name.length() <= 1) {
            return name;
        }
        return name.charAt(0) + "*".repeat(name.length() - 1);
    }
}
