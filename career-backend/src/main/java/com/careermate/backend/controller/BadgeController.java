package com.careermate.backend.controller;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.careermate.backend.dto.response.BadgeResponse;
import com.careermate.backend.service.BadgeService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/career/badges")
@RequiredArgsConstructor
public class BadgeController {

    private final BadgeService badgeService;

    @GetMapping
    public List<BadgeResponse> getBadges(@AuthenticationPrincipal Long userId) {
        return badgeService.getBadgesForUser(userId);
    }
}
