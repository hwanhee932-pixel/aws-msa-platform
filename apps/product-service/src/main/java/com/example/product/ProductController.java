package com.example.product;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

@RestController
@RequestMapping("/api/v1/products")
public class ProductController {

    private static final Duration UPLOAD_URL_DURATION =
        Duration.ofMinutes(5);

    private static final Duration DOWNLOAD_URL_DURATION =
        Duration.ofMinutes(10);

    private final ProductRepository repo;
    private final S3Presigner presigner;
    private final String bucket;

    public ProductController(
            ProductRepository repo,
            S3Presigner presigner,
            @Value("${app.s3.bucket}") String bucket) {

        this.repo = repo;
        this.presigner = presigner;
        this.bucket = bucket;
    }

    /*
     * =========================================================
     * Request DTO
     * =========================================================
     */

    public record ProductRequest(

        @NotBlank
        @Size(max = 255)
        String name,

        @NotNull
        @DecimalMin("0.00")
        @Digits(integer = 13, fraction = 2)
        BigDecimal price,

        @Size(max = 2000)
        String description,

        @Size(max = 512)
        String imageKey

    ) {}


    /*
     * =========================================================
     * Response DTO
     * =========================================================
     */

    public record ProductResponse(

        Long id,

        Long ownerId,

        String name,

        BigDecimal price,

        String description,

        String imageKey,

        String imageUrl

    ) {}


    /*
     * =========================================================
     * Image Request DTO
     * =========================================================
     */

    public record ImageRequest(

        @NotBlank
        String contentType

    ) {}


    /*
     * =========================================================
     * 상품 전체 조회
     * =========================================================
     */

    @GetMapping
    public Page<ProductResponse> list(

            @RequestParam(defaultValue = "0")
            int page,

            @RequestParam(defaultValue = "20")
            int size) {

        /*
         * 비정상적인 page/size 방지
         */
        if (page < 0 || size < 1 || size > 100) {

            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Invalid page or size"
            );
        }

        /*
         * DB 조회 후
         *
         * Product Entity
         *      ↓
         * ProductResponse DTO
         *
         * 로 변환
         */
        return repo.findAll(
                PageRequest.of(
                    page,
                    size,
                    Sort.by(
                        Sort.Direction.DESC,
                        "id"
                    )
                )
            )
            .map(this::toResponse);
    }


    /*
     * =========================================================
     * 상품 단건 조회
     * =========================================================
     */

    @GetMapping("/{id}")
    public ProductResponse get(

            @PathVariable
            Long id) {

        Product product = find(id);

        return toResponse(product);
    }


    /*
     * =========================================================
     * 상품 생성
     * =========================================================
     */

    @PostMapping
    public ResponseEntity<ProductResponse> create(

            @AuthenticationPrincipal
            Jwt jwt,

            @Valid
            @RequestBody
            ProductRequest request) {

        /*
         * JWT subject에서 회원 ID 획득
         */
        Long ownerId = memberId(jwt);


        /*
         * 다른 사용자의 S3 경로를
         * 사용할 수 없도록 검증
         */
        checkImageKey(
            request.imageKey(),
            ownerId
        );


        Product product = new Product(

            ownerId,

            request.name(),

            request.price(),

            request.description(),

            request.imageKey()
        );


        Product savedProduct =
            repo.save(product);


        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(
                toResponse(savedProduct)
            );
    }


    /*
     * =========================================================
     * 상품 수정
     * =========================================================
     */

    @PutMapping("/{id}")
    public ProductResponse update(

            @PathVariable
            Long id,

            @AuthenticationPrincipal
            Jwt jwt,

            @Valid
            @RequestBody
            ProductRequest request) {

        Product product =
            find(id);


        Long ownerId =
            memberId(jwt);


        /*
         * 상품 소유자 검증
         */
        checkOwner(
            product,
            ownerId
        );


        /*
         * S3 이미지 Key 검증
         */
        checkImageKey(
            request.imageKey(),
            ownerId
        );


        product.update(

            request.name(),

            request.price(),

            request.description(),

            request.imageKey()
        );


        Product savedProduct =
            repo.save(product);


        return toResponse(
            savedProduct
        );
    }


    /*
     * =========================================================
     * 상품 삭제
     * =========================================================
     */

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(

            @PathVariable
            Long id,

            @AuthenticationPrincipal
            Jwt jwt) {

        Product product =
            find(id);


        Long ownerId =
            memberId(jwt);


        checkOwner(
            product,
            ownerId
        );


        repo.delete(product);


        return ResponseEntity
            .noContent()
            .build();
    }


    /*
     * =========================================================
     * S3 이미지 업로드용 Presigned PUT URL
     * =========================================================
     */

    @PostMapping("/images/presigned-url")
    public Map<String, String> presign(

            @AuthenticationPrincipal
            Jwt jwt,

            @Valid
            @RequestBody
            ImageRequest request) {

        /*
         * 로그인 사용자 확인
         */
        Long ownerId =
            memberId(jwt);


        /*
         * 허용할 이미지 MIME Type
         */
        String extension =
            switch (request.contentType()) {

                case "image/jpeg" ->
                    ".jpg";

                case "image/png" ->
                    ".png";

                case "image/webp" ->
                    ".webp";

                default ->
                    throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Unsupported image type"
                    );
            };


        /*
         * S3 Object Key
         *
         * products/{memberId}/{UUID}.jpg
         */
        String key =

            "products/"
            + ownerId
            + "/"
            + UUID.randomUUID()
            + extension;


        /*
         * S3 PUT 요청 정의
         */
        PutObjectRequest putRequest =

            PutObjectRequest
                .builder()
                .bucket(bucket)
                .key(key)
                .contentType(
                    request.contentType()
                )
                .build();


        /*
         * Presigned URL 설정
         */
        PutObjectPresignRequest presignRequest =

            PutObjectPresignRequest
                .builder()
                .signatureDuration(
                    UPLOAD_URL_DURATION
                )
                .putObjectRequest(
                    putRequest
                )
                .build();


        String uploadUrl =

            presigner
                .presignPutObject(
                    presignRequest
                )
                .url()
                .toString();


        return Map.of(

            "key",
            key,

            "uploadUrl",
            uploadUrl,

            "contentType",
            request.contentType()
        );
    }


    /*
     * =========================================================
     * Entity → Response DTO
     * =========================================================
     */

    private ProductResponse toResponse(
            Product product) {

        return new ProductResponse(

            product.getId(),

            product.getOwnerId(),

            product.getName(),

            product.getPrice(),

            product.getDescription(),

            product.getImageKey(),

            createImageUrl(
                product.getImageKey()
            )
        );
    }


    /*
     * =========================================================
     * S3 이미지 조회용 Presigned GET URL 생성
     * =========================================================
     */

    private String createImageUrl(
            String imageKey) {

        /*
         * 이미지가 없는 상품
         */
        if (imageKey == null
                || imageKey.isBlank()) {

            return null;
        }


        /*
         * S3 GET 요청 생성
         */
        GetObjectRequest getRequest =

            GetObjectRequest
                .builder()
                .bucket(bucket)
                .key(imageKey)
                .build();


        /*
         * Presigned GET URL 생성
         *
         * 유효시간: 10분
         */
        GetObjectPresignRequest presignRequest =

            GetObjectPresignRequest
                .builder()
                .signatureDuration(
                    DOWNLOAD_URL_DURATION
                )
                .getObjectRequest(
                    getRequest
                )
                .build();


        return presigner
            .presignGetObject(
                presignRequest
            )
            .url()
            .toString();
    }


    /*
     * =========================================================
     * 상품 조회
     * =========================================================
     */

    private Product find(
            Long id) {

        return repo
            .findById(id)
            .orElseThrow(() ->

                new ResponseStatusException(

                    HttpStatus.NOT_FOUND,

                    "Product not found"
                )
            );
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
             * JWT subject가
             * member ID라고 가정
             */
            Long id =
                Long.valueOf(
                    jwt.getSubject()
                );


            if (id <= 0) {

                throw new NumberFormatException();
            }


            return id;


        } catch (
            NumberFormatException exception
        ) {

            throw new ResponseStatusException(

                HttpStatus.UNAUTHORIZED,

                "Invalid member identity"
            );
        }
    }


    /*
     * =========================================================
     * 상품 소유자 확인
     * =========================================================
     */

    private void checkOwner(

            Product product,

            Long memberId) {

        if (!product
                .getOwnerId()
                .equals(memberId)) {

            throw new ResponseStatusException(

                HttpStatus.FORBIDDEN,

                "Only the owner can modify this product"
            );
        }
    }


    /*
     * =========================================================
     * S3 Image Key 검증
     * =========================================================
     */

    private void checkImageKey(

            String key,

            Long memberId) {

        /*
         * 이미지 없는 상품은 허용
         */
        if (key == null
                || key.isBlank()) {

            return;
        }


        /*
         * 자신의 S3 디렉터리만 사용 가능
         *
         * products/{memberId}/
         */
        String prefix =

            "products/"
            + memberId
            + "/";


        if (!key.startsWith(prefix)
                || key.contains("..")) {

            throw new ResponseStatusException(

                HttpStatus.BAD_REQUEST,

                "Invalid image key"
            );
        }
    }
}