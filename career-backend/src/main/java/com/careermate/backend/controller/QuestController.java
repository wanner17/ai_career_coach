package com.careermate.backend.controller;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.careermate.backend.dto.response.QuestCompleteResponse;
import com.careermate.backend.dto.response.QuestResponse;
import com.careermate.backend.service.QuestService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/career/quests")
@RequiredArgsConstructor
public class QuestController {

    private final QuestService questService;

    // userId comes from the JWT — no longer a caller-supplied param (see SecurityConfig).
    @GetMapping
    public List<QuestResponse> getQuests(@AuthenticationPrincipal Long userId) {
        return questService.getQuestsForUser(userId);
    }

    @PostMapping("/{questId}/complete")
    public QuestCompleteResponse completeQuest(@PathVariable Long questId, @AuthenticationPrincipal Long userId) {
        return questService.completeQuest(userId, questId);
    }
}
