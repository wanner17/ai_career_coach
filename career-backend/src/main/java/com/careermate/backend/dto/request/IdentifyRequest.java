package com.careermate.backend.dto.request;

import jakarta.validation.constraints.NotBlank;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Body for POST /api/auth/identify. The host university page is the one
 * that authenticated this student (this widget never shows a login form) —
 * it hands us its own university code + student id, and optionally a display
 * name/profile to seed a brand-new student with on first visit.
 */
@Getter
@Setter
@NoArgsConstructor
public class IdentifyRequest {

    @NotBlank
    private String universityCode;

    @NotBlank
    private String externalUserId;

    // Only used the first time this (universityCode, externalUserId) pair is
    // seen — ignored on subsequent visits, the existing row wins.
    private String name;
    private String major;
    private Integer grade;
    private String desiredJob;
}
