package com.careermate.backend.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.careermate.backend.dto.response.AdminStudentResponse;
import com.careermate.backend.service.AdminStudentService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin/students")
@RequiredArgsConstructor
public class AdminStudentController {

    private final AdminStudentService adminStudentService;

    @GetMapping
    public List<AdminStudentResponse> getAllStudents() {
        return adminStudentService.getAllStudents();
    }
}
