package com.careermate.backend.controller;

import java.time.LocalDate;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.careermate.backend.domain.SkillTarget;
import com.careermate.backend.dto.response.SkillGain;
import com.careermate.backend.service.SkillActivityService;

import lombok.RequiredArgsConstructor;

/**
 * A small, purpose-built endpoint per 능력치-growing action that has no
 * other natural backend touchpoint — unlike job/company detail views
 * (credited inline in WorknetController, since that call already happens)
 * or AI 상담 topics (credited inline in AiChatService). Deliberately NOT a
 * generic "credit any skill" endpoint: the frontend can't choose the skill
 * or the points, only trigger one hardcoded, named action — otherwise any
 * client could farm arbitrary 능력치 by calling a generic endpoint on repeat.
 */
@RestController
@RequestMapping("/api/career/skills")
@RequiredArgsConstructor
public class SkillActivityController {

    /** 능력치 정의 v3 — 면접역량 has no other real usage signal (the mock-interview tool is an external iframe with no completion callback). */
    private static final int INTERVIEW_VISIT_POINTS = 3;

    private final SkillActivityService skillActivityService;

    /** Called once per page load by pages/InterviewPage.jsx — once/day per student (activityKey bakes in today's date). */
    @PostMapping("/interview-visit")
    public SkillGainResponse creditInterviewVisit(@AuthenticationPrincipal Long userId) {
        String activityKey = "visit:" + LocalDate.now();
        SkillGain gain = skillActivityService.credit(userId, SkillTarget.INTERVIEW, activityKey, INTERVIEW_VISIT_POINTS);
        return new SkillGainResponse(gain);
    }

    public record SkillGainResponse(SkillGain skillGain) {
    }
}
