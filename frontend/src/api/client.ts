import axios, { AxiosError, isAxiosError } from 'axios';
import type { ApiErrorResponse } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request automatically
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || import.meta.env.VITE_TEST_TOKEN;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Extracts a typed error from an Axios failure.
 * Always returns an ApiErrorResponse — never throws raw unknown.
 */
export const extractApiError = (err: unknown): ApiErrorResponse => {
  if (isAxiosError(err)) {
    const axiosErr = err as AxiosError<ApiErrorResponse>;
    if (axiosErr.response?.data) {
      return axiosErr.response.data;
    }
    if (axiosErr.code === 'ECONNABORTED') {
      return { error: 'Request timed out', code: 'TIMEOUT', statusCode: 408 };
    }
    return { error: 'Network error — please check your connection', code: 'NETWORK_ERROR', statusCode: 0 };
  }
  return { error: 'An unexpected error occurred', code: 'UNKNOWN', statusCode: 500 };
};
