package com.careermate.backend.dto.response;

import com.careermate.backend.domain.Quest;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Admin quest list/detail shape — matches src/data/mockAdminQuests.js. */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminQuestResponse {
    private Long id;
    private String name;
    private String description;
    private String target;
    private String category;
    private Integer exp;
    private String period;
    private String status;

    public static AdminQuestResponse from(Quest q) {
        return AdminQuestResponse.builder()
                .id(q.getId())
                .name(q.getName())
                .description(q.getDescription())
                .target(q.getTargetGrade())
                .category(q.getCategory())
                .exp(q.getExp())
                .period(q.getPeriod())
                .status(q.getStatus())
                .build();
    }
}
