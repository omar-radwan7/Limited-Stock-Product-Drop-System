import { useState, useEffect, useCallback } from 'react';
import { productApi } from '../api/productApi';
import type { Product } from '../types';

interface UseProductReturn {
  product: Product | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useProduct = (productId: string): UseProductReturn => {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProduct = useCallback(async () => {
    try {
      const data = await productApi.getProduct(productId);
      setProduct(data);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch product';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void fetchProduct();

    // Poll every 5 seconds to keep stock count fresh
    const interval = setInterval(() => {
      void fetchProduct();
    }, 5_000);

    return () => clearInterval(interval);
  }, [fetchProduct]);

  return { product, loading, error, refetch: fetchProduct };
};
