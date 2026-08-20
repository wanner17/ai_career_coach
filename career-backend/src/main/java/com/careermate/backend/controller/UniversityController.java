package com.careermate.backend.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.careermate.backend.dto.response.UniversityResponse;
import com.careermate.backend.service.UniversityService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/career/university")
@RequiredArgsConstructor
public class UniversityController {

    private final UniversityService universityService;

    @GetMapping("/{code}")
    public UniversityResponse getUniversity(@PathVariable String code) {
        return universityService.getUniversity(code);
    }
}
