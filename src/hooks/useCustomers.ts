import { useState, useEffect } from 'react';
import { subscribeToCustomers } from '@/services/customers';
import { useAuth } from '@/hooks/useAuth';
import type { Customer } from '@/models';

export function useCustomers() {
  const { userProfile } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

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
  }, [userProfile?.businessId]);

  return { customers, loading, error };
}
