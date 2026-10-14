package com.example.product;

import java.math.BigDecimal;
import jakarta.persistence.*;

@Entity
@Table(name = "products")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "owner_id", nullable = false)
    private Long ownerId;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal price;

    @Column(length = 2000)
    private String description;

    @Column(name = "image_key", length = 512)
    private String imageKey;

    protected Product() {}

    public Product(Long ownerId, String name, BigDecimal price,
                   String description, String imageKey) {
        this.ownerId = ownerId;
        update(name, price, description, imageKey);
    }

    public void update(String name, BigDecimal price,
                       String description, String imageKey) {
        this.name = name;
        this.price = price;
        this.description = description;
        this.imageKey = imageKey;
    }

    public Long getId() { return id; }
    public Long getOwnerId() { return ownerId; }
    public String getName() { return name; }
    public BigDecimal getPrice() { return price; }
    public String getDescription() { return description; }
    public String getImageKey() { return imageKey; }
}