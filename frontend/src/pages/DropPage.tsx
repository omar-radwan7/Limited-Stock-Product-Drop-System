import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProduct } from '../hooks/useProduct';
import { useReservationContext } from '../context/ReservationContext';
import { AlertCircle, RefreshCw, Zap } from 'lucide-react';

interface DropPageProps {
  productId: string;
}

const DropPage: React.FC<DropPageProps> = ({ productId }) => {
  const navigate = useNavigate();
  const { product, loading: productLoading, error: productError, refetch } = useProduct(productId);
  const {
    state,
    errorMessage,
    reserve,
  } = useReservationContext();

  // Redirect to checkout if already reserved
  useEffect(() => {
    if (state === 'RESERVED') {
      navigate('/checkout');
    }
  }, [state, navigate]);

  if (productLoading) {
    return (
      <div className="drop-page__loading">
        <div className="spinner" role="status" aria-label="Loading product" />
        <p style={{ marginTop: '20px', letterSpacing: '4px', fontSize: '10px', fontWeight: '800' }}>INITIALIZING_DROP</p>
      </div>
    );
  }

  if (productError || !product) {
    return (
      <div className="drop-page__error-screen">
        <AlertCircle size={48} className="error-icon" />
        <h2 style={{ fontFamily: 'var(--font-display)', marginTop: '20px' }}>PRODUCT_OFFLINE</h2>
        <p style={{ margin: '16px 0', opacity: 0.6 }}>{productError ?? 'The system could not retrieve the target asset.'}</p>
        <button className="btn btn--outline" onClick={refetch} style={{ width: 'auto' }}>
          <RefreshCw size={18} />
          RECONNECT
        </button>
      </div>
    );
  }

  return (
    <div className="drop-page animate-in">
      {/* ── Left Column: Cinematic Visual ── */}
      <div className="drop-visual-section">
        <div className="visual-container">
          <img src={`${product.imageUrl || '/product.png'}?v=1`} alt={product.name} className="main-visual" />
          <div className="visual-serial">SERIAL: {product.id.slice(0, 16)}</div>
        </div>
      </div>

      {/* ── Right Column: Tech Specs & Actions ── */}
      <div className="drop-info-section">
        <div className="info-header">
           <h1>{product.name}</h1>
           <div className="drop-price">${product.price.toFixed(2)}</div>
        </div>

        <div className="specs-grid">
           <div className="spec-item">
             <label>Model ID</label>
             <span>#{product.id.slice(0, 8)}</span>
           </div>
           <div className="spec-item">
             <label>Availability</label>
             <span className={product.stock <= 2 ? 'text-danger' : 'text-primary'}>
               {product.stock} units in stock
             </span>
           </div>
        </div>

        <p className="drop-description">{product.description}</p>

        <div className="drop-actions">
          {product.stock === 0 ? (
            <div className="sold-out-card">
              <h3>STOCK_ARCHIVED</h3>
              <p>This unit is no longer available for reservation.</p>
            </div>
          ) : state === 'ERROR_STOCK' ? (
            <div className="error-card">
              <AlertCircle size={20} />
              <div>
                <p>Stock Unavailable</p>
                <small>The last units were just reserved by other users.</small>
              </div>
            </div>
          ) : (
            <button 
              className={`btn btn--primary ${state === 'RESERVING' ? 'btn--loading' : ''}`}
              onClick={() => void reserve(productId, 1)}
              disabled={state === 'RESERVING'}
            >
              {state === 'RESERVING' ? 'Reserving...' : 'Reserve Now'}
              <Zap size={18} />
            </button>
          )}

          {errorMessage && state === 'ERROR_OTHER' && (
            <div className="error-card error-card--other">
              <p>Unable to Reserve</p>
              <small>{errorMessage}</small>
            </div>
          )}
        </div>

        <div className="legal-disclaimer">
          Reservations are held for 5 minutes. If checkout is not completed within this timeframe, the item will be released back to the general stock.
        </div>
      </div>
    </div>
  );
};

export default DropPage;
