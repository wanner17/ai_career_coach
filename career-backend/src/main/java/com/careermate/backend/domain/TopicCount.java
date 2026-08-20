package com.careermate.backend.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** One row of GET /api/career/ai/chat/insights — see ChatLogMapper#topicCountsForUser. */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TopicCount {
    private String topic;
    private int count;
}
