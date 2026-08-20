package com.careermate.backend.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.careermate.backend.domain.Quest;
import com.careermate.backend.domain.SkillScore;
import com.careermate.backend.domain.StudentUser;
import com.careermate.backend.dto.response.AdminStudentResponse;
import com.careermate.backend.dto.response.SkillResponse;
import com.careermate.backend.mapper.QuestMapper;
import com.careermate.backend.mapper.SkillMapper;
import com.careermate.backend.mapper.UserMapper;

import lombok.RequiredArgsConstructor;

/**
 * Backs Admin 학생관리 — read-only roster across every university (this
 * console isn't scoped per-university anywhere else either, e.g. Admin
 * Quest 관리 lists every quest globally too). Search/filter stays
 * client-side on the small MVP dataset, same as AdminQuestService/
 * AdminQuest.jsx.
 */
@Service
@RequiredArgsConstructor
public class AdminStudentService {

    private final UserMapper userMapper;
    private final SkillMapper skillMapper;
    private final QuestMapper questMapper;

    public List<AdminStudentResponse> getAllStudents() {
        return userMapper.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    private AdminStudentResponse toResponse(StudentUser user) {
        SkillScore skillScore = skillMapper.findByUserId(user.getId());
        List<Quest> quests = questMapper.findAllForUser(user.getId());
        long completed = quests.stream().filter(q -> Boolean.TRUE.equals(q.getCompleted())).count();

        return AdminStudentResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .universityCode(user.getUniversityCode())
                .major(user.getMajor())
                .grade(user.getGrade())
                .desiredJob(user.getDesiredJob())
                .level(user.getLevel())
                .currentExp(user.getCurrentExp())
                .nextLevelExp(user.getNextLevelExp())
                .skills(skillScore == null ? null : SkillResponse.from(skillScore))
                .questsCompleted((int) completed)
                .questsTotal(quests.size())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
