package com.careermate.backend.controller;

import java.util.List;
import java.util.Map;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.careermate.backend.dto.request.AiKnowledgeTextRequest;
import com.careermate.backend.service.AceService;

import lombok.RequiredArgsConstructor;

/**
 * 관리자가 AI 상담(AiChatService의 search_school_docs 도구)이 참고할 취업지원센터
 * 자료를 ACE 지식베이스(RAG)에 등록/조회/삭제하는 화면용 API. ACE 자체 인증/버킷
 * 관리는 AceService가 맡고, 여기선 그 결과를 그대로 REST로 얇게 노출한다.
 *
 * /api/admin/** 전체가 아직 관리자 인증이 없는 상태라(SecurityConfig 참고, 알려진
 * 갭) 여기도 같은 상태 — 이 컨트롤러만 따로 잠그지 않는다.
 */
@RestController
@RequestMapping("/api/admin/ai-knowledge")
@RequiredArgsConstructor
public class AdminAiKnowledgeController {

    private final AceService aceService;

    /** 화면 진입 시 "ACE 연동이 설정돼 있는지"부터 확인 — 안 돼 있으면 업로드 폼 대신 안내만 보여준다. */
    @GetMapping("/status")
    public Map<String, Object> status() {
        return Map.of("configured", aceService.isConfigured());
    }

    @PostMapping(value = "/documents", consumes = "multipart/form-data")
    public AceService.AceEmbedResult uploadDocument(@RequestParam("file") MultipartFile file) {
        return aceService.uploadFile(file);
    }

    @PostMapping("/text")
    public AceService.AceEmbedResult embedText(@Valid @RequestBody AiKnowledgeTextRequest request) {
        return aceService.embedText(request.getContent(), request.getCategory());
    }

    @GetMapping("/documents")
    public List<Map<String, Object>> listDocuments(@RequestParam(defaultValue = "50") int limit) {
        return aceService.listEmbeddingLogs(limit);
    }

    @DeleteMapping("/documents/{sourceId}")
    public ResponseEntity<Void> deleteDocument(@PathVariable String sourceId) {
        aceService.deleteBySourceId(sourceId);
        return ResponseEntity.noContent().build();
    }
}
