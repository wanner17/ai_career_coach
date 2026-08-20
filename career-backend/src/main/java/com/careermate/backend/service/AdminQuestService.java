package com.careermate.backend.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.careermate.backend.domain.Quest;
import com.careermate.backend.dto.request.QuestUpsertRequest;
import com.careermate.backend.dto.response.AdminQuestResponse;
import com.careermate.backend.exception.NotFoundException;
import com.careermate.backend.mapper.QuestMapper;

import lombok.RequiredArgsConstructor;

/** Backs the Admin Quest 관리 screen — same `quest` table students read from. */
@Service
@RequiredArgsConstructor
public class AdminQuestService {

    private final QuestMapper questMapper;

    public List<AdminQuestResponse> getAllQuests() {
        return questMapper.findAllCatalog().stream()
                .map(AdminQuestResponse::from)
                .toList();
    }

    @Transactional
    public AdminQuestResponse createQuest(QuestUpsertRequest request) {
        Quest quest = Quest.builder()
                .name(request.getName())
                .description(request.getDescription())
                .category(request.getCategory())
                .targetGrade(request.getTarget())
                .exp(request.getExp())
                .period(request.getPeriod())
                .status(request.getStatus())
                .build();
        questMapper.insert(quest);
        return AdminQuestResponse.from(questMapper.findById(quest.getId()));
    }

    @Transactional
    public AdminQuestResponse updateQuest(Long id, QuestUpsertRequest request) {
        requireExists(id);
        Quest quest = Quest.builder()
                .id(id)
                .name(request.getName())
                .description(request.getDescription())
                .category(request.getCategory())
                .targetGrade(request.getTarget())
                .exp(request.getExp())
                .period(request.getPeriod())
                .status(request.getStatus())
                .build();
        questMapper.update(quest);
        return AdminQuestResponse.from(questMapper.findById(id));
    }

    @Transactional
    public void deleteQuest(Long id) {
        requireExists(id);
        questMapper.deleteById(id);
    }

    private void requireExists(Long id) {
        if (questMapper.findById(id) == null) {
            throw new NotFoundException("퀘스트를 찾을 수 없습니다: " + id);
        }
    }
}
