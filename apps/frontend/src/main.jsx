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
  const [productDescription, setProductDescription] =
    useState("");

  const [productMessage, setProductMessage] = useState("");

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

      setProductError(
        "상품 정보를 불러오지 못했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // =========================================================
  // 검색
  // =========================================================
  const filteredProducts = useMemo(() => {
    const keyword = searchKeyword
      .trim()
      .toLowerCase();

    if (!keyword) {
      return products;
    }

    return products.filter((product) => {
      const name =
        product.name?.toLowerCase() || "";

      const description =
        product.description?.toLowerCase() || "";

      return (
        name.includes(keyword) ||
        description.includes(keyword)
      );
    });
  }, [products, searchKeyword]);

  const handleSearch = (event) => {
    event.preventDefault();

    setSearchKeyword(searchInput);

    document
      .getElementById("products")
      ?.scrollIntoView({
        behavior: "smooth",
      });
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearchKeyword("");
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

      const data = await response.json();

      if (response.status === 409) {
        setSignupMessage(
          "이미 가입된 이메일입니다."
        );

        return;
      }

      if (!response.ok) {
        setSignupMessage(
          `회원가입 실패 (${response.status})`
        );

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

      const data = await response.json();

      if (response.status === 401) {
        setLoginMessage(
          "이메일 또는 비밀번호가 올바르지 않습니다."
        );

        return;
      }

      if (!response.ok) {
        setLoginMessage(
          `로그인 실패 (${response.status})`
        );

        return;
      }

      sessionStorage.setItem(
        "accessToken",
        data.accessToken
      );

      // 예전 버전에서 저장한 토큰 정리
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");

      setAccessToken(data.accessToken);

      setLoginMessage("로그인 성공");

      setLoginPassword("");

      // 잠깐 메시지를 보여준 뒤 모달 닫기
      setTimeout(() => {
        setAuthModal(null);
        setLoginMessage("");
      }, 600);
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

    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");

    setAccessToken("");
    setShowProductForm(false);
    setProductMessage("");
    setLoginMessage("");
  };

  // =========================================================
  // 상품 등록
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

    try {
      const response = await fetch(
        `${API_URL}/v1/products`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },

          body: JSON.stringify({
            name: productName,
            price: Number(productPrice),
            description: productDescription,
            imageKey: null,
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

      setProductMessage(
        `상품 등록 성공! 상품번호: ${data.id}`
      );

      setProductName("");
      setProductPrice("");
      setProductDescription("");

      await loadProducts();
    } catch (err) {
      console.error(err);

      setProductMessage(
        "상품 등록 요청 중 오류가 발생했습니다."
      );
    }
  };

  // =========================================================
  // UI
  // =========================================================
  return (
    <>
      {/* =========================================
          HEADER
      ========================================== */}
      <header className="top-header">
        <div className="header-inner">
          <div
            className="logo"
            onClick={() =>
              window.scrollTo({
                top: 0,
                behavior: "smooth",
              })
            }
          >
            SOL_<span>SHOP</span>
          </div>

          <nav className="main-nav">
            <a href="#products">
              신상품
            </a>

            <a href="#products">
              베스트
            </a>

            <a href="#categories">
              노트북
            </a>

            <a href="#categories">
              모니터
            </a>

            <a href="#categories">
              PC부품
            </a>

            <a href="#categories">
              게이밍
            </a>
          </nav>

          <div className="header-actions">
            {accessToken ? (
              <>
                <button
                  className="header-button"
                  type="button"
                  onClick={() =>
                    setShowProductForm(
                      (prev) => !prev
                    )
                  }
                >
                  상품 등록
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
          CATEGORY NAV
      ========================================== */}
      <section className="category-bar">
        <div className="category-inner">
          <button className="category-item">
            전체상품
          </button>

          <button className="category-item">
            노트북
          </button>

          <button className="category-item">
            모니터
          </button>

          <button className="category-item">
            키보드
          </button>

          <button className="category-item">
            마우스
          </button>

          <button className="category-item">
            오디오
          </button>

          <button className="category-item">
            PC부품
          </button>

          <button className="category-item">
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
        {/* QUICK CATEGORY */}
        <section id="categories">
          <div className="section-header">
            <div>
              <h2>Shop by Category</h2>

              <p>
                원하는 IT 카테고리를 빠르게
                확인해보세요.
              </p>
            </div>
          </div>

          <div className="quick-categories">
            <button className="quick-category">
              <span className="category-icon">
                💻
              </span>

              <strong>노트북</strong>
            </button>

            <button className="quick-category">
              <span className="category-icon">
                🖥️
              </span>

              <strong>모니터</strong>
            </button>

            <button className="quick-category">
              <span className="category-icon">
                ⌨️
              </span>

              <strong>키보드</strong>
            </button>

            <button className="quick-category">
              <span className="category-icon">
                🖱️
              </span>

              <strong>마우스</strong>
            </button>

            <button className="quick-category">
              <span className="category-icon">
                🎧
              </span>

              <strong>오디오</strong>
            </button>

            <button className="quick-category">
              <span className="category-icon">
                💾
              </span>

              <strong>PC부품</strong>
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
              <input
                type="text"
                placeholder="상품명"
                value={productName}
                onChange={(event) =>
                  setProductName(
                    event.target.value
                  )
                }
                maxLength={255}
                required
              />

              <input
                type="number"
                placeholder="가격"
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

              <textarea
                placeholder="상품 설명"
                value={productDescription}
                onChange={(event) =>
                  setProductDescription(
                    event.target.value
                  )
                }
                maxLength={2000}
              />

              <button
                className="primary-button"
                type="submit"
              >
                상품 등록
              </button>
            </form>

            {productMessage && (
              <p className="auth-message">
                {productMessage}
              </p>
            )}
          </section>
        )}

        {/* =====================================
            PRODUCTS
        ====================================== */}
        <section id="products">
          <div className="section-header">
            <div>
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
                className="header-button"
                type="button"
                style={{
                  color: "#111827",
                  borderColor: "#d1d5db",
                }}
                onClick={clearSearch}
              >
                검색 초기화
              </button>
            )}
          </div>

          {loading ? (
            <p>
              상품을 불러오는 중...
            </p>
          ) : productError ? (
            <p>{productError}</p>
          ) : filteredProducts.length === 0 ? (
            <p>
              {searchKeyword
                ? "검색 결과가 없습니다."
                : "등록된 상품이 없습니다."}
            </p>
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
                        />
                      ) : (
                        <div className="no-image">
                          IT PRODUCT
                        </div>
                      )}
                    </div>

                    <div className="product-info">
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

                      <small>
                        상품번호 #{product.id}
                      </small>
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
          <div className="footer-logo">
            SOL_SHOP
          </div>

          <p>
            IT & Gaming Store
          </p>

          <p>
            AWS 기반 MSA IT 쇼핑 플랫폼
          </p>

          <small>
            © 2026 Sol_Shop. All rights reserved.
          </small>
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

            <h2>Sol_Shop 로그인</h2>

            <p>
              로그인하고 상품 등록 및 주문
              서비스를 이용해보세요.
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
                className="primary-button"
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

            <p>
              아직 회원이 아니신가요?{" "}
              <button
                type="button"
                onClick={() => {
                  setLoginMessage("");
                  setAuthModal("signup");
                }}
                style={{
                  border: 0,
                  background: "transparent",
                  color: "#2563eb",
                  fontWeight: 700,
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

            <h2>Sol_Shop 회원가입</h2>

            <p>
              계정을 만들고 Sol_Shop을
              이용해보세요.
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
                className="primary-button"
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

            <p>
              이미 회원이신가요?{" "}
              <button
                type="button"
                onClick={() => {
                  setSignupMessage("");
                  setAuthModal("login");
                }}
                style={{
                  border: 0,
                  background: "transparent",
                  color: "#2563eb",
                  fontWeight: 700,
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