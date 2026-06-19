import { useState, useEffect } from 'react';
import { getOrSeedCategories, subscribeToCategories } from '@/services/categories';
import { useAuth } from '@/hooks/useAuth';
import type { Category } from '@/models';

export function useCategories() {
  const { userProfile } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userProfile?.businessId) return;
    const bizId = userProfile.businessId;
    let unsubscribe: (() => void) | undefined;

    getOrSeedCategories(bizId)
      .then(() => {
        unsubscribe = subscribeToCategories(
          bizId,
          (cats) => {
            setCategories(cats);
            setLoading(false);
          },
          (err) => {
            setError(err);
            setLoading(false);
          },
        );
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err : new Error('Error al cargar categorías.'));
        setLoading(false);
      });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userProfile?.businessId]);

  return { categories, loading, error };
}
