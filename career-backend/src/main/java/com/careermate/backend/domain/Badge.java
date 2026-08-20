package com.careermate.backend.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * unlockType: "QUEST" (granted explicitly, tracked in user_badge) or "LEVEL"
 * (derived — see BadgeServiceImpl). Mirrors src/data/mockBadges.js.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Badge {
    private Long id;
    private String name;
    private String unlockType;
    private Integer unlockValue;
    private String icon;
    private String medalClass;

    // populated only by the per-user badge query
    private Boolean earned;
}
