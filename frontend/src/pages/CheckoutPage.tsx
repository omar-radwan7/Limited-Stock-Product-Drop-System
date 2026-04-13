import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReservationContext } from '../context/ReservationContext';
import { useCountdown } from '../hooks/useCountdown';
import { useProduct } from '../hooks/useProduct';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { state, expiresAt, checkout, cancel, reset, productId } = useReservationContext();
  const { formattedTime, isExpired, secondsLeft } = useCountdown(expiresAt);
  const { product, loading } = useProduct(productId || '');

  useEffect(() => {
    if (state === 'IDLE') navigate('/');
    if (state === 'COMPLETED') {
        reset();
        navigate('/');
    }
    if (isExpired) { reset(); navigate('/'); }
  }, [state, navigate, isExpired, reset]);

  if (loading || !product) return <div className="drop-page drop-page--center"><div className="spinner" /></div>;

  const subtotal = product.price;
  const shipping = 25.00;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  return (
    <div className="checkout-page animate-in">
      <div className="checkout-container">
        {/* ── Left Column: Personal Details ── */}
        <div className="checkout-form-section">
          <h2>Shipping Information</h2>
          
          <div className="mock-form">
            <div className="form-group"><label>Full Name</label><input type="text" placeholder="Omar Radwan" disabled /></div>
            <div className="form-group"><label>Shipping Address</label><input type="text" placeholder="123 Developer St, Tech City" disabled /></div>
            <div className="form-group"><label>Email Address</label><input type="text" placeholder="omar.radwan@example.com" disabled /></div>
          </div>
        </div>

        {/* ── Right Column: Order Summary ── */}
        <div className="checkout-summary-section">
          <div className="timer-pill">
            <span className="label">Reservation expires in:</span>
            <span className="time">{formattedTime}</span>
            <div className="timer-bar-mini">
              <div className="timer-bar-fill" style={{ width: `${(secondsLeft / 300) * 100}%` }} />
            </div>
          </div>

          <div className="summary-item-card">
            <img src={product.imageUrl || '/product.png'} alt={product.name} />
            <div>
              <h3>{product.name}</h3>
              <p className="price">${product.price.toLocaleString()}</p>
            </div>
          </div>

          <div className="price-breakdown">
            <div className="price-row"><span>SUBTOTAL</span> <span>USD {subtotal.toFixed(2)}</span></div>
            <div className="price-row"><span>SHIPPING_EXPRESS</span> <span>USD {shipping.toFixed(2)}</span></div>
            <div className="price-row"><span>EST_SALES_TAX</span> <span>USD {tax.toFixed(2)}</span></div>
            <div className="price-row total"><span>TOTAL_DUE</span> <span>USD {total.toFixed(2)}</span></div>
          </div>

          <div className="final-actions">
            <button 
              className={`btn btn--primary ${state === 'CHECKING_OUT' ? 'btn--loading' : ''}`}
              onClick={() => void checkout()}
              disabled={state === 'CHECKING_OUT'}
            >
              {state === 'CHECKING_OUT' ? 'EXECUTING...' : 'CONFIRM_ACQUISITION'}
            </button>
            <button className="btn btn--link" onClick={() => void cancel()}>
              RELEASE_RESERVATION
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
