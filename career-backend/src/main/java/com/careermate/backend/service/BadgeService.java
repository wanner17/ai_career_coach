package com.careermate.backend.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.careermate.backend.domain.Badge;
import com.careermate.backend.dto.response.BadgeResponse;
import com.careermate.backend.exception.NotFoundException;
import com.careermate.backend.mapper.BadgeMapper;
import com.careermate.backend.mapper.UserMapper;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class BadgeService {

    private static final String UNLOCK_TYPE_LEVEL = "LEVEL";

    private final BadgeMapper badgeMapper;
    private final UserMapper userMapper;

    /**
     * QUEST-type badges come back earned exactly as stored in user_badge.
     * LEVEL-type badges are overlaid here from the user's current level —
     * never stored — so a badge can't drift out of sync with the level it
     * claims to require (the exact bug the frontend MVP had to fix).
     */
    public List<BadgeResponse> getBadgesForUser(Long userId) {
        var user = userMapper.findById(userId);
        if (user == null) {
            throw new NotFoundException("사용자를 찾을 수 없습니다: " + userId);
        }

        return badgeMapper.findAllForUser(userId).stream()
                .map(badge -> applyLevelDerivedEarned(badge, user.getLevel()))
                .map(BadgeResponse::from)
                .toList();
    }

    private Badge applyLevelDerivedEarned(Badge badge, int userLevel) {
        if (UNLOCK_TYPE_LEVEL.equals(badge.getUnlockType())) {
            badge.setEarned(badge.getUnlockValue() != null && userLevel >= badge.getUnlockValue());
        }
        return badge;
    }
}
