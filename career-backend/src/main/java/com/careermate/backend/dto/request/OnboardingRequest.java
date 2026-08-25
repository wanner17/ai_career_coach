package com.careermate.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Body for PUT /api/career/user/me/onboarding — the new-account nickname +
 * avatar-style picker, shown once right after AuthService provisions a fresh
 * StudentUser (see AuthController#identify's response.newUser). Deliberately
 * narrower than UpdateProfileRequest (no major/grade) — those still default
 * from provisioning and stay editable later via 마이페이지, not forced here.
 */
@Getter
@Setter
@NoArgsConstructor
public class OnboardingRequest {

    @NotBlank
    private String name;

    @NotBlank
    @Pattern(regexp = "MALE|FEMALE", message = "avatarGender는 MALE 또는 FEMALE이어야 합니다.")
    private String avatarGender;
}
