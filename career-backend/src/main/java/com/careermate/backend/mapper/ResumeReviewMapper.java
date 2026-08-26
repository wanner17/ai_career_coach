package com.careermate.backend.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.careermate.backend.domain.ResumeReviewRecord;

@Mapper
public interface ResumeReviewMapper {
    void insert(ResumeReviewRecord record);

    /** Most recent first — see ResumeController#history. */
    List<ResumeReviewRecord> findAllForUser(@Param("userId") Long userId, @Param("limit") int limit);
}
