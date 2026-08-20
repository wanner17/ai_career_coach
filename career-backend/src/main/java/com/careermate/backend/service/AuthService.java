package com.careermate.backend.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.careermate.backend.domain.SkillScore;
import com.careermate.backend.domain.StudentUser;
import com.careermate.backend.dto.request.IdentifyRequest;
import com.careermate.backend.dto.response.IdentifyResponse;
import com.careermate.backend.dto.response.UserResponse;
import com.careermate.backend.mapper.SkillMapper;
import com.careermate.backend.mapper.UserMapper;
import com.careermate.backend.security.JwtService;

import lombok.RequiredArgsConstructor;

/**
 * "Login" for this widget is really "identify" — the host university page
 * already authenticated the student before it ever loaded our iframe, so we
 * trust (universityCode, externalUserId) and either load that student's
 * existing row or provision a fresh one. No password anywhere in this flow.
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private static final int STARTING_LEVEL = 1;
    private static final int STARTING_EXP = 0;

    private final UserMapper userMapper;
    private final SkillMapper skillMapper;
    private final JwtService jwtService;

    @Transactional
    public IdentifyResponse identify(IdentifyRequest request) {
        StudentUser user = userMapper.findByExternalUser(request.getUniversityCode(), request.getExternalUserId());
        boolean isNewUser = user == null;

        if (isNewUser) {
            user = provisionNewStudent(request);
        }

        String token = jwtService.generateToken(user.getId());
        return IdentifyResponse.builder()
                .token(token)
                .user(UserResponse.from(user))
                .newUser(isNewUser)
                .build();
    }

    private StudentUser provisionNewStudent(IdentifyRequest request) {
        StudentUser newUser = StudentUser.builder()
                .universityCode(request.getUniversityCode())
                .externalUserId(request.getExternalUserId())
                .name(request.getName() != null ? request.getName() : "새로운 학생")
                .major(request.getMajor())
                .grade(request.getGrade() != null ? request.getGrade() : 1)
                .desiredJob(request.getDesiredJob())
                .level(STARTING_LEVEL)
                .currentExp(STARTING_EXP)
                .nextLevelExp(STARTING_LEVEL * 250)
                .build();
        userMapper.insert(newUser); // populates newUser.id via useGeneratedKeys

        skillMapper.insert(SkillScore.builder()
                .userId(newUser.getId())
                .jobSkill(0).resume(0).interview(0).companyAnalysis(0).careerReadiness(0)
                .build());

        return userMapper.findById(newUser.getId());
    }
}
