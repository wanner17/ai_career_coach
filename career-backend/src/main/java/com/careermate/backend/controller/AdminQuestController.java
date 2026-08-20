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

import com.careermate.backend.dto.request.QuestUpsertRequest;
import com.careermate.backend.dto.response.AdminQuestResponse;
import com.careermate.backend.service.AdminQuestService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin/quests")
@RequiredArgsConstructor
public class AdminQuestController {

    private final AdminQuestService adminQuestService;

    @GetMapping
    public List<AdminQuestResponse> getAllQuests() {
        return adminQuestService.getAllQuests();
    }

    @PostMapping
    public ResponseEntity<AdminQuestResponse> createQuest(@Valid @RequestBody QuestUpsertRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminQuestService.createQuest(request));
    }

    @PutMapping("/{id}")
    public AdminQuestResponse updateQuest(@PathVariable Long id, @Valid @RequestBody QuestUpsertRequest request) {
        return adminQuestService.updateQuest(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteQuest(@PathVariable Long id) {
        adminQuestService.deleteQuest(id);
        return ResponseEntity.noContent().build();
    }
}
