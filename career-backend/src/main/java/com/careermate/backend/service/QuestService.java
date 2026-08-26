package com.careermate.backend.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.careermate.backend.domain.Quest;
import com.careermate.backend.domain.SkillTarget;
import com.careermate.backend.domain.StudentUser;
import com.careermate.backend.dto.response.QuestCompleteResponse;
import com.careermate.backend.dto.response.QuestResponse;
import com.careermate.backend.dto.response.UserResponse;
import com.careermate.backend.exception.NotFoundException;
import com.careermate.backend.mapper.EssayReviewMapper;
import com.careermate.backend.mapper.QuestMapper;
import com.careermate.backend.mapper.ResumeReviewMapper;
import com.careermate.backend.mapper.SkillActivityLogMapper;
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
    private final SkillActivityLogMapper skillActivityLogMapper;
    private final EssayReviewMapper essayReviewMapper;
    private final ResumeReviewMapper resumeReviewMapper;

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

        requireVerified(userId, quest.getName());

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

    /**
     * Server-side gate for the quests that have a real, already-tracked signal
     * to check — matched by name (schema.sql's careermate_quest.name), same
     * "match by title" idiom as the frontend's CompanyAnalysis.jsx
     * ANALYSIS_QUEST_TITLE. Without this, completeQuest() trusted the caller
     * completely: any authenticated student could POST .../quests/{id}/complete
     * directly and grant themselves EXP for a quest with zero actual activity
     * behind it.
     *
     * The remaining quests (취업지원센터 프로그램 참여, 관심 직무 3개 선택하기,
     * 진로심리검사 참여하기) have no in-app signal to check yet — either the
     * feature itself doesn't exist (관심 직무 선택) or the activity happens
     * outside this app entirely (오프라인 프로그램, 외부 검사) — those stay
     * self-reported for now; verifying them needs either a new feature or an
     * admin-approval flow, not a query against data we already have.
     */
    private void requireVerified(Long userId, String questName) {
        boolean verified = switch (questName) {
            case "기업분석 1회 완료" -> skillActivityLogMapper.existsForSkill(userId, SkillTarget.COMPANY_ANALYSIS.name());
            case "AI 모의면접 1회 완료" -> skillActivityLogMapper.existsForSkill(userId, SkillTarget.INTERVIEW.name());
            case "자기소개서 초안 작성" -> essayReviewMapper.existsForUser(userId);
            case "이력서 업데이트 하기" -> resumeReviewMapper.existsForUser(userId);
            default -> true; // no verifiable signal for this quest yet — self-report stands
        };
        if (!verified) {
            throw new IllegalArgumentException(unmetConditionMessage(questName));
        }
    }

    private String unmetConditionMessage(String questName) {
        return switch (questName) {
            case "기업분석 1회 완료" -> "먼저 기업분석에서 기업 상세 정보를 한 번 이상 조회해주세요.";
            case "AI 모의면접 1회 완료" -> "먼저 AI 모의면접 페이지를 한 번 이상 방문해주세요.";
            case "자기소개서 초안 작성" -> "먼저 자기소개서 첨삭을 한 번 이상 받아주세요.";
            case "이력서 업데이트 하기" -> "먼저 이력서·자소서 첨삭에서 이력서를 한 번 이상 첨삭받아주세요.";
            default -> "아직 완료 조건을 충족하지 못했습니다.";
        };
    }
}
