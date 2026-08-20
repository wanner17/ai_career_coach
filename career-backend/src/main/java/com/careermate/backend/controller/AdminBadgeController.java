package com.careermate.backend.controller;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.careermate.backend.dto.request.BadgeUpsertRequest;
import com.careermate.backend.dto.response.AdminBadgeResponse;
import com.careermate.backend.service.AdminBadgeService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin/badges")
@RequiredArgsConstructor
public class AdminBadgeController {

    private final AdminBadgeService adminBadgeService;

    @GetMapping
    public List<AdminBadgeResponse> getAllBadges() {
        return adminBadgeService.getAllBadges();
    }

    @PostMapping
    public ResponseEntity<AdminBadgeResponse> createBadge(@Valid @RequestBody BadgeUpsertRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminBadgeService.createBadge(request));
    }

    @PutMapping("/{id}")
    public AdminBadgeResponse updateBadge(@PathVariable Long id, @Valid @RequestBody BadgeUpsertRequest request) {
        return adminBadgeService.updateBadge(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBadge(@PathVariable Long id) {
        adminBadgeService.deleteBadge(id);
        return ResponseEntity.noContent().build();
    }
}
