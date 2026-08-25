package com.careermate.backend.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** One row of RankingMapper#findRanking — see RankingService. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RankingRow {
    private Long id;
    private String name;
    private String major;
    private Integer grade;
    private Integer level;
    private String avatarGender;
    /** Sum of completed quests' EXP within the queried period (see RankingMapper.xml's `from` bound). */
    private Integer periodExp;
}
