package com.careermate.backend.dto.response;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** One row of GET /api/admin/students — backs Admin 학생관리. */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminStudentResponse {
    private Long id;
    private String name;
    private String universityCode;
    private String major;
    private Integer grade;
    private String desiredJob;
    private Integer level;
    private Integer currentExp;
    private Integer nextLevelExp;
    private SkillResponse skills;
    private int questsCompleted;
    private int questsTotal;
    private LocalDateTime createdAt;
}
