package com.careermate.backend.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Body for POST /api/admin/quests and PUT /api/admin/quests/{id}. */
@Getter
@Setter
@NoArgsConstructor
public class QuestUpsertRequest {

    @NotBlank
    private String name;

    private String description;

    @NotBlank
    private String category;

    @NotBlank
    private String target;

    @NotNull
    @Min(0)
    private Integer exp;

    @NotBlank
    private String period;

    @NotBlank
    private String status; // "사용" | "미사용"
}
