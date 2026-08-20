package com.careermate.backend.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Body for PUT /api/career/user/me/profile — 마이페이지 기본 정보 수정. */
@Getter
@Setter
@NoArgsConstructor
public class UpdateProfileRequest {

    @NotBlank
    private String name;

    /** Optional — a student who hasn't declared a major yet leaves this blank. */
    private String major;

    @NotNull
    @Min(1)
    @Max(6)
    private Integer grade;

    /** Optional. */
    private String desiredJob;
}
