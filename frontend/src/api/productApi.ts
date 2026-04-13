import { apiClient } from './client';
import type { Product, PaginatedProducts } from '../types';

export const productApi = {
  getProducts: async (page = 1, limit = 10): Promise<PaginatedProducts> => {
    const response = await apiClient.get<PaginatedProducts>('/api/products', {
      params: { page, limit },
    });
    return response.data;
  },

  getProduct: async (id: string): Promise<Product> => {
    const response = await apiClient.get<Product>(`/api/products/${id}`);
    return response.data;
  },
};
