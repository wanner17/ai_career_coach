package com.careermate.backend.mapper;

import java.time.LocalDateTime;
import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.careermate.backend.domain.RankingRow;

@Mapper
public interface RankingMapper {

    /**
     * Same university's students, ranked by EXP earned (completed quests'
     * `exp`, summed) from `from` onward — every quest completion the app
     * grants EXP for is timestamped (careermate_user_quest.completed_at), so
     * "전체" is just this with `from` set far enough back to include
     * everything, same query as "이번 주"/"이번 달". See RankingService.
     */
    List<RankingRow> findRanking(@Param("universityCode") String universityCode, @Param("from") LocalDateTime from);

    /** One user's EXP earned from `from` onward — backs the "이번 주 획득 EXP" stat, independent of whichever period tab is selected. */
    int sumExpForUser(@Param("userId") Long userId, @Param("from") LocalDateTime from);
}
