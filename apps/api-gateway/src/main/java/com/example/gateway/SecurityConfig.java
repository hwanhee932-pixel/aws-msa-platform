package com.example.gateway;

import java.util.Base64;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusReactiveJwtDecoder;
import org.springframework.security.oauth2.jwt.ReactiveJwtDecoder;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.security.web.server.context.NoOpServerSecurityContextRepository;

@Configuration
public class SecurityConfig {

    @Bean
    ReactiveJwtDecoder jwtDecoder(
            @Value("${app.jwt.secret}") String secret) {

        byte[] bytes = Base64.getDecoder().decode(secret);

        if (bytes.length < 64) {
            throw new IllegalArgumentException(
                "JWT_SECRET must contain at least 64 decoded bytes"
            );
        }

        var key = new SecretKeySpec(bytes, "HmacSHA512");

        var decoder = NimbusReactiveJwtDecoder
            .withSecretKey(key)
            .macAlgorithm(MacAlgorithm.HS512)
            .build();

        decoder.setJwtValidator(
            JwtValidators.createDefault()
        );

        return decoder;
    }

    @Bean
    SecurityWebFilterChain securityWebFilterChain(
            ServerHttpSecurity http) {

        return http
            .csrf(ServerHttpSecurity.CsrfSpec::disable)
            .httpBasic(ServerHttpSecurity.HttpBasicSpec::disable)
            .formLogin(ServerHttpSecurity.FormLoginSpec::disable)

            .securityContextRepository(
                NoOpServerSecurityContextRepository.getInstance()
            )

            .authorizeExchange(auth -> auth

                // 회원가입 / 로그인은 인증 없이 허용
                .pathMatchers(
                    HttpMethod.POST,
                    "/api/v1/auth/signup",
                    "/api/v1/auth/login"
                ).permitAll()

                // 상품 목록 / 상품 상세 조회는 인증 없이 허용
                .pathMatchers(
                    HttpMethod.GET,
                    "/api/v1/products",
                    "/api/v1/products/**"
                ).permitAll()

                // Kubernetes Health Check 허용
                .pathMatchers(
                    HttpMethod.GET,
                    "/actuator/health",
                    "/actuator/health/liveness",
                    "/actuator/health/readiness"
                ).permitAll()

                // 그 외 actuator 접근 차단
                .pathMatchers("/actuator/**").denyAll()

                // 나머지 API는 JWT 인증 필요
                .pathMatchers("/api/v1/**").authenticated()

                // 그 외 모든 요청 차단
                .anyExchange().denyAll()
            )

            .oauth2ResourceServer(oauth ->
                oauth.jwt(Customizer.withDefaults())
            )

            .build();
    }
}