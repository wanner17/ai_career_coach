package com.careermate.backend.security;

import java.io.IOException;

import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

/**
 * Reads `Authorization: Bearer <token>`, and on success sets the SecurityContext
 * principal to the userId (a Long, not a User object — controllers pull it via
 * `@AuthenticationPrincipal Long userId`, see AuthUtil doc comment). No token or
 * an invalid one just leaves the context unauthenticated — the actual 401 is
 * decided by SecurityConfig's authorizeHttpRequests rules, not here.
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")) {
            Long userId = jwtService.validateAndGetUserId(header.substring(7));
            if (userId != null) {
                var authentication = new UsernamePasswordAuthenticationToken(userId, null, java.util.List.of());
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        }

        filterChain.doFilter(request, response);
    }

    /**
     * OncePerRequestFilter's default (true) skips this filter on the ASYNC
     * dispatch that resumes an SseEmitter-backed request (AiChatController's
     * /chat/stream) — so the JWT-derived SecurityContext set above during the
     * original REQUEST dispatch never gets re-established for that
     * continuation, and SecurityConfig's anyRequest().authenticated() then
     * denies it as unauthenticated. Re-running this filter on ASYNC dispatch
     * is safe (it's stateless — just re-reads the same header again).
     */
    @Override
    protected boolean shouldNotFilterAsyncDispatch() {
        return false;
    }
}
