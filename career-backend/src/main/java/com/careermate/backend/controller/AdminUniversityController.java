package com.careermate.backend.controller;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.careermate.backend.dto.request.UniversityUpdateRequest;
import com.careermate.backend.dto.response.UniversityResponse;
import com.careermate.backend.service.UniversityService;

import lombok.RequiredArgsConstructor;

/**
 * Backs Admin 설정. GET isn't duplicated here — the public
 * /api/career/university/{code} (already open, see SecurityConfig) is the
 * same read the settings form needs to preload.
 */
@RestController
@RequestMapping("/api/admin/universities")
@RequiredArgsConstructor
public class AdminUniversityController {

    private final UniversityService universityService;

    @PutMapping("/{code}")
    public UniversityResponse updateUniversity(@PathVariable String code, @Valid @RequestBody UniversityUpdateRequest request) {
        return universityService.updateUniversity(code, request);
    }
}
