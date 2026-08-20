package com.careermate.backend.controller;

import java.util.Collections;
import java.util.List;

import jakarta.validation.Valid;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.careermate.backend.domain.EssayReviewRecord;
import com.careermate.backend.dto.request.EssayReviewRequest;
import com.careermate.backend.dto.response.EssayReviewHistoryItem;
import com.careermate.backend.dto.response.EssayReviewResponse;
import com.careermate.backend.service.EssayReviewService;
import com.careermate.backend.service.UserService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/career/essay")
@RequiredArgsConstructor
public class EssayController {

    private final EssayReviewService essayReviewService;
    private final UserService userService;
    private final ObjectMapper objectMapper;

    @PostMapping("/review")
    public EssayReviewResponse review(@Valid @RequestBody EssayReviewRequest request, @AuthenticationPrincipal Long userId) {
        String desiredJob = userService.getUserOrThrow(userId).getDesiredJob();
        return essayReviewService.review(userId, request, desiredJob);
    }

    /** Most recent first — backs the frontend's history list + score trend graph. */
    @GetMapping("/history")
    public List<EssayReviewHistoryItem> history(@AuthenticationPrincipal Long userId,
                                                  @RequestParam(defaultValue = "20") int limit) {
        return essayReviewService.history(userId, limit).stream()
                .map(this::toHistoryItem)
                .toList();
    }

    private EssayReviewHistoryItem toHistoryItem(EssayReviewRecord record) {
        return EssayReviewHistoryItem.builder()
                .id(record.getId())
                .targetType(record.getTargetType())
                .targetLabel(record.getTargetLabel())
                .overallScore(record.getOverallScore())
                .summary(record.getSummary())
                .categories(readCategories(record.getCategoriesJson()))
                .createdAt(record.getCreatedAt())
                .build();
    }

    private List<EssayReviewResponse.CategoryScore> readCategories(String categoriesJson) {
        if (categoriesJson == null || categoriesJson.isBlank()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(categoriesJson, new TypeReference<List<EssayReviewResponse.CategoryScore>>() { });
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }
}
