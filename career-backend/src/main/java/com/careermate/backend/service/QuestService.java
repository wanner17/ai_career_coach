package com.careermate.backend.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.careermate.backend.domain.Quest;
import com.careermate.backend.domain.StudentUser;
import com.careermate.backend.dto.response.QuestCompleteResponse;
import com.careermate.backend.dto.response.QuestResponse;
import com.careermate.backend.dto.response.UserResponse;
import com.careermate.backend.exception.NotFoundException;
import com.careermate.backend.mapper.QuestMapper;
import com.careermate.backend.mapper.UserMapper;
import com.careermate.backend.util.CareerLevelCalculator;

import lombok.RequiredArgsConstructor;

/**
 * Quests are EXP/badge-only — 능력치 growth was pulled out of here on
 * purpose (see AiChatService#applyChatSkillBump / EssayReviewService for
 * where it actually lives now): 능력치 tracks genuine feature usage, quests
 * track "did the student do the thing once", and conflating the two made a
 * quest checkbox double as a skill-farming button.
 */
@Service
@RequiredArgsConstructor
public class QuestService {

    private final QuestMapper questMapper;
    private final UserMapper userMapper;

    public List<QuestResponse> getQuestsForUser(Long userId) {
        return questMapper.findAllForUser(userId).stream()
                .map(QuestResponse::from)
                .toList();
    }

    /**
     * Same guard + EXP formula as the frontend's CareerContext.completeQuest():
     * already-completed is a no-op (idempotent — a duplicate click, a retried
     * request, whatever), never a 2nd EXP grant. See CareerLevelCalculator for
     * the level-up math itself.
     */
    @Transactional
    public QuestCompleteResponse completeQuest(Long userId, Long questId) {
        Quest quest = questMapper.findById(questId);
        if (quest == null) {
            throw new NotFoundException("퀘스트를 찾을 수 없습니다: " + questId);
        }

        StudentUser user = userMapper.findById(userId);
        if (user == null) {
            throw new NotFoundException("사용자를 찾을 수 없습니다: " + userId);
        }

        Boolean alreadyCompleted = questMapper.findUserQuestCompleted(userId, questId);
        if (Boolean.TRUE.equals(alreadyCompleted)) {
            return QuestCompleteResponse.builder()
                    .questId(questId)
                    .alreadyCompleted(true)
                    .expGained(0)
                    .user(UserResponse.from(user))
                    .leveledUp(false)
                    .build();
        }

        CareerLevelCalculator.Result result =
                CareerLevelCalculator.applyExp(user.getLevel(), user.getCurrentExp(), quest.getExp());

        userMapper.updateLevelExp(userId, result.level(), result.currentExp(), result.nextLevelExp());

        if (alreadyCompleted == null) {
            questMapper.insertUserQuestCompleted(userId, questId);
        } else {
            questMapper.updateUserQuestCompleted(userId, questId);
        }

        StudentUser updatedUser = userMapper.findById(userId);

        return QuestCompleteResponse.builder()
                .questId(questId)
                .alreadyCompleted(false)
                .expGained(quest.getExp())
                .user(UserResponse.from(updatedUser))
                .leveledUp(result.leveledUp())
                .fromLevel(result.leveledUp() ? result.fromLevel() : null)
                .toLevel(result.leveledUp() ? result.level() : null)
                .build();
    }
}
