import { apiClient } from './client';
import type { ReservationResponse, CheckoutResponse } from '../types';

export const reservationApi = {
  createReservation: async (productId: string, quantity: number): Promise<ReservationResponse> => {
    const response = await apiClient.post<ReservationResponse>('/api/reserve', {
      productId,
      quantity,
    });
    return response.data;
  },

  checkout: async (reservationId: string): Promise<CheckoutResponse> => {
    const response = await apiClient.post<CheckoutResponse>('/api/checkout', { reservationId });
    return response.data;
  },

  cancel: async (reservationId: string): Promise<void> => {
    await apiClient.post('/api/cancel', { reservationId });
  },

  fetchActive: async (): Promise<ReservationResponse | null> => {
    const response = await apiClient.get<ReservationResponse | null>('/api/active');
    return response.data;
  },
};
