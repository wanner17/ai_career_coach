package com.careermate.backend.dto.response;

import com.careermate.backend.domain.StudentUser;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Response shape matches src/data/mockUser.js mockUser. */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {
    private Long userId;
    private String name;
    private String universityCode;
    /** 대학 홈페이지 쪽 학번/사번 등 원래 식별자 — CareerRoadmapPage.jsx가 커리어로드맵 iframe에 user_no로 실어 보낸다. */
    private String externalUserId;
    private String major;
    private Integer grade;
    private String desiredJob;
    private Integer level;
    private Integer currentExp;
    private Integer nextLevelExp;
    private String avatarFrame;
    private String avatarSticker;
    private String avatarGender;

    public static UserResponse from(StudentUser u) {
        return UserResponse.builder()
                .userId(u.getId())
                .name(u.getName())
                .universityCode(u.getUniversityCode())
                .externalUserId(u.getExternalUserId())
                .major(u.getMajor())
                .grade(u.getGrade())
                .desiredJob(u.getDesiredJob())
                .level(u.getLevel())
                .currentExp(u.getCurrentExp())
                .nextLevelExp(u.getNextLevelExp())
                .avatarFrame(u.getAvatarFrame())
                .avatarSticker(u.getAvatarSticker())
                .avatarGender(u.getAvatarGender())
                .build();
    }
}
