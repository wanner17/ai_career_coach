package com.careermate.backend.security;

import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

/**
 * Deliberately simple: one HS256-signed token per login, long-ish expiry, no
 * refresh token, no revocation list. Enough to stop `userId` being a caller-
 * supplied request param (the actual problem this pass fixes) without
 * building session infrastructure this MVP doesn't need yet.
 */
@Component
public class JwtService {

    private final SecretKey key;
    private final long expirationMillis;

    public JwtService(
            @Value("${career-mate.jwt.secret}") String secret,
            @Value("${career-mate.jwt.expiration-days:7}") long expirationDays) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes());
        this.expirationMillis = expirationDays * 24 * 60 * 60 * 1000;
    }

    public String generateToken(Long userId) {
        Date now = new Date();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expirationMillis))
                .signWith(key)
                .compact();
    }

    /** Returns the userId claim, or null if the token is missing/expired/invalid. */
    public Long validateAndGetUserId(String token) {
        try {
            Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
            return Long.valueOf(claims.getSubject());
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }
}
