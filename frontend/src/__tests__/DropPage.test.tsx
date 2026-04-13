import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// --------------------------------------------------------------------------
// Module mocks — must match the actual import paths used in DropPage's hooks
// --------------------------------------------------------------------------
vi.mock('../hooks/useProduct', () => ({
  useProduct: vi.fn(),
}));

vi.mock('../hooks/useReservation', () => ({
  useReservation: vi.fn(),
}));

vi.mock('../hooks/useCountdown', () => ({
  useCountdown: vi.fn(() => ({ formattedTime: '05:00', isExpired: false, secondsLeft: 300 })),
}));

import DropPage from '../pages/DropPage';
import { useProduct } from '../hooks/useProduct';
import { useReservation } from '../hooks/useReservation';

// --------------------------------------------------------------------------
// Helper: set up hook return values
// --------------------------------------------------------------------------
const mockUseProduct = useProduct as ReturnType<typeof vi.fn>;
const mockUseReservation = useReservation as ReturnType<typeof vi.fn>;

const defaultReservationHook = {
  state: 'IDLE',
  expiresAt: null,
  orderId: null,
  errorMessage: null,
  apiError: null,
  reserve: vi.fn(),
  checkout: vi.fn(),
  reset: vi.fn(),
};

describe('DropPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner while product is fetching', () => {
    mockUseProduct.mockReturnValue({ product: null, loading: true, error: null, refetch: vi.fn() });
    mockUseReservation.mockReturnValue(defaultReservationHook);

    render(<DropPage productId="prod-001" />);

    expect(screen.getByRole('status')).toBeDefined();
    expect(screen.getByText('INITIALIZING_DROP')).toBeDefined();
  });

  it('shows product name and price when loaded', () => {
    mockUseProduct.mockReturnValue({
      product: { id: 'prod-001', name: 'Air Drop Sneaker', description: 'Rare', price: 199, stock: 5, createdAt: '' },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseReservation.mockReturnValue(defaultReservationHook);

    render(<DropPage productId="prod-001" />);

    expect(screen.getByText('Air Drop Sneaker')).toBeDefined();
    expect(screen.getByText('USD 199.00')).toBeDefined();
  });

  it('disables Reserve button and shows "SOLD_OUT" when stock is 0', () => {
    mockUseProduct.mockReturnValue({
      product: { id: 'prod-001', name: 'Air Drop Sneaker', description: 'Rare', price: 199, stock: 0, createdAt: '' },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseReservation.mockReturnValue(defaultReservationHook);

    render(<DropPage productId="prod-001" />);

    const reserveBtn = screen.getByRole('button', { name: /sold_out/i }) as HTMLButtonElement;
    expect(reserveBtn.disabled).toBe(true);
  });

  it('calls reserve() when RESERVE_UNIT button is clicked', () => {
    const mockReserve = vi.fn();
    mockUseProduct.mockReturnValue({
      product: { id: 'prod-001', name: 'Air Drop Sneaker', description: 'Rare', price: 199, stock: 5, createdAt: '' },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseReservation.mockReturnValue({ ...defaultReservationHook, reserve: mockReserve });

    render(<DropPage productId="prod-001" />);

    fireEvent.click(screen.getByText(/RESERVE_UNIT/i));

    expect(mockReserve).toHaveBeenCalledWith('prod-001', 1);
  });

  it('shows error panel on ERROR_STOCK state', () => {
    mockUseProduct.mockReturnValue({
      product: { id: 'prod-001', name: 'Air Drop Sneaker', description: 'Rare', price: 199, stock: 0, createdAt: '' },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseReservation.mockReturnValue({
      ...defaultReservationHook,
      state: 'ERROR_STOCK',
      apiError: { error: 'Insufficient stock available', code: 'INSUFFICIENT_STOCK', statusCode: 409 },
      errorMessage: 'Insufficient stock available',
    });

    render(<DropPage productId="prod-001" />);

    expect(screen.getByText('TRANSACTION_ERROR')).toBeDefined();
  });

  it('shows countdown and checkout button in RESERVED state', () => {
    mockUseProduct.mockReturnValue({
      product: { id: 'prod-001', name: 'Air Drop Sneaker', description: 'Rare', price: 199, stock: 4, createdAt: '' },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseReservation.mockReturnValue({
      ...defaultReservationHook,
      state: 'RESERVED',
      expiresAt: new Date(Date.now() + 300_000).toISOString(),
    });

    render(<DropPage productId="prod-001" />);

    expect(screen.getByText('COMPLETE_PURCHASE')).toBeDefined();
    expect(screen.getByText('05:00')).toBeDefined();
  });

  it('shows error panel with retry button on ERROR_NETWORK state', () => {
    const mockReserve = vi.fn();
    mockUseProduct.mockReturnValue({
      product: { id: 'prod-001', name: 'Air Drop Sneaker', description: 'Rare', price: 199, stock: 5, createdAt: '' },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseReservation.mockReturnValue({
      ...defaultReservationHook,
      state: 'ERROR_NETWORK',
      errorMessage: 'Network error',
      reserve: mockReserve,
    });

    render(<DropPage productId="prod-001" />);

    expect(screen.getByText('CONNECTION_LOST')).toBeDefined();
    fireEvent.click(screen.getByText('RETRY_TRANSACTION'));
    expect(mockReserve).toHaveBeenCalled();
  });
});
