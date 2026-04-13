import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReservationContext } from '../context/ReservationContext';
import { useCountdown } from '../hooks/useCountdown';
import { useProduct } from '../hooks/useProduct';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { state, expiresAt, checkout, cancel, reset, orderId } = useReservationContext();
  const { formattedTime, isExpired, secondsLeft } = useCountdown(expiresAt);
  const { product, loading } = useProduct(import.meta.env.VITE_DEMO_PRODUCT_ID);

  useEffect(() => {
    if (state === 'IDLE') navigate('/');
    if (state === 'COMPLETED') navigate('/success');
    if (isExpired) {
      reset();
      navigate('/');
    }
  }, [state, navigate, isExpired, reset]);

  if (loading || !product) {
    return (
      <div className="drop-page drop-page--center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="drop-page drop-page--center">
      <div className="checkout-terminal animate-in">
        <div className="scanner-line" />
        <div className="terminal-header">SECURE_RESERVATION_LINK_ACTIVE</div>
        
        <div className="checkout-main">
          <div className="timer-section">
            <span className="label">LOCK_EXPIRES_IN</span>
            <div className="big-timer">{formattedTime}</div>
            <div className="timer-progress">
              <div 
                className="timer-progress-bar" 
                style={{ width: `${(secondsLeft / 300) * 100}%` }} 
              />
            </div>
          </div>

          <div className="order-summary">
            <h3>SECURE_ORDER_SUMMARY</h3>
            <div className="summary-item">
              <img src="/product.png" alt="" className="mini-thumb" />
              <div>
                <div className="mini-name">{product.name}</div>
                <div className="mini-price">USD {product.price.toFixed(2)}</div>
              </div>
            </div>
          </div>

          <div className="checkout-actions" style={{ display: 'flex', gap: '16px' }}>
            <button className="btn btn--outline" onClick={() => void cancel()}>
               CANCEL
            </button>
            <button 
              className={`btn btn--success ${state === 'CHECKING_OUT' ? 'btn--loading' : ''}`}
              onClick={() => void checkout()}
              disabled={state === 'CHECKING_OUT'}
              style={{ flex: 2 }}
            >
              {state === 'CHECKING_OUT' ? 'FINALIZING...' : (
                <>
                  CONFIRM_TRANSFER
                  <ShieldCheck size={20} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
