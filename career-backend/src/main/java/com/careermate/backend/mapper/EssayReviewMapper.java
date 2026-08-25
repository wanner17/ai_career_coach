package com.careermate.backend.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.careermate.backend.domain.EssayReviewRecord;

@Mapper
public interface EssayReviewMapper {
    void insert(EssayReviewRecord record);

    /** Most recent first — see EssayReviewController#history. */
    List<EssayReviewRecord> findAllForUser(@Param("userId") Long userId, @Param("limit") int limit);

    /** Any review at all for this user — gates the "자기소개서 초안 작성" quest. See QuestService#requireVerified. */
    boolean existsForUser(@Param("userId") Long userId);
}
