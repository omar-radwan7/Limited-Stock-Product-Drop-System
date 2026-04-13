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
    reset,
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

  const isSoldOut = product.stock <= 0;
  const isReserveDisabled = isSoldOut || state === 'RESERVING';

  return (
    <div className="drop-page">
      <div className="drop-card">
        {/* ── Visual Panel ── */}
        <div className="drop-card__image">
          <div className="drop-card__badge">ARCHIVE_01</div>
          <img src="/product.png" alt={product.name} />
          <div style={{ position: 'absolute', bottom: '40px', left: '40px', opacity: 0.3, fontSize: '9px', letterSpacing: '2px' }}>
            SERIAL: {product.id.slice(0, 12).toUpperCase()}
          </div>
        </div>

        {/* ── Tactical Panel ── */}
        <div className="drop-card__info">
          <header>
            <h1 className="drop-card__title">{product.name}</h1>
            <span className="drop-card__price">USD {product.price.toFixed(2)}</span>
          </header>

          <p className="drop-card__description">{product.description}</p>

          <div className={`stock-badge ${isSoldOut ? 'stock-badge--empty' : product.stock <= 5 ? 'stock-badge--low' : 'stock-badge--ok'}`}>
            <span className="stock-badge__dot" />
            <span style={{ letterSpacing: '1px' }}>
              {isSoldOut
                ? 'STOCK_DEPLETED'
                : product.stock <= 5
                ? `CRITICAL_LEVEL: ${product.stock} UNITS`
                : `SYSTEM_READY: ${product.stock} UNITS`}
            </span>
          </div>

          <div className="drop-actions">
            {(state === 'IDLE' || state === 'RESERVING') && (
              <button
                id="reserve-btn"
                className={`btn ${isSoldOut ? 'btn--disabled' : 'btn--primary'} ${state === 'RESERVING' ? 'btn--loading' : ''}`}
                disabled={isReserveDisabled}
                onClick={() => void reserve(product.id, 1)}
              >
                {state === 'RESERVING' ? 'ESTABLISHING_LOCK...' : isSoldOut ? 'SOLD_OUT' : (
                  <>
                    RESERVE_UNIT
                    <Zap size={18} />
                  </>
                )}
              </button>
            )}

            {(state === 'ERROR_STOCK' || state === 'ERROR_OTHER') && (
              <div className="error-box error-box--danger">
                <AlertCircle size={24} />
                <h3>TRANSACTION_ERROR</h3>
                <p>{errorMessage || 'Access denied by security layer.'}</p>
                <button className="btn btn--outline" onClick={reset}>RESET</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DropPage;
