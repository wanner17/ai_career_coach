package com.careermate.backend.dto.request;

import jakarta.validation.constraints.NotBlank;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Body for PUT /api/admin/universities/{code} — backs Admin 설정. */
@Getter
@Setter
@NoArgsConstructor
public class UniversityUpdateRequest {

    @NotBlank
    private String name;

    @NotBlank
    private String primaryColor;

    @NotBlank
    private String primaryColorHover;

    @NotBlank
    private String primaryColorLight;

    @NotBlank
    private String primaryColorSoft;

    @NotBlank
    private String primaryColor2;

    @NotBlank
    private String primaryColorShadow;

    /** Optional — an empty/blank value falls back to BrandLogo.jsx's icon, same as an unset one. */
    private String logo;
}
