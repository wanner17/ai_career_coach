package com.careermate.backend.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.careermate.backend.domain.SkillScore;

@Mapper
public interface SkillMapper {
    SkillScore findByUserId(@Param("userId") Long userId);

    /** Every student's skill row — backs Admin 통계 (avg per axis). Small MVP dataset, no pagination. */
    List<SkillScore> findAll();

    /** Called once when a new student is provisioned — see AuthService. */
    void insert(SkillScore skillScore);

    /** Bumps just the resume (자기소개서) score — see EssayReviewService. */
    void updateResume(@Param("userId") Long userId, @Param("resume") int resume);

    // Content-driven bumps for the other 4 axes — see SkillActivityService / domain.SkillTarget.
    void updateJobSkill(@Param("userId") Long userId, @Param("jobSkill") int jobSkill);

    void updateInterview(@Param("userId") Long userId, @Param("interview") int interview);

    void updateCompanyAnalysis(@Param("userId") Long userId, @Param("companyAnalysis") int companyAnalysis);

    void updateCareerReadiness(@Param("userId") Long userId, @Param("careerReadiness") int careerReadiness);
}
