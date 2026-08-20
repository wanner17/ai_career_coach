package com.careermate.backend.domain;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Mirrors src/data/mockUser.js. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentUser {
    private Long id;
    private String universityCode;
    private String externalUserId;
    private String name;
    private String major;
    private Integer grade;
    private String desiredJob;
    private Integer level;
    private Integer currentExp;
    private Integer nextLevelExp;
    private String avatarFrame;
    private String avatarSticker;
    private LocalDateTime createdAt;
}
