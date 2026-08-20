package com.careermate.backend.service;

import java.util.List;
import java.util.Map;
import java.util.function.ToIntFunction;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.careermate.backend.domain.Quest;
import com.careermate.backend.domain.QuestCompletionCount;
import com.careermate.backend.domain.SkillScore;
import com.careermate.backend.domain.StudentUser;
import com.careermate.backend.dto.response.AdminStatsResponse;
import com.careermate.backend.dto.response.SkillResponse;
import com.careermate.backend.mapper.ChatLogMapper;
import com.careermate.backend.mapper.QuestMapper;
import com.careermate.backend.mapper.SkillMapper;
import com.careermate.backend.mapper.UserMapper;

import lombok.RequiredArgsConstructor;

/**
 * Backs Admin 통계 — every number here is computed fresh from the same
 * tables the student-facing screens read (careermate_student_user,
 * careermate_skill_score, careermate_user_quest, careermate_ai_chat_log),
 * not a separate reporting table. Fine at MVP scale; would need real
 * aggregation queries (not "fetch everything, average in Java") once the
 * student count stops being small.
 */
@Service
@RequiredArgsConstructor
public class AdminStatsService {

    private final UserMapper userMapper;
    private final SkillMapper skillMapper;
    private final QuestMapper questMapper;
    private final ChatLogMapper chatLogMapper;

    public AdminStatsResponse getStats() {
        List<StudentUser> students = userMapper.findAll();
        int studentCount = students.size();

        List<SkillScore> skills = skillMapper.findAll();

        List<Quest> quests = questMapper.findAllCatalog();
        Map<Long, Integer> completionByQuest = questMapper.completionCounts().stream()
                .collect(Collectors.toMap(QuestCompletionCount::getQuestId, QuestCompletionCount::getCount));

        List<AdminStatsResponse.QuestCompletionStat> questCompletion = quests.stream()
                .map(q -> {
                    int completed = completionByQuest.getOrDefault(q.getId(), 0);
                    return AdminStatsResponse.QuestCompletionStat.builder()
                            .questId(q.getId())
                            .title(q.getName())
                            .completedCount(completed)
                            .rate(studentCount == 0 ? 0.0 : (double) completed / studentCount)
                            .build();
                })
                .toList();

        return AdminStatsResponse.builder()
                .studentCount(studentCount)
                .avgLevel(average(students, StudentUser::getLevel))
                .avgExp(average(students, StudentUser::getCurrentExp))
                .avgSkills(SkillResponse.builder()
                        .jobSkill(roundAverage(skills, SkillScore::getJobSkill))
                        .resume(roundAverage(skills, SkillScore::getResume))
                        .interview(roundAverage(skills, SkillScore::getInterview))
                        .companyAnalysis(roundAverage(skills, SkillScore::getCompanyAnalysis))
                        .careerReadiness(roundAverage(skills, SkillScore::getCareerReadiness))
                        .build())
                .questCompletion(questCompletion)
                .topicDistribution(chatLogMapper.topicCountsAll())
                .build();
    }

    private <T> double average(List<T> items, ToIntFunction<T> extractor) {
        return items.isEmpty() ? 0.0 : items.stream().mapToInt(extractor).average().orElse(0.0);
    }

    private <T> int roundAverage(List<T> items, ToIntFunction<T> extractor) {
        return (int) Math.round(average(items, extractor));
    }
}
