package com.careermate.backend.dto.response;

import com.careermate.backend.domain.Badge;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Admin badge list/detail shape — no `earned` (that's only meaningful per-student). */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminBadgeResponse {
    private Long id;
    private String name;
    private String unlockType;
    private Integer unlockValue;
    private String icon;
    private String medalClass;

    public static AdminBadgeResponse from(Badge b) {
        return AdminBadgeResponse.builder()
                .id(b.getId())
                .name(b.getName())
                .unlockType(b.getUnlockType())
                .unlockValue(b.getUnlockValue())
                .icon(b.getIcon())
                .medalClass(b.getMedalClass())
                .build();
    }
}
