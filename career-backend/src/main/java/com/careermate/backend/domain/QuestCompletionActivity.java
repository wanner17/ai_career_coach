package com.careermate.backend.domain;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** One row of the "최근 활동" feed on Admin Dashboard — see QuestMapper#recentCompletions. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class QuestCompletionActivity {
    private String studentName;
    private String questTitle;
    private int exp;
    private LocalDateTime completedAt;
}
