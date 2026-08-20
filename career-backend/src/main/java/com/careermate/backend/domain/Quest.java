package com.careermate.backend.domain;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Master quest catalog row — one table backs both the student quest list and
 * the admin CRUD screen (see schema.sql). `completed`/`today` are per-user
 * and only populated when this row was joined against user_quest for a
 * specific student; leave them null for pure catalog/admin reads.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Quest {
    private Long id;
    private String name;
    private String description;
    private String category;
    private String targetGrade;
    private Integer exp;
    private String period;
    private Boolean isToday;
    private String status;
    private LocalDateTime createdAt;

    // populated only by the per-user quest queries (left join onto user_quest)
    private Boolean completed;
}
