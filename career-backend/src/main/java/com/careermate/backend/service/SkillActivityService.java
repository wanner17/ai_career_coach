package com.careermate.backend.service;

import org.springframework.stereotype.Service;

import com.careermate.backend.domain.SkillScore;
import com.careermate.backend.domain.SkillTarget;
import com.careermate.backend.dto.response.SkillGain;
import com.careermate.backend.mapper.SkillActivityLogMapper;
import com.careermate.backend.mapper.SkillMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 능력치 정의 v3 — the one place every 능력치 axis actually grows now.
 * "실사용 기반": crediting requires a real, specific piece of content
 * (`activityKey` — a job posting id, a company id, today's date for a
 * one-per-day signal) rather than a quest checkbox or a raw activity count,
 * so the same content can only ever be credited once (see
 * careermate_skill_activity_log's UNIQUE constraint) — re-opening a posting
 * 50 times doesn't farm the skill, discussing 50 different job postings in
 * chat would.
 *
 * Call sites: WorknetController (job/company detail viewed), AiChatService
 * (진로/취업준비 topics — no dedicated feature page exists for those),
 * SkillActivityController (모의면접 방문).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SkillActivityService {

    private static final int SKILL_CAP = 100;

    private final SkillActivityLogMapper activityLogMapper;
    private final SkillMapper skillMapper;

    /**
     * @param activityKey a value unique to the thing being credited for
     *                    (e.g. "job:12345", "company:9987", "visit:2026-08-20")
     *                    — the same key credited twice is a silent no-op.
     */
    public SkillGain credit(Long userId, SkillTarget skill, String activityKey, int points) {
        try {
            int inserted = activityLogMapper.tryInsert(userId, skill.name(), activityKey, points);
            if (inserted == 0) {
                return null; // already credited for this exact activity before
            }

            SkillScore current = skillMapper.findByUserId(userId);
            if (current == null) {
                return null;
            }

            int before = axisValue(current, skill);
            int after = Math.min(SKILL_CAP, before + points);
            if (after == before) {
                return null; // already at the cap
            }
            applyUpdate(userId, skill, after);

            return SkillGain.builder().skillLabel(skill.label()).points(after - before).build();
        } catch (Exception e) {
            // Best-effort — a lost skill point should never fail the request that triggered it.
            log.warn("skill credit failed for user {} skill {} key {}", userId, skill, activityKey, e);
            return null;
        }
    }

    private int axisValue(SkillScore s, SkillTarget skill) {
        return switch (skill) {
            case JOB_SKILL -> s.getJobSkill();
            case RESUME -> s.getResume();
            case INTERVIEW -> s.getInterview();
            case COMPANY_ANALYSIS -> s.getCompanyAnalysis();
            case CAREER_READINESS -> s.getCareerReadiness();
        };
    }

    private void applyUpdate(Long userId, SkillTarget skill, int newValue) {
        switch (skill) {
            case JOB_SKILL -> skillMapper.updateJobSkill(userId, newValue);
            case RESUME -> skillMapper.updateResume(userId, newValue);
            case INTERVIEW -> skillMapper.updateInterview(userId, newValue);
            case COMPANY_ANALYSIS -> skillMapper.updateCompanyAnalysis(userId, newValue);
            case CAREER_READINESS -> skillMapper.updateCareerReadiness(userId, newValue);
        }
    }
}
