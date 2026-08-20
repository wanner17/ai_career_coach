package com.careermate.backend.dto.request;

import jakarta.validation.constraints.NotBlank;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Body for PUT /api/career/user/me/avatar. */
@Getter
@Setter
@NoArgsConstructor
public class UpdateAvatarRequest {

    @NotBlank
    private String avatarFrame;

    // null/blank = no sticker
    private String avatarSticker;
}
