package com.careermate.backend.service;

import java.util.List;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.careermate.backend.domain.Badge;
import com.careermate.backend.dto.request.BadgeUpsertRequest;
import com.careermate.backend.dto.response.AdminBadgeResponse;
import com.careermate.backend.exception.NotFoundException;
import com.careermate.backend.mapper.BadgeMapper;

import lombok.RequiredArgsConstructor;

/** Backs the Admin Badge 관리 screen — same `badge` table students read from. */
@Service
@RequiredArgsConstructor
public class AdminBadgeService {

    private final BadgeMapper badgeMapper;

    public List<AdminBadgeResponse> getAllBadges() {
        return badgeMapper.findAllCatalog().stream()
                .map(AdminBadgeResponse::from)
                .toList();
    }

    @Transactional
    public AdminBadgeResponse createBadge(BadgeUpsertRequest request) {
        Badge badge = toBadge(null, request);
        badgeMapper.insert(badge);
        return AdminBadgeResponse.from(badgeMapper.findById(badge.getId()));
    }

    @Transactional
    public AdminBadgeResponse updateBadge(Long id, BadgeUpsertRequest request) {
        requireExists(id);
        badgeMapper.update(toBadge(id, request));
        return AdminBadgeResponse.from(badgeMapper.findById(id));
    }

    @Transactional
    public void deleteBadge(Long id) {
        requireExists(id);
        try {
            badgeMapper.deleteById(id);
        } catch (DataIntegrityViolationException e) {
            // careermate_user_badge has no ON DELETE CASCADE on purpose — a
            // grant history shouldn't silently vanish because an admin
            // deleted the badge definition.
            throw new IllegalArgumentException("이미 학생에게 지급된 배지는 삭제할 수 없습니다.");
        }
    }

    private Badge toBadge(Long id, BadgeUpsertRequest request) {
        boolean isLevel = "LEVEL".equals(request.getUnlockType());
        return Badge.builder()
                .id(id)
                .name(request.getName())
                .unlockType(request.getUnlockType())
                .unlockValue(isLevel ? request.getUnlockValue() : null)
                .icon(request.getIcon())
                .medalClass(request.getMedalClass())
                .build();
    }

    private void requireExists(Long id) {
        if (badgeMapper.findById(id) == null) {
            throw new NotFoundException("배지를 찾을 수 없습니다: " + id);
        }
    }
}
