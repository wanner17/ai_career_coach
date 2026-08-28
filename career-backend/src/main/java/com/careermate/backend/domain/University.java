package com.careermate.backend.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Mirrors src/config/universities.js. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class University {
    private String code;
    private String name;
    private String primaryColor;
    private String primaryColorHover;
    private String primaryColorLight;
    private String primaryColorSoft;
    private String primaryColor2;
    private String primaryColorShadow;
    private String logoUrl;
    /** 마이페이지 아래 "커리어로드맵" 메뉴 링크 — 이 대학 홈페이지 자체의 페이지 URL. null/blank면 메뉴 숨김. */
    private String careerRoadmapUrl;
}
