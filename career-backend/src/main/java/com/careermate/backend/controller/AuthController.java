package com.careermate.backend.controller;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.careermate.backend.dto.request.IdentifyRequest;
import com.careermate.backend.dto.response.IdentifyResponse;
import com.careermate.backend.service.AuthService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /** No password — see AuthService for why. */
    @PostMapping("/identify")
    public IdentifyResponse identify(@Valid @RequestBody IdentifyRequest request) {
        return authService.identify(request);
    }
}
