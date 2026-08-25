package com.careermate.backend.service;

import java.util.Set;

import org.springframework.stereotype.Service;

import com.careermate.backend.domain.SkillScore;
import com.careermate.backend.domain.StudentUser;
import com.careermate.backend.dto.request.UpdateAvatarRequest;
import com.careermate.backend.dto.request.UpdateProfileRequest;
import com.careermate.backend.dto.response.DashboardResponse;
import com.careermate.backend.dto.response.SkillResponse;
import com.careermate.backend.dto.response.UserResponse;
import com.careermate.backend.exception.NotFoundException;
import com.careermate.backend.mapper.SkillMapper;
import com.careermate.backend.mapper.UserMapper;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserService {

    // Keep in sync with src/config/avatarCustomization.js on the frontend —
    // both sides need the same option list, this one just guards against a
    // request built by hand rather than through the picker UI.
    // avatarSticker now holds an accessory *style* key (a whole separate
    // matching-style image — glasses, graduation cap, ...), not an emoji.
    private static final Set<String> VALID_FRAMES = Set.of("purple", "pink", "blue", "gold", "green");
    private static final Set<String> VALID_STICKERS = Set.of("glasses", "graduation", "headphones", "beret", "earmuffs", "cardigan");

    private final UserMapper userMapper;
    private final SkillMapper skillMapper;
    private final QuestService questService;
    private final BadgeService badgeService;

    public StudentUser getUserOrThrow(Long userId) {
        StudentUser user = userMapper.findById(userId);
        if (user == null) {
            throw new NotFoundException("사용자를 찾을 수 없습니다: " + userId);
        }
        return user;
    }

    public UserResponse getUser(Long userId) {
        return UserResponse.from(getUserOrThrow(userId));
    }

    /** GET /api/career/dashboard/{userId} — user + skills + quests + badges in one call. */
    public DashboardResponse getDashboard(Long userId) {
        StudentUser user = getUserOrThrow(userId);

        SkillScore skillScore = skillMapper.findByUserId(userId);
        SkillResponse skills = skillScore != null ? SkillResponse.from(skillScore) : null;

        return DashboardResponse.builder()
                .user(UserResponse.from(user))
                .skills(skills)
                .quests(questService.getQuestsForUser(userId))
                .badges(badgeService.getBadgesForUser(userId))
                .build();
    }

    public UserResponse updateAvatar(Long userId, UpdateAvatarRequest request) {
        getUserOrThrow(userId); // 404 before a pointless write

        if (!VALID_FRAMES.contains(request.getAvatarFrame())) {
            throw new IllegalArgumentException("알 수 없는 프레임 색상입니다: " + request.getAvatarFrame());
        }
        String sticker = request.getAvatarSticker();
        if (sticker != null && !sticker.isBlank() && !VALID_STICKERS.contains(sticker)) {
            throw new IllegalArgumentException("알 수 없는 스티커입니다: " + sticker);
        }

        userMapper.updateAvatar(userId, request.getAvatarFrame(), (sticker == null || sticker.isBlank()) ? null : sticker);
        return UserResponse.from(userMapper.findById(userId));
    }

    /** 마이페이지 기본 정보 수정 — name/major/grade/desiredJob only. university/level/EXP stay derived, never client-writable here. */
    public UserResponse updateProfile(Long userId, UpdateProfileRequest request) {
        getUserOrThrow(userId); // 404 before a pointless write

        String major = request.getMajor() == null || request.getMajor().isBlank() ? null : request.getMajor().trim();
        String desiredJob = request.getDesiredJob() == null || request.getDesiredJob().isBlank() ? null : request.getDesiredJob().trim();

        userMapper.updateProfile(userId, request.getName().trim(), major, request.getGrade(), desiredJob);
        return UserResponse.from(userMapper.findById(userId));
    }
}
