package com.careermate.backend.exception;

import org.springframework.http.HttpStatus;

import lombok.Getter;

/**
 * An outside API this backend calls (currently: OpenAI, for essay review —
 * see EssayReviewService) is unreachable, unconfigured, or returned
 * something we can't use. Separate from NotFoundException/
 * IllegalArgumentException (both 4xx, both about the caller's own request)
 * since this is about an upstream dependency, not the request itself.
 */
@Getter
public class ExternalServiceException extends RuntimeException {
    private final HttpStatus status;

    public ExternalServiceException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }
}
