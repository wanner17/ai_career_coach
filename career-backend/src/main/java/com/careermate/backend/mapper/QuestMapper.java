package com.careermate.backend.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.careermate.backend.domain.Quest;
import com.careermate.backend.domain.QuestCompletionActivity;
import com.careermate.backend.domain.QuestCompletionCount;

@Mapper
public interface QuestMapper {

    /** Student view: catalog joined against this user's completion state, active quests only. */
    List<Quest> findAllForUser(@Param("userId") Long userId);

    /** Admin view: full catalog regardless of status, no per-user join. */
    List<Quest> findAllCatalog();

    Quest findById(@Param("id") Long id);

    /** Used to auto-complete a quest by its known title (e.g. essay review — see EssayReviewService) without hardcoding a seed id. */
    Quest findByName(@Param("name") String name);

    void insert(Quest quest);

    void update(Quest quest);

    void deleteById(@Param("id") Long id);

    /** Null = the student never touched this quest yet (no user_quest row). */
    Boolean findUserQuestCompleted(@Param("userId") Long userId, @Param("questId") Long questId);

    void insertUserQuestCompleted(@Param("userId") Long userId, @Param("questId") Long questId);

    void updateUserQuestCompleted(@Param("userId") Long userId, @Param("questId") Long questId);

    /** Completed count per quest, across every student — backs Admin 통계. Quests with zero completions are simply absent. */
    List<QuestCompletionCount> completionCounts();

    /** Total completions across every student/quest — the "누적 퀘스트 완료" tile on Admin Dashboard. */
    int totalCompletedCount();

    /** Most recent completions first, joined with student/quest names — backs Admin Dashboard's activity feed. */
    List<QuestCompletionActivity> recentCompletions(@Param("limit") int limit);
}
