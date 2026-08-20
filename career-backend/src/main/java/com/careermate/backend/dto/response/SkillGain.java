package com.careermate.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * "능력치 올랐어요" feedback — shared across every place a 능력치 axis can
 * grow (AI 상담, 공고/기업 상세 열람, 모의면접 방문 — see SkillActivityService).
 * Null wherever it appears means nothing changed this turn (already credited,
 * or already at the 100 cap).
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SkillGain {
    private String skillLabel;
    private int points;
}
