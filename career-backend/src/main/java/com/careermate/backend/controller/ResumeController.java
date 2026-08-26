package com.careermate.backend.controller;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.careermate.backend.domain.ResumeReviewRecord;
import com.careermate.backend.dto.response.ResumeReviewHistoryItem;
import com.careermate.backend.dto.response.ResumeReviewResponse;
import com.careermate.backend.service.ResumeReviewService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;

/**
 * 이력서 첨삭 — multipart 업로드라 EssayController와 달리 JSON 바디가 아니라
 * @RequestParam으로 파일 + 대상(target) 필드를 같이 받는다.
 */
@RestController
@RequestMapping("/api/career/resume")
@RequiredArgsConstructor
public class ResumeController {

    private final ResumeReviewService resumeReviewService;
    private final ObjectMapper objectMapper;

    @PostMapping(value = "/review", consumes = "multipart/form-data")
    public ResumeReviewResponse review(
            @AuthenticationPrincipal Long userId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String targetType,
            @RequestParam(required = false) String targetLabel,
            @RequestParam(required = false) String targetContext) {
        return resumeReviewService.review(userId, file, targetType, targetLabel, targetContext);
    }

    /** Most recent first — backs the frontend's history list. */
    @GetMapping("/history")
    public List<ResumeReviewHistoryItem> history(@AuthenticationPrincipal Long userId,
                                                   @RequestParam(defaultValue = "20") int limit) {
        return resumeReviewService.history(userId, limit).stream()
                .map(this::toHistoryItem)
                .toList();
    }

    private ResumeReviewHistoryItem toHistoryItem(ResumeReviewRecord record) {
        return ResumeReviewHistoryItem.builder()
                .id(record.getId())
                .fileName(record.getFileName())
                .targetType(record.getTargetType())
                .targetLabel(record.getTargetLabel())
                .overallScore(record.getOverallScore())
                .jobFitScore(record.getJobFitScore())
                .summary(record.getSummary())
                .sections(readList(record.getSectionsJson(), new TypeReference<List<ResumeReviewResponse.SectionScore>>() { }))
                .excerptReviews(readList(record.getExcerptReviewsJson(), new TypeReference<List<ResumeReviewResponse.ExcerptReview>>() { }))
                .missingKeywords(readList(record.getMissingKeywordsJson(), new TypeReference<List<ResumeReviewResponse.MissingKeyword>>() { }))
                // suggestions_json 컬럼은 이제 priorityImprovements를 담는다 — ResumeReviewRecord 참고.
                .priorityImprovements(readList(record.getSuggestionsJson(), new TypeReference<List<ResumeReviewResponse.PriorityImprovement>>() { }))
                .createdAt(record.getCreatedAt())
                .build();
    }

    private <T> List<T> readList(String json, TypeReference<List<T>> type) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, type);
        } catch (Exception e) {
            return List.of();
        }
    }
}
