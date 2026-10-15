import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const API_URL =
  import.meta.env.VITE_API_URL || "https://api.wecnedu.com/api";

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productError, setProductError] = useState("");

  // 회원가입
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupMessage, setSignupMessage] = useState("");

  // 로그인
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginMessage, setLoginMessage] = useState("");

  const [accessToken, setAccessToken] = useState(
    localStorage.getItem("accessToken") || ""
  );

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
        setSignupMessage("이미 가입된 이메일입니다.");
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
      setSignupMessage("회원가입 요청 중 오류가 발생했습니다.");
    }
  };

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
        setLoginMessage("이메일 또는 비밀번호가 올바르지 않습니다.");
        return;
      }

      if (!response.ok) {
        setLoginMessage(
          `로그인 실패 (${response.status})`
        );
        return;
      }

      localStorage.setItem(
        "accessToken",
        data.accessToken
      );

      localStorage.setItem(
        "refreshToken",
        data.refreshToken
      );

      setAccessToken(data.accessToken);
      setLoginMessage("로그인 성공");

      setLoginPassword("");
    } catch (err) {
      console.error(err);
      setLoginMessage("로그인 요청 중 오류가 발생했습니다.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");

    setAccessToken("");
    setLoginMessage("로그아웃되었습니다.");
  };

  return (
    <main className="container">
      <h1>MSA Platform</h1>

      <section>
        <h2>회원가입</h2>

        <form onSubmit={handleSignup}>
          <div>
            <label>
              이메일
              <input
                type="email"
                value={signupEmail}
                onChange={(e) =>
                  setSignupEmail(e.target.value)
                }
                required
              />
            </label>
          </div>

          <div>
            <label>
              비밀번호
              <input
                type="password"
                value={signupPassword}
                onChange={(e) =>
                  setSignupPassword(e.target.value)
                }
                minLength={10}
                maxLength={72}
                required
              />
            </label>
          </div>

          <div>
            <label>
              이름
              <input
                type="text"
                value={signupName}
                onChange={(e) =>
                  setSignupName(e.target.value)
                }
                required
              />
            </label>
          </div>

          <button type="submit">
            회원가입
          </button>
        </form>

        {signupMessage && (
          <p>{signupMessage}</p>
        )}
      </section>

      <hr />

      <section>
        <h2>로그인</h2>

        {accessToken ? (
          <>
            <p>로그인 상태입니다.</p>

            <button
              type="button"
              onClick={handleLogout}
            >
              로그아웃
            </button>
          </>
        ) : (
          <form onSubmit={handleLogin}>
            <div>
              <label>
                이메일
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) =>
                    setLoginEmail(e.target.value)
                  }
                  required
                />
              </label>
            </div>

            <div>
              <label>
                비밀번호
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) =>
                    setLoginPassword(e.target.value)
                  }
                  required
                />
              </label>
            </div>

            <button type="submit">
              로그인
            </button>
          </form>
        )}

        {loginMessage && (
          <p>{loginMessage}</p>
        )}
      </section>

      <hr />

      <section>
        <h1>상품 목록</h1>

        {loading ? (
          <p>상품을 불러오는 중...</p>
        ) : productError ? (
          <p>{productError}</p>
        ) : products.length === 0 ? (
          <p>등록된 상품이 없습니다.</p>
        ) : (
          <div className="product-grid">
            {products.map((product) => (
              <article
                className="product-card"
                key={product.id}
              >
                {product.imageUrl ? (
                  <img
                    className="product-image"
                    src={product.imageUrl}
                    alt={product.name}
                  />
                ) : (
                  <div className="no-image">
                    이미지 없음
                  </div>
                )}

                <div className="product-info">
                  <h2>{product.name}</h2>

                  <strong>
                    {Number(
                      product.price
                    ).toLocaleString("ko-KR")}
                    원
                  </strong>

                  <p>
                    {product.description}
                  </p>

                  <small>
                    상품번호: {product.id}
                  </small>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

createRoot(
  document.getElementById("root")
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);