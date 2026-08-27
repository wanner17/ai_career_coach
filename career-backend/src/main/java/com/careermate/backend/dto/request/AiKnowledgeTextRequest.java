package com.careermate.backend.dto.request;

import jakarta.validation.constraints.NotBlank;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Body for POST /api/admin/ai-knowledge/text — 관리자가 직접 붙여넣은 텍스트를 ACE 지식베이스에 임베딩. */
@Getter
@Setter
@NoArgsConstructor
public class AiKnowledgeTextRequest {

    @NotBlank
    private String content;

    /** ACE 쪽 메타데이터의 category — 선택, 관리자가 구분용으로 적는 값 (예: "학사공지", "취업지원센터"). */
    private String category;
}
