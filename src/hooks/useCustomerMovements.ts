import { useState, useEffect } from 'react';
import { subscribeToMovements } from '@/services/customers';
import { useAuth } from '@/hooks/useAuth';
import type { Movement } from '@/models';

export function useCustomerMovements(customerId: string) {
  const { userProfile } = useAuth();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userProfile?.businessId || !customerId) return;
    setLoading(true);
    const unsub = subscribeToMovements(
      userProfile.businessId,
      customerId,
      (data) => {
        setMovements(data);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );
    return unsub;
  }, [userProfile?.businessId, customerId]);

  return { movements, loading, error };
}
