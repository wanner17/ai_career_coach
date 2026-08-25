package com.careermate.backend.config;

import java.util.List;

import jakarta.servlet.DispatcherType;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.careermate.backend.security.JwtAuthenticationFilter;

import lombok.RequiredArgsConstructor;

/**
 * Stateless JWT auth. /api/auth/** (identify) and /api/career/university/**
 * (theme lookup, no user data) are public; everything else under
 * /api/career/** requires a valid token. /api/admin/** is intentionally left
 * open in this pass — see career-backend/README.md "인증 범위" for why that's
 * a known gap, not an oversight.
 */
@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Value("${career-mate.allowed-origins:http://localhost:5173}")
    private String[] allowedOrigins;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // Spring Security's default entry point returns 403 for a missing/invalid
                // token (only 401 for a specific set of auth failures) — 401 is the
                // correct code for "not authenticated at all", so make that explicit.
                .exceptionHandling(ex -> ex.authenticationEntryPoint(
                        (request, response, authException) -> response.sendError(HttpStatus.UNAUTHORIZED.value())))
                .authorizeHttpRequests(auth -> auth
                        // Tomcat re-dispatches to /error (as an ERROR-type request) whenever a
                        // request throws mid-handling — e.g. the AI chat stream's SseEmitter
                        // failing partway through. Without this, that dispatch is itself
                        // subject to the .anyRequest().authenticated() rule below, gets
                        // rejected, and its AccessDeniedException masks whatever the real
                        // underlying exception was in the server log.
                        .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll() // CORS preflight carries no auth header
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/api/career/university/**").permitAll()
                        .requestMatchers("/api/admin/**").permitAll() // known gap — see class javadoc
                        .anyRequest().authenticated())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    private CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(allowedOrigins));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
