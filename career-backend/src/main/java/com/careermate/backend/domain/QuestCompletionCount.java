package com.careermate.backend.domain;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** One row of a GROUP BY quest_id count over careermate_user_quest — see QuestMapper#completionCounts. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class QuestCompletionCount {
    private Long questId;
    private int count;
}
