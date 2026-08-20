package com.careermate.backend.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Mirrors src/data/mockUser.js mockSkills. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SkillScore {
    private Long userId;
    private Integer jobSkill;
    private Integer resume;
    private Integer interview;
    private Integer companyAnalysis;
    private Integer careerReadiness;
}
