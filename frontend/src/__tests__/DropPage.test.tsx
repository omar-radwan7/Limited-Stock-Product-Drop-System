import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';

// --------------------------------------------------------------------------
// Module mocks — must match the actual import paths used in DropPage
// --------------------------------------------------------------------------
vi.mock('../hooks/useProduct', () => ({
  useProduct: vi.fn(),
}));

vi.mock('../context/ReservationContext', () => ({
  useReservationContext: vi.fn(),
}));

import DropPage from '../pages/DropPage';
import { useProduct } from '../hooks/useProduct';
import { useReservationContext } from '../context/ReservationContext';

const mockUseProduct = useProduct as ReturnType<typeof vi.fn>;
const mockUseReservationContext = useReservationContext as ReturnType<typeof vi.fn>;

const defaultReservationHook = {
  state: 'IDLE',
  errorMessage: null,
  reserve: vi.fn(),
  reset: vi.fn(),
};

const renderWithRouter = (ui: React.ReactElement) => {
  return render(ui, { wrapper: BrowserRouter });
};

describe('DropPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner while product is fetching', () => {
    mockUseProduct.mockReturnValue({ product: null, loading: true, error: null, refetch: vi.fn() });
    mockUseReservationContext.mockReturnValue(defaultReservationHook);

    renderWithRouter(<DropPage productId="prod-001" />);

    expect(screen.getByRole('status')).toBeDefined();
    expect(screen.getByText('INITIALIZING_DROP')).toBeDefined();
  });

  it('shows product name and price when loaded', () => {
    mockUseProduct.mockReturnValue({
      product: { id: 'prod-001', name: 'RTX 4090 FE', description: 'Ultimate GPU', price: 1599, stock: 5 },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseReservationContext.mockReturnValue(defaultReservationHook);

    renderWithRouter(<DropPage productId="prod-001" />);

    expect(screen.getByText('RTX 4090 FE')).toBeDefined();
    expect(screen.getByText('$1599.00')).toBeDefined();
  });

  it('shows STOCK_ARCHIVED when stock is 0', () => {
    mockUseProduct.mockReturnValue({
      product: { id: 'prod-001', name: 'RTX 4090 FE', description: 'Ultimate GPU', price: 1599, stock: 0 },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseReservationContext.mockReturnValue(defaultReservationHook);

    renderWithRouter(<DropPage productId="prod-001" />);

    expect(screen.getByText('STOCK_ARCHIVED')).toBeDefined();
  });

  it('calls reserve() when Reserve Now button is clicked', () => {
    const mockReserve = vi.fn();
    mockUseProduct.mockReturnValue({
      product: { id: 'prod-001', name: 'RTX 4090 FE', description: 'Ultimate GPU', price: 1599, stock: 5 },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseReservationContext.mockReturnValue({ ...defaultReservationHook, reserve: mockReserve });

    renderWithRouter(<DropPage productId="prod-001" />);

    fireEvent.click(screen.getByText(/Reserve Now/i));

    expect(mockReserve).toHaveBeenCalledWith('prod-001', 1);
  });

  it('shows error card on Stock Unavailable state', () => {
    mockUseProduct.mockReturnValue({
      product: { id: 'prod-001', name: 'RTX 4090 FE', description: 'Ultimate GPU', price: 1599, stock: 1 },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseReservationContext.mockReturnValue({
      ...defaultReservationHook,
      state: 'ERROR_STOCK',
    });

    renderWithRouter(<DropPage productId="prod-001" />);

    expect(screen.getByText('Stock Unavailable')).toBeDefined();
  });

  it('shows product offline on error state', () => {
    const mockRefetch = vi.fn();
    mockUseProduct.mockReturnValue({
      product: null,
      loading: false,
      error: 'API Error',
      refetch: mockRefetch,
    });
    mockUseReservationContext.mockReturnValue(defaultReservationHook);

    renderWithRouter(<DropPage productId="prod-001" />);

    expect(screen.getByText('PRODUCT_OFFLINE')).toBeDefined();
    fireEvent.click(screen.getByText('RECONNECT'));
    expect(mockRefetch).toHaveBeenCalled();
  });
});
