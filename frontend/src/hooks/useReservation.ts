import { useState } from 'react';
import { reservationApi } from '../api/reservationApi';
import { extractApiError } from '../api/client';
import type { ApiErrorResponse } from '../types';

// Explicit state machine — every state transition is intentional
export type ReservationState =
  | 'IDLE'
  | 'RESERVING'
  | 'RESERVED'
  | 'CHECKING_OUT'
  | 'COMPLETED'
  | 'EXPIRED'
  | 'ERROR_STOCK'      // 409 INSUFFICIENT_STOCK — race condition
  | 'ERROR_NETWORK'    // network failure or timeout
  | 'ERROR_OTHER';     // other API errors

interface UseReservationReturn {
  state: ReservationState;
  reservationId: string | null;
  expiresAt: string | null;
  orderId: string | null;
  errorMessage: string | null;
  apiError: ApiErrorResponse | null;
  reserve: (productId: string, quantity: number) => Promise<void>;
  checkout: () => Promise<void>;
  reset: () => void;
}

export const useReservation = (): UseReservationReturn => {
  const [state, setState] = useState<ReservationState>('IDLE');
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [apiError, setApiError] = useState<ApiErrorResponse | null>(null);

  const reserve = async (productId: string, quantity: number): Promise<void> => {
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

      if (parsed.code === 'INSUFFICIENT_STOCK' || parsed.code === 'DUPLICATE_RESERVATION') {
        setState('ERROR_STOCK');
      } else if (parsed.code === 'NETWORK_ERROR' || parsed.code === 'TIMEOUT') {
        setState('ERROR_NETWORK');
      } else {
        setState('ERROR_OTHER');
      }
    }
  };

  const checkout = async (): Promise<void> => {
    if (!reservationId) return;

    setState('CHECKING_OUT');
    setApiError(null);

    try {
      const data = await reservationApi.checkout(reservationId);
      setOrderId(data.orderId);
      setState('COMPLETED');
    } catch (err: unknown) {
      const parsed = extractApiError(err);
      setApiError(parsed);
      setErrorMessage(parsed.error);

      if (parsed.code === 'RESERVATION_EXPIRED') {
        setState('EXPIRED');
      } else if (parsed.code === 'NETWORK_ERROR' || parsed.code === 'TIMEOUT') {
        setState('ERROR_NETWORK');
      } else {
        setState('ERROR_OTHER');
      }
    }
  };

  const reset = (): void => {
    setState('IDLE');
    setReservationId(null);
    setExpiresAt(null);
    setOrderId(null);
    setErrorMessage(null);
    setApiError(null);
  };

  return {
    state,
    reservationId,
    expiresAt,
    orderId,
    errorMessage,
    apiError,
    reserve,
    checkout,
    reset,
  };
};
