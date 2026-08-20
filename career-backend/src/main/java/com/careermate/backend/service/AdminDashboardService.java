package com.careermate.backend.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.careermate.backend.domain.StudentUser;
import com.careermate.backend.dto.response.AdminDashboardResponse;
import com.careermate.backend.mapper.QuestMapper;
import com.careermate.backend.mapper.UserMapper;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AdminDashboardService {

    private static final int RECENT_LIMIT = 6;

    private final UserMapper userMapper;
    private final QuestMapper questMapper;

    public AdminDashboardResponse getDashboard() {
        List<StudentUser> students = userMapper.findAll(); // already newest-first (see UserMapper#findAll)
        int studentCount = students.size();
        double avgLevel = studentCount == 0 ? 0.0 : students.stream().mapToInt(StudentUser::getLevel).average().orElse(0.0);

        List<AdminDashboardResponse.RecentStudent> recentStudents = students.stream()
                .limit(RECENT_LIMIT)
                .map(s -> AdminDashboardResponse.RecentStudent.builder()
                        .name(s.getName())
                        .universityCode(s.getUniversityCode())
                        .level(s.getLevel())
                        .createdAt(s.getCreatedAt())
                        .build())
                .toList();

        return AdminDashboardResponse.builder()
                .studentCount(studentCount)
                .avgLevel(avgLevel)
                .totalCompletedQuests(questMapper.totalCompletedCount())
                .recentStudents(recentStudents)
                .recentActivity(questMapper.recentCompletions(RECENT_LIMIT))
                .build();
    }
}
