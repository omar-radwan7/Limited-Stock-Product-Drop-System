import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReservationContext } from '../context/ReservationContext';
import { ShieldCheck, RefreshCw } from 'lucide-react';

const SuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const { state, orderId, reset } = useReservationContext();

  useEffect(() => {
    if (state !== 'COMPLETED') navigate('/');
  }, [state, navigate]);

  const handleReturn = () => {
    reset();
    navigate('/');
  };

  return (
    <div className="drop-page drop-page--center">
      <div className="success-terminal animate-in">
        <div className="terminal-header">TRANSACTION_SUCCESSFUL</div>
        <ShieldCheck size={80} className="success-icon" style={{ color: 'var(--success)', margin: '0 auto 24px' }} />
        <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: '32px' }}>TRANSFER_COMPLETE</h1>
        
        <div className="receipt-data">
          <div className="receipt-row"><span>STATUS</span> <span className="text-success">CONFIRMED_ON_CHAIN</span></div>
          <div className="receipt-row"><span>ORDER_ID</span> <span style={{ fontFamily: 'monospace' }}>#{orderId?.slice(0, 12).toUpperCase()}</span></div>
        </div>

        <button className="btn btn--outline" onClick={handleReturn} style={{ marginTop: '32px' }}>
          <RefreshCw size={18} /> RETURN_TO_STORE
        </button>
      </div>
    </div>
  );
};

export default SuccessPage;
