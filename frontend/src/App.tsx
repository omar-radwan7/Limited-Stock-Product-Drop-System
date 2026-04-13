import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ReservationProvider } from './context/ReservationContext';
import DropPage from './pages/DropPage';
import CheckoutPage from './pages/CheckoutPage';
import SuccessPage from './pages/SuccessPage';
import './index.css';

const DEMO_PRODUCT_ID = import.meta.env.VITE_DEMO_PRODUCT_ID ?? '00000000-0000-0000-0000-000000000001';

function App() {
  return (
    <Router>
      <ReservationProvider>
        <div className="app">
          <header className="app-header">
            <a className="app-logo" href="/">
              <div className="app-logo__icon">V</div>
              <span className="app-logo__name">VORTEX_SZR</span>
            </a>
            <div className="app-header__pill">LIVE_SYNC</div>
          </header>

          <main className="app-main">
            <Routes>
              <Route path="/" element={<DropPage productId={DEMO_PRODUCT_ID} />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/success" element={<SuccessPage />} />
            </Routes>
          </main>

          <footer className="app-footer">
            &copy; {new Date().getFullYear()} Limited-Stock Product Drop System
          </footer>
        </div>
      </ReservationProvider>
    </Router>
  );
}

export default App;
