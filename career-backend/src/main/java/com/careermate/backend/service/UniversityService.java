package com.careermate.backend.service;

import org.springframework.stereotype.Service;

import org.springframework.transaction.annotation.Transactional;

import com.careermate.backend.domain.University;
import com.careermate.backend.dto.request.UniversityUpdateRequest;
import com.careermate.backend.dto.response.UniversityResponse;
import com.careermate.backend.exception.NotFoundException;
import com.careermate.backend.mapper.UniversityMapper;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UniversityService {

    private final UniversityMapper universityMapper;

    public UniversityResponse getUniversity(String code) {
        return UniversityResponse.from(requireExists(code));
    }

    /** Backs Admin 설정 — ThemeContext.jsx picks this up on the student side's next load (no live-broadcast to open tabs). */
    @Transactional
    public UniversityResponse updateUniversity(String code, UniversityUpdateRequest request) {
        requireExists(code);
        University university = University.builder()
                .code(code)
                .name(request.getName())
                .primaryColor(request.getPrimaryColor())
                .primaryColorHover(request.getPrimaryColorHover())
                .primaryColorLight(request.getPrimaryColorLight())
                .primaryColorSoft(request.getPrimaryColorSoft())
                .primaryColor2(request.getPrimaryColor2())
                .primaryColorShadow(request.getPrimaryColorShadow())
                .logoUrl(request.getLogo() == null || request.getLogo().isBlank() ? null : request.getLogo())
                .build();
        universityMapper.update(university);
        return getUniversity(code);
    }

    private University requireExists(String code) {
        University university = universityMapper.findByCode(code);
        if (university == null) {
            throw new NotFoundException("대학 설정을 찾을 수 없습니다: " + code);
        }
        return university;
    }
}
