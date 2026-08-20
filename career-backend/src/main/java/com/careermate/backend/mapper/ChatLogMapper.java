package com.careermate.backend.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.careermate.backend.domain.ChatMessage;
import com.careermate.backend.domain.TopicCount;

@Mapper
public interface ChatLogMapper {
    void insert(ChatMessage message);

    /** Most recent first — AiChatService reverses it back to chronological order for the LLM/history. */
    List<ChatMessage> findRecentForUser(@Param("userId") Long userId, @Param("limit") int limit);

    /** Most-discussed topic first — backs GET /api/career/ai/chat/insights. */
    List<TopicCount> topicCountsForUser(@Param("userId") Long userId);

    /** Same, but across every student — backs Admin 통계. */
    List<TopicCount> topicCountsAll();
}
