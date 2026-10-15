package com.example.product;

import java.nio.charset.StandardCharsets;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Bean
    public JwtDecoder jwtDecoder() {

        SecretKey key = new SecretKeySpec(
            jwtSecret.getBytes(StandardCharsets.UTF_8),
            "HmacSHA512"
        );

        return NimbusJwtDecoder
            .withSecretKey(key)
            .macAlgorithm(
                org.springframework.security.oauth2.jose.jws.MacAlgorithm.HS512
            )
            .build();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http)
        throws Exception {

        http
            .csrf(csrf -> csrf.disable())

            .cors(Customizer.withDefaults())

            .sessionManagement(session ->
                session.sessionCreationPolicy(
                    SessionCreationPolicy.STATELESS
                )
            )

            .authorizeHttpRequests(auth -> auth

                // Kubernetes Health Check 허용
                .requestMatchers(
                    HttpMethod.GET,
                    "/actuator/health",
                    "/actuator/health/liveness",
                    "/actuator/health/readiness"
                ).permitAll()

                // Prometheus Metrics 허용
                .requestMatchers(
                    HttpMethod.GET,
                    "/actuator/prometheus"
                ).permitAll()

                // 상품 목록 / 상세 조회 공개
                .requestMatchers(
                    HttpMethod.GET,
                    "/api/v1/products",
                    "/api/v1/products/*"
                ).permitAll()

                // 나머지 Actuator 접근 차단
                .requestMatchers(
                    "/actuator/**"
                ).denyAll()

                // 상품 등록 / 수정 / 삭제 / 이미지 Presigned URL
                // 로그인한 사용자만 허용
                .requestMatchers(
                    "/api/v1/products/**"
                ).authenticated()

                // 그 외 모든 요청 차단
                .anyRequest().denyAll()
            )

            .oauth2ResourceServer(oauth2 ->
                oauth2.jwt(Customizer.withDefaults())
            );

        return http.build();
    }
}