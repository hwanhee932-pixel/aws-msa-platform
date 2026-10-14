import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const API_URL =
  import.meta.env.VITE_API_URL || "/api";

function App() {

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {

    const loadProducts = async () => {

      try {

        const response = await fetch(
          `${API_URL}/v1/products?page=0&size=20`
        );

        if (!response.ok) {
          throw new Error(
            `상품 조회 실패: ${response.status}`
          );
        }

        const data = await response.json();

        setProducts(data.content ?? []);

      } catch (err) {

        console.error(err);

        setError(
          "상품 정보를 불러오지 못했습니다."
        );

      } finally {

        setLoading(false);

      }
    };

    loadProducts();

  }, []);

  if (loading) {
    return (
      <main className="container">
        <h2>상품을 불러오는 중...</h2>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container">
        <h2>{error}</h2>
      </main>
    );
  }

  return (
    <main className="container">

      <h1>상품 목록</h1>

      {products.length === 0 ? (

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
                  {Number(product.price)
                    .toLocaleString("ko-KR")}
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