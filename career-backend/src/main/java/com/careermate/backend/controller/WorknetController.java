package com.careermate.backend.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.careermate.backend.domain.SkillTarget;
import com.careermate.backend.service.SkillActivityService;
import com.careermate.backend.service.WorknetService;

import lombok.RequiredArgsConstructor;

/**
 * Proxies work24.go.kr's Open API — see WorknetService for why this returns
 * raw XML instead of a parsed DTO. Auth follows every other /api/career/**
 * route (JWT required — see SecurityConfig), same as Quest/Badge/Dashboard.
 */
@RestController
@RequestMapping("/api/career/worknet")
@RequiredArgsConstructor
public class WorknetController {

    /** 능력치 정의 v3 — actually opening a posting/company detail is the "실사용" signal, once per unique id (see SkillActivityService). */
    private static final int CONTENT_VIEW_POINTS = 3;

    private final WorknetService worknetService;
    private final SkillActivityService skillActivityService;

    @GetMapping
    public ResponseEntity<String> getWorknetData(
            @AuthenticationPrincipal Long userId,
            @RequestParam(defaultValue = "EVENT") String type,
            @RequestParam(defaultValue = "L") String callTp,
            @RequestParam(defaultValue = "") String keyword,
            @RequestParam(defaultValue = "1") String startPage,
            @RequestParam(defaultValue = "desc") String sortOrderBy,
            @RequestParam(defaultValue = "") String areaCd,
            @RequestParam(defaultValue = "") String eventNo,
            @RequestParam(defaultValue = "") String empSeqno,
            @RequestParam(defaultValue = "") String empCoNo) {
        String xml = worknetService.fetchXml(type, callTp, keyword, startPage, sortOrderBy, areaCd, eventNo, empSeqno, empCoNo);
        creditDetailView(userId, callTp, type, empSeqno, empCoNo);
        return ResponseEntity.ok()
                .contentType(new MediaType("application", "xml", java.nio.charset.StandardCharsets.UTF_8))
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(xml);
    }

    // Silent — no toast for this one (unlike essay/chat/interview-visit).
    // Detail views happen far more often than those more deliberate actions;
    // a growth toast on every posting opened would just be noise. The bump
    // shows up next time the student's skill data reloads.
    private void creditDetailView(Long userId, String callTp, String type, String empSeqno, String empCoNo) {
        if (userId == null || !"D".equals(callTp)) {
            return;
        }
        if ("NEWS".equals(type) && empSeqno != null && !empSeqno.isBlank()) {
            skillActivityService.credit(userId, SkillTarget.JOB_SKILL, "job:" + empSeqno, CONTENT_VIEW_POINTS);
        } else if ("COMPANY".equals(type) && empCoNo != null && !empCoNo.isBlank()) {
            skillActivityService.credit(userId, SkillTarget.COMPANY_ANALYSIS, "company:" + empCoNo, CONTENT_VIEW_POINTS);
        }
    }
}
