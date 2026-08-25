package com.careermate.backend.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.careermate.backend.domain.StudentUser;

@Mapper
public interface UserMapper {

    StudentUser findById(@Param("id") Long id);

    /** Every student across every university — backs Admin 학생관리/통계. Small MVP dataset, no pagination yet. */
    List<StudentUser> findAll();

    StudentUser findByExternalUser(@Param("universityCode") String universityCode,
                                    @Param("externalUserId") String externalUserId);

    void insert(StudentUser user);

    void updateLevelExp(@Param("id") Long id,
                         @Param("level") int level,
                         @Param("currentExp") int currentExp,
                         @Param("nextLevelExp") int nextLevelExp);

    void updateAvatar(@Param("id") Long id,
                       @Param("avatarFrame") String avatarFrame,
                       @Param("avatarSticker") String avatarSticker);

    /** Backs 마이페이지 기본 정보 수정 — name/major/grade/desiredJob only (university/level/EXP aren't student-editable). */
    void updateProfile(@Param("id") Long id,
                        @Param("name") String name,
                        @Param("major") String major,
                        @Param("grade") int grade,
                        @Param("desiredJob") String desiredJob);

    /** Backs the new-account onboarding screen — nickname + avatar style only. */
    void updateOnboarding(@Param("id") Long id,
                           @Param("name") String name,
                           @Param("avatarGender") String avatarGender);
}
