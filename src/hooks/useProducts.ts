import { useState, useEffect } from 'react';
import { subscribeToProducts } from '@/services/products';
import { useAuth } from '@/hooks/useAuth';
import type { Product } from '@/models';

export function useProducts() {
  const { userProfile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userProfile?.businessId) return;
    setLoading(true);
    const unsub = subscribeToProducts(
      userProfile.businessId,
      (data) => {
        setProducts(data);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );
    return unsub;
  }, [userProfile?.businessId]);

  return { products, loading, error };
}
