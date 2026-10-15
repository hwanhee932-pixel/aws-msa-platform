package com.example.order;

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
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    /*
     * Member Service가 발급한 JWT와
     * 동일한 JWT_SECRET + HS512 방식으로 검증
     */
    @Bean
    JwtDecoder jwtDecoder(
            @Value("${app.jwt.secret}") String secret) {

        byte[] bytes = Base64.getDecoder().decode(secret);

        if (bytes.length < 64) {
            throw new IllegalArgumentException(
                "JWT_SECRET must contain at least 64 decoded bytes"
            );
        }

        var key = new SecretKeySpec(bytes, "HmacSHA512");

        var decoder = NimbusJwtDecoder
            .withSecretKey(key)
            .macAlgorithm(MacAlgorithm.HS512)
            .build();

        decoder.setJwtValidator(
            JwtValidators.createDefault()
        );

        return decoder;
    }


    /*
     * Order Service 보안 설정
     */
    @Bean
    SecurityFilterChain filterChain(HttpSecurity http)
            throws Exception {

        return http

            // REST API이므로 CSRF 사용 안 함
            .csrf(csrf -> csrf.disable())

            // Basic 인증 사용 안 함
            .httpBasic(basic -> basic.disable())

            // Form Login 사용 안 함
            .formLogin(form -> form.disable())

            // JWT 기반 Stateless
            .sessionManagement(session ->
                session.sessionCreationPolicy(
                    SessionCreationPolicy.STATELESS
                )
            )

            .authorizeHttpRequests(auth -> auth

                // Spring 내부 ERROR dispatch 허용
                .dispatcherTypeMatchers(
                    DispatcherType.ERROR
                ).permitAll()

                // Kubernetes Health Check 허용
                .requestMatchers(
                    HttpMethod.GET,
                    "/actuator/health",
                    "/actuator/health/liveness",
                    "/actuator/health/readiness"
                ).permitAll()

                // 나머지 actuator 접근 차단
                .requestMatchers(
                    "/actuator/**"
                ).denyAll()

                // 주문 API는 로그인 필수
                .requestMatchers(
                    "/api/v1/orders/**"
                ).authenticated()

                // 그 외 요청 차단
                .anyRequest().denyAll()
            )

            // Authorization: Bearer JWT 검증
            .oauth2ResourceServer(oauth ->
                oauth.jwt(Customizer.withDefaults())
            )

            .build();
    }
}