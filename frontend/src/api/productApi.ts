import { apiClient } from './client';
import type { Product, PaginatedProducts } from '../types';

export const productApi = {
  list: async (page = 1, limit = 10) => {
    const response = await apiClient.get<{ data: Product[]; pagination: any }>('/api/products', {
      params: { page, limit },
    });
    return response.data;
  },

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
