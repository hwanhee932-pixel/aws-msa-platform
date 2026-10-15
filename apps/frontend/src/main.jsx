import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const API_URL =
  import.meta.env.VITE_API_URL || "https://api.wecnedu.com/api";

function App() {
  // =========================================================
  // 상품
  // =========================================================
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productError, setProductError] = useState("");

  // 검색
  const [searchInput, setSearchInput] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");

  // =========================================================
  // 인증
  // =========================================================
  const [accessToken, setAccessToken] = useState(
    sessionStorage.getItem("accessToken") || ""
  );

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginMessage, setLoginMessage] = useState("");

  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupMessage, setSignupMessage] = useState("");

  // login / signup / null
  const [authModal, setAuthModal] = useState(null);

  // =========================================================
  // 상품 등록
  // =========================================================
  const [showProductForm, setShowProductForm] = useState(false);

  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productDescription, setProductDescription] = useState("");

  // 상품 이미지
  const [productImage, setProductImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const [productMessage, setProductMessage] = useState("");
  const [productSubmitting, setProductSubmitting] = useState(false);

  // =========================================================
  // 상품 조회
  // =========================================================
  const loadProducts = async () => {
    try {
      setLoading(true);
      setProductError("");

      const response = await fetch(
        `${API_URL}/v1/products?page=0&size=20`
      );

      if (!response.ok) {
        throw new Error(`상품 조회 실패: ${response.status}`);
      }

      const data = await response.json();

      setProducts(data.content ?? []);
    } catch (err) {
      console.error(err);
      setProductError("상품 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // =========================================================
  // 상품 검색
  // =========================================================
  const filteredProducts = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    if (!keyword) {
      return products;
    }

    return products.filter((product) => {
      const name = product.name?.toLowerCase() || "";
      const description = product.description?.toLowerCase() || "";

      return (
        name.includes(keyword) ||
        description.includes(keyword)
      );
    });
  }, [products, searchKeyword]);

  const handleSearch = (event) => {
    event.preventDefault();

    setSearchKeyword(searchInput);

    document.getElementById("products")?.scrollIntoView({
      behavior: "smooth",
    });
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearchKeyword("");
  };

  const handleCategorySearch = (keyword) => {
    if (!keyword) {
      clearSearch();
    } else {
      setSearchInput(keyword);
      setSearchKeyword(keyword);
    }

    document.getElementById("products")?.scrollIntoView({
      behavior: "smooth",
    });
  };

  // =========================================================
  // 회원가입
  // =========================================================
  const handleSignup = async (event) => {
    event.preventDefault();

    setSignupMessage("");

    try {
      const response = await fetch(
        `${API_URL}/v1/auth/signup`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            email: signupEmail,
            password: signupPassword,
            name: signupName,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (response.status === 409) {
        setSignupMessage("이미 가입된 이메일입니다.");
        return;
      }

      if (!response.ok) {
        setSignupMessage(`회원가입 실패 (${response.status})`);
        return;
      }

      setSignupMessage(
        `회원가입 성공: ${data.name} (${data.email})`
      );

      setSignupEmail("");
      setSignupPassword("");
      setSignupName("");
    } catch (err) {
      console.error(err);

      setSignupMessage(
        "회원가입 요청 중 오류가 발생했습니다."
      );
    }
  };

  // =========================================================
  // 로그인
  // =========================================================
  const handleLogin = async (event) => {
    event.preventDefault();

    setLoginMessage("");

    try {
      const response = await fetch(
        `${API_URL}/v1/auth/login`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            email: loginEmail,
            password: loginPassword,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        setLoginMessage(
          "이메일 또는 비밀번호가 올바르지 않습니다."
        );
        return;
      }

      if (!response.ok) {
        setLoginMessage(`로그인 실패 (${response.status})`);
        return;
      }

      sessionStorage.setItem(
        "accessToken",
        data.accessToken
      );

      // 이전 버전에서 localStorage에 저장했던 토큰 정리
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");

      setAccessToken(data.accessToken);

      setLoginMessage("로그인 성공!");
      setLoginPassword("");

      setTimeout(() => {
        setAuthModal(null);
        setLoginMessage("");
      }, 700);
    } catch (err) {
      console.error(err);

      setLoginMessage(
        "로그인 요청 중 오류가 발생했습니다."
      );
    }
  };

  // =========================================================
  // 로그아웃
  // =========================================================
  const handleLogout = () => {
    sessionStorage.removeItem("accessToken");

    // 예전 토큰도 같이 정리
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");

    setAccessToken("");
    setShowProductForm(false);
    setProductMessage("");
  };

  // =========================================================
  // 상품 이미지 선택
  // =========================================================
  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      setProductImage(null);
      setImagePreview("");
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setProductImage(null);
      setImagePreview("");
      setProductMessage(
        "이미지는 JPG, PNG, WEBP 형식만 사용할 수 있습니다."
      );
      event.target.value = "";
      return;
    }

    // 예시로 프론트에서 10MB 제한
    if (file.size > 10 * 1024 * 1024) {
      setProductImage(null);
      setImagePreview("");
      setProductMessage(
        "이미지 크기는 10MB 이하로 선택해주세요."
      );
      event.target.value = "";
      return;
    }

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    const previewUrl = URL.createObjectURL(file);

    setProductImage(file);
    setImagePreview(previewUrl);
    setProductMessage("");
  };

  // =========================================================
  // 상품 등록
  // Presigned URL → S3 PUT → Product API
  // =========================================================
  const handleCreateProduct = async (event) => {
    event.preventDefault();

    setProductMessage("");

    if (!accessToken) {
      setProductMessage(
        "상품을 등록하려면 로그인이 필요합니다."
      );
      return;
    }

    if (!productName.trim()) {
      setProductMessage("상품명을 입력해주세요.");
      return;
    }

    if (
      productPrice === "" ||
      Number(productPrice) < 0
    ) {
      setProductMessage(
        "올바른 상품 가격을 입력해주세요."
      );
      return;
    }

    setProductSubmitting(true);

    try {
      let imageKey = null;

      // =====================================================
      // 1. 이미지가 있으면 Presigned PUT URL 요청
      // =====================================================
      if (productImage) {
        const allowedTypes = [
          "image/jpeg",
          "image/png",
          "image/webp",
        ];

        if (!allowedTypes.includes(productImage.type)) {
          setProductMessage(
            "이미지는 JPG, PNG, WEBP 형식만 사용할 수 있습니다."
          );
          return;
        }

        setProductMessage(
          "이미지 업로드 URL을 발급받는 중..."
        );

        const presignResponse = await fetch(
          `${API_URL}/v1/products/images/presigned-url`,
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },

            body: JSON.stringify({
              contentType: productImage.type,
            }),
          }
        );

        if (presignResponse.status === 401) {
          sessionStorage.removeItem("accessToken");

          setAccessToken("");
          setShowProductForm(false);

          setProductMessage(
            "로그인 시간이 만료되었습니다. 다시 로그인해주세요."
          );

          return;
        }

        if (!presignResponse.ok) {
          const errorText =
            await presignResponse.text();

          console.error(
            "Presigned URL 발급 실패:",
            presignResponse.status,
            errorText
          );

          setProductMessage(
            `이미지 업로드 URL 발급 실패 (${presignResponse.status})`
          );

          return;
        }

        const presignData =
          await presignResponse.json();

        if (
          !presignData.uploadUrl ||
          !presignData.key ||
          !presignData.contentType
        ) {
          console.error(
            "잘못된 Presigned URL 응답:",
            presignData
          );

          setProductMessage(
            "이미지 업로드 URL 응답 형식이 올바르지 않습니다."
          );

          return;
        }

        // ===================================================
        // 2. 브라우저 → S3 직접 PUT
        // ===================================================
        setProductMessage(
          "S3에 상품 이미지를 업로드하는 중..."
        );

        const uploadResponse = await fetch(
          presignData.uploadUrl,
          {
            method: "PUT",

            headers: {
              "Content-Type": presignData.contentType,
            },

            body: productImage,
          }
        );

        if (!uploadResponse.ok) {
          const errorText =
            await uploadResponse.text();

          console.error(
            "S3 이미지 업로드 실패:",
            uploadResponse.status,
            errorText
          );

          setProductMessage(
            `S3 이미지 업로드 실패 (${uploadResponse.status})`
          );

          return;
        }

        imageKey = presignData.key;
      }

      // =====================================================
      // 3. Product DB에 상품 등록
      // =====================================================
      setProductMessage("상품 정보를 등록하는 중...");

      const response = await fetch(
        `${API_URL}/v1/products`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },

          body: JSON.stringify({
            name: productName.trim(),
            price: Number(productPrice),
            description:
              productDescription.trim(),
            imageKey,
          }),
        }
      );

      if (response.status === 401) {
        sessionStorage.removeItem("accessToken");

        setAccessToken("");
        setShowProductForm(false);

        setProductMessage(
          "로그인 시간이 만료되었습니다. 다시 로그인해주세요."
        );

        return;
      }

      if (response.status === 403) {
        setProductMessage(
          "상품 등록 권한이 없습니다."
        );
        return;
      }

      if (!response.ok) {
        const errorText =
          await response.text();

        console.error(
          "상품 등록 실패:",
          response.status,
          errorText
        );

        setProductMessage(
          `상품 등록 실패 (${response.status})`
        );

        return;
      }

      const data = await response.json();

      // =====================================================
      // 4. 등록 성공
      // =====================================================
      setProductMessage(
        `상품 등록 성공! 상품번호: ${data.id}`
      );

      setProductName("");
      setProductPrice("");
      setProductDescription("");
      setProductImage(null);

      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }

      setImagePreview("");

      // 상품 목록 다시 조회
      await loadProducts();
    } catch (err) {
      console.error(
        "상품 등록 처리 중 오류:",
        err
      );

      setProductMessage(
        "상품 등록 중 오류가 발생했습니다."
      );
    } finally {
      setProductSubmitting(false);
    }
  };

  // =========================================================
  // 화면
  // =========================================================
  return (
    <>
      {/* =========================================
          HEADER
      ========================================== */}
      <header className="top-header">
        <div className="header-inner">
          <button
            className="logo"
            type="button"
            onClick={() =>
              window.scrollTo({
                top: 0,
                behavior: "smooth",
              })
            }
          >
            SOL_<span>SHOP</span>
          </button>

          <nav className="main-nav">
            <a href="#products">신상품</a>
            <a href="#products">베스트</a>
            <a href="#categories">노트북</a>
            <a href="#categories">모니터</a>
            <a href="#categories">PC부품</a>
            <a href="#categories">게이밍</a>
          </nav>

          <div className="header-actions">
            {accessToken ? (
              <>
                <button
                  className="header-button"
                  type="button"
                  onClick={() => {
                    setProductMessage("");
                    setShowProductForm(
                      (prev) => !prev
                    );
                  }}
                >
                  {showProductForm
                    ? "등록창 닫기"
                    : "상품 등록"}
                </button>

                <button
                  className="header-button"
                  type="button"
                  onClick={handleLogout}
                >
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <button
                  className="header-button"
                  type="button"
                  onClick={() => {
                    setLoginMessage("");
                    setAuthModal("login");
                  }}
                >
                  로그인
                </button>

                <button
                  className="primary-button"
                  type="button"
                  onClick={() => {
                    setSignupMessage("");
                    setAuthModal("signup");
                  }}
                >
                  회원가입
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* =========================================
          SEARCH
      ========================================== */}
      <section className="search-area">
        <form
          className="search-inner"
          onSubmit={handleSearch}
        >
          <input
            className="search-input"
            type="text"
            placeholder="어떤 IT 제품을 찾고 계신가요?"
            value={searchInput}
            onChange={(event) =>
              setSearchInput(event.target.value)
            }
          />

          <button
            className="search-button"
            type="submit"
          >
            검색
          </button>
        </form>
      </section>

      {/* =========================================
          CATEGORY BAR
      ========================================== */}
      <section className="category-bar">
        <div className="category-inner">
          <button
            className="category-item"
            type="button"
            onClick={() =>
              handleCategorySearch("")
            }
          >
            전체상품
          </button>

          <button
            className="category-item"
            type="button"
            onClick={() =>
              handleCategorySearch("노트북")
            }
          >
            노트북
          </button>

          <button
            className="category-item"
            type="button"
            onClick={() =>
              handleCategorySearch("모니터")
            }
          >
            모니터
          </button>

          <button
            className="category-item"
            type="button"
            onClick={() =>
              handleCategorySearch("키보드")
            }
          >
            키보드
          </button>

          <button
            className="category-item"
            type="button"
            onClick={() =>
              handleCategorySearch("마우스")
            }
          >
            마우스
          </button>

          <button
            className="category-item"
            type="button"
            onClick={() =>
              handleCategorySearch("오디오")
            }
          >
            오디오
          </button>

          <button
            className="category-item"
            type="button"
            onClick={() =>
              handleCategorySearch("SSD")
            }
          >
            SSD / 메모리
          </button>

          <button
            className="category-item"
            type="button"
            onClick={() =>
              handleCategorySearch("게이밍")
            }
          >
            게이밍
          </button>
        </div>
      </section>

      {/* =========================================
          HERO
      ========================================== */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-label">
            SOL_SHOP TECH COLLECTION
          </div>

          <h1>
            Upgrade
            <br />
            Your <span>Setup.</span>
          </h1>

          <p>
            노트북부터 게이밍 기어까지.
            <br />
            당신의 데스크를 완성할 IT 제품을
            Sol_Shop에서 만나보세요.
          </p>

          <button
            className="hero-button"
            type="button"
            onClick={() =>
              document
                .getElementById("products")
                ?.scrollIntoView({
                  behavior: "smooth",
                })
            }
          >
            제품 둘러보기 →
          </button>
        </div>
      </section>

      {/* =========================================
          MAIN
      ========================================== */}
      <main className="container">
        {/* QUICK CATEGORIES */}
        <section
          id="categories"
          className="categories-section"
        >
          <div className="section-header">
            <div>
              <span className="section-label">
                CATEGORY
              </span>

              <h2>Shop by Category</h2>

              <p>
                원하는 IT 카테고리를 빠르게
                확인해보세요.
              </p>
            </div>
          </div>

          <div className="quick-categories">
            <button
              className="quick-category"
              type="button"
              onClick={() =>
                handleCategorySearch("노트북")
              }
            >
              <span className="category-icon">
                💻
              </span>
              <strong>노트북</strong>
              <small>Laptop & Tablet</small>
            </button>

            <button
              className="quick-category"
              type="button"
              onClick={() =>
                handleCategorySearch("모니터")
              }
            >
              <span className="category-icon">
                🖥️
              </span>
              <strong>모니터</strong>
              <small>Monitor & Display</small>
            </button>

            <button
              className="quick-category"
              type="button"
              onClick={() =>
                handleCategorySearch("키보드")
              }
            >
              <span className="category-icon">
                ⌨️
              </span>
              <strong>키보드</strong>
              <small>Keyboard</small>
            </button>

            <button
              className="quick-category"
              type="button"
              onClick={() =>
                handleCategorySearch("마우스")
              }
            >
              <span className="category-icon">
                🖱️
              </span>
              <strong>마우스</strong>
              <small>Mouse</small>
            </button>

            <button
              className="quick-category"
              type="button"
              onClick={() =>
                handleCategorySearch("오디오")
              }
            >
              <span className="category-icon">
                🎧
              </span>
              <strong>오디오</strong>
              <small>Headset & Audio</small>
            </button>

            <button
              className="quick-category"
              type="button"
              onClick={() =>
                handleCategorySearch("SSD")
              }
            >
              <span className="category-icon">
                💾
              </span>
              <strong>PC부품</strong>
              <small>SSD & Memory</small>
            </button>
          </div>
        </section>

        {/* =====================================
            PRODUCT CREATE
        ====================================== */}
        {accessToken && showProductForm && (
          <section className="admin-panel">
            <div className="section-header">
              <div>
                <span className="section-label">
                  SELLER
                </span>

                <h2>상품 등록</h2>

                <p>
                  Sol_Shop에 새로운 IT 상품을
                  등록합니다.
                </p>
              </div>
            </div>

            <form
              className="product-form"
              onSubmit={handleCreateProduct}
            >
              <div className="form-group">
                <label>상품명</label>

                <input
                  type="text"
                  placeholder="예: 게이밍 기계식 키보드"
                  value={productName}
                  onChange={(event) =>
                    setProductName(
                      event.target.value
                    )
                  }
                  maxLength={255}
                  required
                />
              </div>

              <div className="form-group">
                <label>가격</label>

                <input
                  type="number"
                  placeholder="예: 89000"
                  value={productPrice}
                  onChange={(event) =>
                    setProductPrice(
                      event.target.value
                    )
                  }
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div className="form-group">
                <label>상품 설명</label>

                <textarea
                  placeholder="상품의 특징과 사양을 입력해주세요."
                  value={productDescription}
                  onChange={(event) =>
                    setProductDescription(
                      event.target.value
                    )
                  }
                  maxLength={2000}
                />
              </div>

              {/* 이미지 업로드 */}
              <div className="image-upload-area">
                <label>상품 이미지</label>

                <p className="image-help">
                  JPG, PNG, WEBP · 최대 10MB
                </p>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                />

                {imagePreview && (
                  <div className="image-preview">
                    <img
                      src={imagePreview}
                      alt="상품 이미지 미리보기"
                    />

                    <button
                      type="button"
                      className="remove-image-button"
                      onClick={() => {
                        URL.revokeObjectURL(
                          imagePreview
                        );

                        setImagePreview("");
                        setProductImage(null);
                      }}
                    >
                      이미지 제거
                    </button>
                  </div>
                )}
              </div>

              <button
                className="primary-button product-submit-button"
                type="submit"
                disabled={productSubmitting}
              >
                {productSubmitting
                  ? "등록 중..."
                  : "상품 등록"}
              </button>
            </form>

            {productMessage && (
              <div className="status-message">
                {productMessage}
              </div>
            )}
          </section>
        )}

        {/* =====================================
            PRODUCTS
        ====================================== */}
        <section
          id="products"
          className="products-section"
        >
          <div className="section-header product-section-header">
            <div>
              <span className="section-label">
                PRODUCTS
              </span>

              <h2>
                {searchKeyword
                  ? "검색 결과"
                  : "Popular Tech"}
              </h2>

              <p>
                {searchKeyword
                  ? `"${searchKeyword}" 검색 결과`
                  : "Sol_Shop의 인기 IT 상품을 만나보세요."}
              </p>
            </div>

            {searchKeyword && (
              <button
                className="outline-button"
                type="button"
                onClick={clearSearch}
              >
                전체상품 보기
              </button>
            )}
          </div>

          {loading ? (
            <div className="product-state">
              상품을 불러오는 중...
            </div>
          ) : productError ? (
            <div className="product-state error">
              {productError}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="product-state">
              {searchKeyword
                ? "검색 결과가 없습니다."
                : "등록된 상품이 없습니다."}
            </div>
          ) : (
            <div className="product-grid">
              {filteredProducts.map(
                (product) => (
                  <article
                    className="product-card"
                    key={product.id}
                  >
                    <div className="product-image-wrapper">
                      <span className="product-badge">
                        TECH
                      </span>

                      {product.imageUrl ? (
                        <img
                          className="product-image"
                          src={product.imageUrl}
                          alt={product.name}
                          loading="lazy"
                        />
                      ) : (
                        <div className="no-image">
                          <span>💻</span>
                          <small>
                            IMAGE COMING SOON
                          </small>
                        </div>
                      )}
                    </div>

                    <div className="product-info">
                      <div className="product-category">
                        SOL_SHOP TECH
                      </div>

                      <h3>
                        {product.name}
                      </h3>

                      <strong>
                        {Number(
                          product.price
                        ).toLocaleString(
                          "ko-KR"
                        )}
                        원
                      </strong>

                      <p>
                        {product.description ||
                          "상품 설명이 없습니다."}
                      </p>

                      <div className="product-meta">
                        상품번호 #{product.id}
                      </div>
                    </div>
                  </article>
                )
              )}
            </div>
          )}
        </section>
      </main>

      {/* =========================================
          FOOTER
      ========================================== */}
      <footer className="footer">
        <div className="footer-inner">
          <div>
            <div className="footer-logo">
              SOL_SHOP
            </div>

            <p>
              IT & Gaming Store
            </p>
          </div>

          <div className="footer-info">
            <p>
              AWS 기반 MSA IT 쇼핑 플랫폼
            </p>

            <small>
              © 2026 Sol_Shop. All rights
              reserved.
            </small>
          </div>
        </div>
      </footer>

      {/* =========================================
          LOGIN MODAL
      ========================================== */}
      {authModal === "login" && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setAuthModal(null);
            }
          }}
        >
          <div className="modal">
            <button
              className="modal-close"
              type="button"
              onClick={() =>
                setAuthModal(null)
              }
            >
              ×
            </button>

            <div className="modal-brand">
              SOL_<span>SHOP</span>
            </div>

            <h2>로그인</h2>

            <p className="modal-description">
              로그인하고 Sol_Shop 서비스를
              이용해보세요.
            </p>

            <form
              className="auth-form"
              onSubmit={handleLogin}
            >
              <label>
                이메일

                <input
                  type="email"
                  placeholder="example@email.com"
                  value={loginEmail}
                  onChange={(event) =>
                    setLoginEmail(
                      event.target.value
                    )
                  }
                  required
                />
              </label>

              <label>
                비밀번호

                <input
                  type="password"
                  placeholder="비밀번호"
                  value={loginPassword}
                  onChange={(event) =>
                    setLoginPassword(
                      event.target.value
                    )
                  }
                  required
                />
              </label>

              <button
                className="primary-button modal-submit"
                type="submit"
              >
                로그인
              </button>
            </form>

            {loginMessage && (
              <p className="auth-message">
                {loginMessage}
              </p>
            )}

            <p className="modal-switch">
              아직 회원이 아니신가요?

              <button
                type="button"
                onClick={() => {
                  setLoginMessage("");
                  setAuthModal("signup");
                }}
              >
                회원가입
              </button>
            </p>
          </div>
        </div>
      )}

      {/* =========================================
          SIGNUP MODAL
      ========================================== */}
      {authModal === "signup" && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setAuthModal(null);
            }
          }}
        >
          <div className="modal">
            <button
              className="modal-close"
              type="button"
              onClick={() =>
                setAuthModal(null)
              }
            >
              ×
            </button>

            <div className="modal-brand">
              SOL_<span>SHOP</span>
            </div>

            <h2>회원가입</h2>

            <p className="modal-description">
              계정을 만들고 Sol_Shop을
              시작해보세요.
            </p>

            <form
              className="auth-form"
              onSubmit={handleSignup}
            >
              <label>
                이메일

                <input
                  type="email"
                  placeholder="example@email.com"
                  value={signupEmail}
                  onChange={(event) =>
                    setSignupEmail(
                      event.target.value
                    )
                  }
                  required
                />
              </label>

              <label>
                비밀번호

                <input
                  type="password"
                  placeholder="10자 이상 입력"
                  value={signupPassword}
                  onChange={(event) =>
                    setSignupPassword(
                      event.target.value
                    )
                  }
                  minLength={10}
                  maxLength={72}
                  required
                />
              </label>

              <label>
                이름

                <input
                  type="text"
                  placeholder="이름"
                  value={signupName}
                  onChange={(event) =>
                    setSignupName(
                      event.target.value
                    )
                  }
                  required
                />
              </label>

              <button
                className="primary-button modal-submit"
                type="submit"
              >
                회원가입
              </button>
            </form>

            {signupMessage && (
              <p className="auth-message">
                {signupMessage}
              </p>
            )}

            <p className="modal-switch">
              이미 회원이신가요?

              <button
                type="button"
                onClick={() => {
                  setSignupMessage("");
                  setAuthModal("login");
                }}
              >
                로그인
              </button>
            </p>
          </div>
        </div>
      )}
    </>
  );
}

createRoot(
  document.getElementById("root")
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);