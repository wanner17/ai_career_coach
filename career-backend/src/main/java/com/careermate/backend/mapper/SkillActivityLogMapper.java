package com.careermate.backend.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface SkillActivityLogMapper {
    /**
     * INSERT IGNORE against the (user_id, skill, activity_key) UNIQUE
     * constraint — returns 1 if this is genuinely new (credit it), 0 if
     * already logged before (silent no-op). See SkillActivityService.
     */
    int tryInsert(@Param("userId") Long userId, @Param("skill") String skill,
            @Param("activityKey") String activityKey, @Param("points") int points);
}
