package com.careermate.backend.controller;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.careermate.backend.dto.response.RankingResponse;
import com.careermate.backend.service.RankingService;
import com.careermate.backend.service.RankingService.Period;

import lombok.RequiredArgsConstructor;

/** Auth follows every other /api/career/** route — JWT required (see SecurityConfig). */
@RestController
@RequestMapping("/api/career/ranking")
@RequiredArgsConstructor
public class RankingController {

    private final RankingService rankingService;

    @GetMapping
    public RankingResponse getRanking(@AuthenticationPrincipal Long userId,
                                       @RequestParam(defaultValue = "ALL") Period period) {
        return rankingService.getRanking(userId, period);
    }
}
