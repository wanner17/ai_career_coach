package com.careermate.backend.dto.request;

import jakarta.validation.constraints.NotBlank;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Body for POST /api/admin/badges and PUT /api/admin/badges/{id}. */
@Getter
@Setter
@NoArgsConstructor
public class BadgeUpsertRequest {

    @NotBlank
    private String name;

    @NotBlank
    private String unlockType; // "QUEST" | "LEVEL"

    /** Required when unlockType is LEVEL (the minimum level), ignored for QUEST. */
    private Integer unlockValue;

    @NotBlank
    private String icon;

    @NotBlank
    private String medalClass;
}
