package com.careermate.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Response for POST /api/career/quests/{id}/complete — carries everything the
 * frontend's completeQuest()/LevelUpModal need in one call: whether EXP was
 * actually granted (idempotent no-op if the quest was already done), and the
 * level-up transition if one happened. EXP/badges only — 능력치 growth lives
 * elsewhere now (AiChatService/EssayReviewService), not here.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuestCompleteResponse {
    private Long questId;
    private boolean alreadyCompleted;
    private int expGained;
    private UserResponse user;
    private boolean leveledUp;
    private Integer fromLevel;
    private Integer toLevel;
}
