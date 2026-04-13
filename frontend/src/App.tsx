import { BrowserRouter as Router, Routes, Route, Link, useParams } from 'react-router-dom';
import { ReservationProvider } from './context/ReservationContext';
import ProductListPage from './pages/ProductListPage';
import DropPage from './pages/DropPage';
import CheckoutPage from './pages/CheckoutPage';
import SuccessPage from './pages/SuccessPage';
import './index.css';

const DropPageWrapper = () => {
  const { productId } = useParams<{ productId: string }>();
  return <DropPage productId={productId || ''} />;
};

function App() {
  return (
    <Router>
      <ReservationProvider>
        <div className="app">
          <header className="app-header">
            <Link className="app-logo" to="/">
              {/* Logo removed as per request */}
            </Link>
          </header>

          <main className="app-main">
            <Routes>
              <Route path="/" element={<ProductListPage />} />
              <Route path="/drop/:productId" element={<DropPageWrapper />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/success" element={<SuccessPage />} />
            </Routes>
          </main>

          <footer className="app-footer">
            &copy; {new Date().getFullYear()} Limited-Stock Product Boutique
          </footer>
        </div>
      </ReservationProvider>
    </Router>
  );
}

export default App;
