package com.careermate.backend.controller;

import jakarta.validation.Valid;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.careermate.backend.dto.request.OnboardingRequest;
import com.careermate.backend.dto.request.UpdateAvatarRequest;
import com.careermate.backend.dto.request.UpdateProfileRequest;
import com.careermate.backend.dto.response.DashboardResponse;
import com.careermate.backend.dto.response.UserResponse;
import com.careermate.backend.service.UserService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/career")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    // userId comes from the JWT (JwtAuthenticationFilter), never from the
    // caller — "me" instead of a path variable so that's obvious at the call site.
    @GetMapping("/user/me")
    public UserResponse getUser(@AuthenticationPrincipal Long userId) {
        return userService.getUser(userId);
    }

    @GetMapping("/dashboard/me")
    public DashboardResponse getDashboard(@AuthenticationPrincipal Long userId) {
        return userService.getDashboard(userId);
    }

    @PutMapping("/user/me/avatar")
    public UserResponse updateAvatar(@AuthenticationPrincipal Long userId, @Valid @RequestBody UpdateAvatarRequest request) {
        return userService.updateAvatar(userId, request);
    }

    @PutMapping("/user/me/profile")
    public UserResponse updateProfile(@AuthenticationPrincipal Long userId, @Valid @RequestBody UpdateProfileRequest request) {
        return userService.updateProfile(userId, request);
    }

    /** 신규 계정 첫 진입 화면(닉네임/아바타 선택) — see OnboardingRequest. */
    @PutMapping("/user/me/onboarding")
    public UserResponse completeOnboarding(@AuthenticationPrincipal Long userId, @Valid @RequestBody OnboardingRequest request) {
        return userService.completeOnboarding(userId, request);
    }
}
