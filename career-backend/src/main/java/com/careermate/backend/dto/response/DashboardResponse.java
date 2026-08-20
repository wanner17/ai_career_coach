package com.careermate.backend.dto.response;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * One-shot payload for the Dashboard page — everything CareerContext needs
 * on first load in a single round trip instead of 4 separate calls.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardResponse {
    private UserResponse user;
    private SkillResponse skills;
    private List<QuestResponse> quests;
    private List<BadgeResponse> badges;
}
