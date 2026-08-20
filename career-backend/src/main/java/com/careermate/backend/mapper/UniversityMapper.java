package com.careermate.backend.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.careermate.backend.domain.University;

@Mapper
public interface UniversityMapper {
    University findByCode(@Param("code") String code);

    /** Backs Admin 설정 — updates every column except the PK (code). */
    void update(University university);
}
