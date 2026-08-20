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
    private String major;
    private Integer grade;
    private String desiredJob;
    private Integer level;
    private Integer currentExp;
    private Integer nextLevelExp;
    private String avatarFrame;
    private String avatarSticker;

    public static UserResponse from(StudentUser u) {
        return UserResponse.builder()
                .userId(u.getId())
                .name(u.getName())
                .universityCode(u.getUniversityCode())
                .major(u.getMajor())
                .grade(u.getGrade())
                .desiredJob(u.getDesiredJob())
                .level(u.getLevel())
                .currentExp(u.getCurrentExp())
                .nextLevelExp(u.getNextLevelExp())
                .avatarFrame(u.getAvatarFrame())
                .avatarSticker(u.getAvatarSticker())
                .build();
    }
}
