package com.careermate.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Body for POST /api/career/ai/chat. userId comes from the JWT, not the body. */
@Getter
@Setter
@NoArgsConstructor
public class AiChatRequest {

    @NotBlank
    @Size(max = 2000)
    private String message;
}
