package com.careermate.backend.dto.response;

import com.careermate.backend.domain.SkillScore;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Response shape matches src/data/mockUser.js mockSkills. */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SkillResponse {
    private Integer jobSkill;
    private Integer resume;
    private Integer interview;
    private Integer companyAnalysis;
    private Integer careerReadiness;

    public static SkillResponse from(SkillScore s) {
        return SkillResponse.builder()
                .jobSkill(s.getJobSkill())
                .resume(s.getResume())
                .interview(s.getInterview())
                .companyAnalysis(s.getCompanyAnalysis())
                .careerReadiness(s.getCareerReadiness())
                .build();
    }
}
