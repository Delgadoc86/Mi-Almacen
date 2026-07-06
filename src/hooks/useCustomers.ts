import { useState, useEffect } from 'react';
import { subscribeToCustomers } from '@/services/customers';
import { useAuth } from '@/hooks/useAuth';
import type { Customer } from '@/models';

export function useCustomers() {
  const { userProfile } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!userProfile?.businessId) return;
    setLoading(true);
    const unsub = subscribeToCustomers(
      userProfile.businessId,
      (data) => {
        setCustomers(data);
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

  return { customers, loading, error, retry };
}
