import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { reservationApi } from '../api/reservationApi';
import { extractApiError } from '../api/client';
import type { ApiErrorResponse } from '../types';

export type ReservationState =
  | 'IDLE'
  | 'RESERVING'
  | 'RESERVED'
  | 'CHECKING_OUT'
  | 'COMPLETED'
  | 'EXPIRED'
  | 'ERROR_STOCK'
  | 'ERROR_NETWORK'
  | 'ERROR_OTHER';

interface ReservationContextType {
  state: ReservationState;
  reservationId: string | null;
  expiresAt: string | null;
  orderId: string | null;
  errorMessage: string | null;
  apiError: ApiErrorResponse | null;
  reserve: (productId: string, quantity: number) => Promise<void>;
  checkout: () => Promise<void>;
  cancel: () => Promise<void>;
  reset: () => void;
}

const ReservationContext = createContext<ReservationContextType | undefined>(undefined);

export const ReservationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ReservationState>('IDLE');
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [apiError, setApiError] = useState<ApiErrorResponse | null>(null);

  // Auto-resume existing session on mount
  useEffect(() => {
    const resumeSession = async () => {
      try {
        const active = await reservationApi.fetchActive();
        if (active) {
          setReservationId(active.reservationId);
          setExpiresAt(active.expiresAt);
          setState('RESERVED');
        }
      } catch (err) {
        console.error('Failed to auto-resume session:', err);
      }
    };
    void resumeSession();
  }, []);

  const reserve = useCallback(async (productId: string, quantity: number) => {
    setState('RESERVING');
    setApiError(null);
    setErrorMessage(null);

    try {
      const data = await reservationApi.createReservation(productId, quantity);
      setReservationId(data.reservationId);
      setExpiresAt(data.expiresAt);
      setState('RESERVED');
    } catch (err: unknown) {
      const parsed = extractApiError(err);
      setApiError(parsed);
      setErrorMessage(parsed.error);
      setState(parsed.code === 'INSUFFICIENT_STOCK' ? 'ERROR_STOCK' : 'ERROR_OTHER');
    }
  }, []);

  const checkout = useCallback(async () => {
    if (!reservationId) return;
    setState('CHECKING_OUT');

    try {
      const data = await reservationApi.checkout(reservationId);
      setOrderId(data.orderId);
      setState('COMPLETED');
    } catch (err: unknown) {
      const parsed = extractApiError(err);
      setApiError(parsed);
      setErrorMessage(parsed.error);
      setState(parsed.code === 'RESERVATION_EXPIRED' ? 'EXPIRED' : 'ERROR_OTHER');
    }
  }, [reservationId]);

  const cancel = useCallback(async () => {
    if (!reservationId) {
      reset();
      return;
    }
    
    try {
      await reservationApi.cancel(reservationId);
    } catch (err) {
      console.error('Failed to cancel on backend:', err);
    } finally {
      reset();
    }
  }, [reservationId]);

  const reset = useCallback(() => {
    setState('IDLE');
    setReservationId(null);
    setExpiresAt(null);
    setOrderId(null);
    setErrorMessage(null);
    setApiError(null);
  }, []);

  return (
    <ReservationContext.Provider value={{
      state, reservationId, expiresAt, orderId, errorMessage, apiError, reserve, checkout, cancel, reset
    }}>
      {children}
    </ReservationContext.Provider>
  );
};

export const useReservationContext = () => {
  const context = useContext(ReservationContext);
  if (!context) throw new Error('useReservationContext must be used within a ReservationProvider');
  return context;
};
