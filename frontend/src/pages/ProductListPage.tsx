import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { productApi } from '../api/productApi';
import type { Product } from '../types';

const ProductListPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await productApi.getProducts(1, 10);
        setProducts(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    void fetchProducts();
  }, []);

  if (loading) {
    return (
      <div className="drop-page__loading">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="product-list-page animate-in">
      <header className="list-header">
        <h1>Featured Collection</h1>
        <p>Premium hardware assets with real-time inventory tracking.</p>
      </header>

      <div className="product-grid">
        {products.map((product) => (
          <Link 
            to={`/drop/${product.id}`} 
            key={product.id} 
            className={`product-card ${product.stock === 0 ? 'is-sold-out' : ''}`}
          >
            <div className="product-card__visual">
              <img src={`${product.imageUrl || '/product.png'}?v=1`} alt={product.name} />
              {product.stock <= 2 && product.stock > 0 && <span className="badge-low">LOW_STOCK</span>}
              {product.stock === 0 && <span className="badge-sold">SOLD OUT</span>}
            </div>
            <div className="product-card__details">
              <h3>{product.name}</h3>
              <div className="product-card__price">${product.price.toLocaleString()}</div>
              <div className="product-card__footer">
                <div className="stock-indicator">
                  <div className="stock-bar">{product.stock}</div>
                  <span>Units Available</span>
                </div>
                <div className="chevron">→</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default ProductListPage;
