package com.careermate.backend.dto.response;

import com.careermate.backend.domain.Quest;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Student-facing quest shape — matches src/data/mockQuests.js. */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuestResponse {
    private Long id;
    private String title;
    private String category;
    private Integer exp;
    private Boolean completed;
    private Boolean today;

    public static QuestResponse from(Quest q) {
        return QuestResponse.builder()
                .id(q.getId())
                .title(q.getName())
                .category(q.getCategory())
                .exp(q.getExp())
                .completed(Boolean.TRUE.equals(q.getCompleted()))
                .today(Boolean.TRUE.equals(q.getIsToday()))
                .build();
    }
}
