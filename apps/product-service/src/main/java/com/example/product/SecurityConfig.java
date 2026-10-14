package com.example.product;

import java.util.Base64;
import javax.crypto.spec.SecretKeySpec;
import jakarta.servlet.DispatcherType;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    JwtDecoder jwtDecoder(
            @Value("${app.jwt.secret}") String secret) {

        byte[] bytes = Base64.getDecoder().decode(secret);

        if (bytes.length < 64) {
            throw new IllegalArgumentException(
                "JWT_SECRET must contain at least 64 decoded bytes"
            );
        }

        var key = new SecretKeySpec(
            bytes,
            "HmacSHA512"
        );

        var decoder = NimbusJwtDecoder
            .withSecretKey(key)
            .macAlgorithm(MacAlgorithm.HS512)
            .build();

        decoder.setJwtValidator(
            JwtValidators.createDefault()
        );

        return decoder;
    }

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http)
            throws Exception {

        return http

            // REST API이므로 CSRF 비활성화
            .csrf(csrf -> csrf.disable())

            // Basic / Form Login 사용 안 함
            .httpBasic(basic -> basic.disable())
            .formLogin(form -> form.disable())

            // JWT 기반 Stateless 인증
            .sessionManagement(session -> session
                .sessionCreationPolicy(
                    SessionCreationPolicy.STATELESS
                )
            )

            .authorizeHttpRequests(auth -> auth

                // Spring 내부 ERROR Dispatcher 허용
                .dispatcherTypeMatchers(
                    DispatcherType.ERROR
                ).permitAll()

                // Health Check 공개
                .requestMatchers(
                    HttpMethod.GET,
                    "/actuator/health",
                    "/actuator/health/liveness",
                    "/actuator/health/readiness"
                ).permitAll()

                // 상품 목록 조회 공개
                .requestMatchers(
                    HttpMethod.GET,
                    "/api/v1/products"
                ).permitAll()

                // 상품 상세 조회 공개
                .requestMatchers(
                    HttpMethod.GET,
                    "/api/v1/products/*"
                ).permitAll()

                // 나머지 actuator 접근 차단
                .requestMatchers(
                    "/actuator/**"
                ).denyAll()

                // 상품 등록 / 수정 / 삭제 /
                // 이미지 Presigned URL 발급 등은 JWT 필요
                .requestMatchers(
                    "/api/v1/products/**"
                ).authenticated()

                // 그 외 요청 차단
                .anyRequest().denyAll()
            )

            // JWT Resource Server
            .oauth2ResourceServer(oauth ->
                oauth.jwt(Customizer.withDefaults())
            )

            .build();
    }
}