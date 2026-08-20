package com.careermate.backend.dto.response;

import com.careermate.backend.domain.Badge;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Matches src/data/mockBadges.js. */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BadgeResponse {
    private Long id;
    private String name;
    private String unlockType;
    private Integer unlockValue;
    private String icon;
    private String medalClass;
    private Boolean earned;

    public static BadgeResponse from(Badge b) {
        return BadgeResponse.builder()
                .id(b.getId())
                .name(b.getName())
                .unlockType(b.getUnlockType())
                .unlockValue(b.getUnlockValue())
                .icon(b.getIcon())
                .medalClass(b.getMedalClass())
                .earned(Boolean.TRUE.equals(b.getEarned()))
                .build();
    }
}
