package com.careermate.backend.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.careermate.backend.domain.SkillScore;
import com.careermate.backend.domain.StudentUser;
import com.careermate.backend.dto.request.CompleteSignupRequest;
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
 * trust (universityCode, externalUserId). No password anywhere in this flow.
 *
 * A StudentUser row is only ever created by completeSignup() — i.e. once the
 * student has actually picked a nickname/avatar and pressed 시작하기 on the
 * onboarding screen (see OnboardingScreen.jsx). identify() itself never
 * provisions anything: for an unrecognized (universityCode, externalUserId)
 * pair it just reports newUser=true with no token, and the frontend holds
 * that pair through the onboarding screen to submit with completeSignup().
 * This means closing the tab mid-onboarding leaves no half-set-up row behind
 * at all — nothing to clean up, nothing to re-detect on a later visit.
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private static final int STARTING_LEVEL = 1;
    private static final int STARTING_EXP = 0;

    private final UserMapper userMapper;
    private final SkillMapper skillMapper;
    private final JwtService jwtService;

    public IdentifyResponse identify(IdentifyRequest request) {
        StudentUser user = userMapper.findByExternalUser(request.getUniversityCode(), request.getExternalUserId());
        if (user == null) {
            // No row, no token — see class javadoc. The frontend shows the
            // onboarding screen and calls completeSignup() to actually create it.
            return IdentifyResponse.builder().newUser(true).build();
        }

        return IdentifyResponse.builder()
                .token(jwtService.generateToken(user.getId()))
                .user(UserResponse.from(user))
                .newUser(false)
                .build();
    }

    /** Onboarding screen's submit — the only path that ever creates a StudentUser row. */
    @Transactional
    public IdentifyResponse completeSignup(CompleteSignupRequest request) {
        // Guard against a double-submit (e.g. two tabs open, or a retried request
        // after a dropped response) provisioning the same student twice.
        StudentUser user = userMapper.findByExternalUser(request.getUniversityCode(), request.getExternalUserId());
        if (user == null) {
            user = provisionNewStudent(request);
        }

        return IdentifyResponse.builder()
                .token(jwtService.generateToken(user.getId()))
                .user(UserResponse.from(user))
                .newUser(false)
                .build();
    }

    private StudentUser provisionNewStudent(CompleteSignupRequest request) {
        StudentUser newUser = StudentUser.builder()
                .universityCode(request.getUniversityCode())
                .externalUserId(request.getExternalUserId())
                .name(request.getName())
                .avatarGender(request.getAvatarGender())
                .grade(1)
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
