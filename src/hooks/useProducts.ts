import { useState, useEffect } from 'react';
import { subscribeToProducts } from '@/services/products';
import { useAuth } from '@/hooks/useAuth';
import type { Product } from '@/models';

export function useProducts() {
  const { userProfile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryKey, setRetryKey] = useState(0);

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
    // retryKey solo fuerza la resuscripción manual — no es un dato real.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.businessId, retryKey]);

  const retry = () => setRetryKey((k) => k + 1);

  return { products, loading, error, retry };
}
