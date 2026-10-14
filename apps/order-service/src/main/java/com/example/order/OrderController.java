package com.example.order;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {

    private final OrderRepository repo;

    OrderController(OrderRepository repo) {
        this.repo = repo;
    }

    record Create(
        @NotNull Long memberId,
        @NotNull Long productId,
        @Min(1) Integer quantity
    ) {}

    @PostMapping
    ResponseEntity<CustomerOrder> create(
        @Valid @RequestBody Create request
    ) {
        CustomerOrder order = new CustomerOrder(
            request.memberId(),
            request.productId(),
            request.quantity()
        );

        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(repo.save(order));
    }

    @GetMapping
    List<CustomerOrder> list(
        @RequestParam Long memberId
    ) {
        return repo.findByMemberId(memberId);
    }

    @GetMapping("/{id}")
    CustomerOrder get(
        @PathVariable Long id
    ) {
        return repo.findById(id)
            .orElseThrow();
    }
}