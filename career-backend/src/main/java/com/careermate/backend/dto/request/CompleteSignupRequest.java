package com.careermate.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Body for POST /api/auth/complete-signup — the onboarding screen's submit.
 * Carries the SAME identity pair identify() was called with (the frontend
 * holds onto it across the onboarding screen — see CareerContext.jsx), since
 * no account/token exists yet at this point for a genuinely new student to
 * have proven identity through any other way. This is the ONLY place a
 * StudentUser row actually gets created — see AuthService#completeSignup.
 */
@Getter
@Setter
@NoArgsConstructor
public class CompleteSignupRequest {

    @NotBlank
    private String universityCode;

    @NotBlank
    private String externalUserId;

    @NotBlank
    private String name;

    @NotBlank
    @Pattern(regexp = "MALE|FEMALE", message = "avatarGender는 MALE 또는 FEMALE이어야 합니다.")
    private String avatarGender;
}
