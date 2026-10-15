package com.example.order;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {

    private final OrderRepository repo;

    public OrderController(OrderRepository repo) {
        this.repo = repo;
    }

    /*
     * =========================================================
     * 주문 생성 Request DTO
     *
     * memberId는 프론트에서 받지 않음
     * JWT subject에서 로그인 회원 ID를 가져옴
     * =========================================================
     */
    public record CreateRequest(

        @NotNull
        Long productId,

        @NotNull
        @Min(1)
        Integer quantity

    ) {}


    /*
     * =========================================================
     * 주문 생성
     * POST /api/v1/orders
     * =========================================================
     */
    @PostMapping
    public ResponseEntity<CustomerOrder> create(

            @AuthenticationPrincipal
            Jwt jwt,

            @Valid
            @RequestBody
            CreateRequest request) {

        /*
         * JWT에서 로그인 회원 ID 추출
         */
        Long memberId = memberId(jwt);


        /*
         * 주문 객체 생성
         */
        CustomerOrder order = new CustomerOrder(

            memberId,

            request.productId(),

            request.quantity()
        );


        /*
         * order_db 저장
         */
        CustomerOrder savedOrder =
            repo.save(order);


        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(savedOrder);
    }


    /*
     * =========================================================
     * 내 주문 목록 조회
     * GET /api/v1/orders
     *
     * memberId를 Query Parameter로 받지 않음
     * JWT에서 로그인 회원 ID 자동 확인
     * =========================================================
     */
    @GetMapping
    public List<CustomerOrder> list(

            @AuthenticationPrincipal
            Jwt jwt) {

        Long memberId = memberId(jwt);

        return repo.findByMemberId(memberId);
    }


    /*
     * =========================================================
     * 주문 단건 조회
     * GET /api/v1/orders/{id}
     *
     * 자기 주문만 조회 가능
     * =========================================================
     */
    @GetMapping("/{id}")
    public CustomerOrder get(

            @PathVariable
            Long id,

            @AuthenticationPrincipal
            Jwt jwt) {

        Long memberId = memberId(jwt);


        CustomerOrder order =
            repo.findById(id)
                .orElseThrow(() ->

                    new ResponseStatusException(

                        HttpStatus.NOT_FOUND,

                        "Order not found"
                    )
                );


        /*
         * 다른 회원의 주문 조회 방지
         */
        if (!order.getMemberId().equals(memberId)) {

            throw new ResponseStatusException(

                HttpStatus.FORBIDDEN,

                "You cannot access this order"
            );
        }


        return order;
    }


    /*
     * =========================================================
     * JWT → Member ID
     * =========================================================
     */
    private Long memberId(
            Jwt jwt) {

        /*
         * 인증되지 않은 사용자
         */
        if (jwt == null) {

            throw new ResponseStatusException(

                HttpStatus.UNAUTHORIZED,

                "Authentication required"
            );
        }


        try {

            /*
             * 로그인할 때 생성된 JWT의 subject가
             * Member ID
             */
            Long id =
                Long.valueOf(
                    jwt.getSubject()
                );


            if (id <= 0) {

                throw new NumberFormatException();
            }


            return id;


        } catch (NumberFormatException exception) {

            throw new ResponseStatusException(

                HttpStatus.UNAUTHORIZED,

                "Invalid member identity"
            );
        }
    }
}