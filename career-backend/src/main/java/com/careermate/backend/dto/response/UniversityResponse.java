package com.careermate.backend.dto.response;

import com.careermate.backend.domain.University;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Response shape matches src/config/universities.js field-for-field. */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UniversityResponse {
    private String code;
    private String name;
    private String primaryColor;
    private String primaryColorHover;
    private String primaryColorLight;
    private String primaryColorSoft;
    private String primaryColor2;
    private String primaryColorShadow;
    private String logo;

    public static UniversityResponse from(University u) {
        return UniversityResponse.builder()
                .code(u.getCode())
                .name(u.getName())
                .primaryColor(u.getPrimaryColor())
                .primaryColorHover(u.getPrimaryColorHover())
                .primaryColorLight(u.getPrimaryColorLight())
                .primaryColorSoft(u.getPrimaryColorSoft())
                .primaryColor2(u.getPrimaryColor2())
                .primaryColorShadow(u.getPrimaryColorShadow())
                .logo(u.getLogoUrl())
                .build();
    }
}
