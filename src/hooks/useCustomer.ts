import { useState, useEffect } from 'react';
import { subscribeToCustomer } from '@/services/customers';
import { useAuth } from '@/hooks/useAuth';
import type { Customer } from '@/models';

export function useCustomer(customerId: string) {
  const { userProfile } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.businessId || !customerId) return;
    setLoading(true);
    return subscribeToCustomer(
      userProfile.businessId,
      customerId,
      (data) => {
        setCustomer(data);
        setLoading(false);
      },
      () => {
        setCustomer(null);
        setLoading(false);
      },
    );
  }, [userProfile?.businessId, customerId]);

  return { customer, loading };
}
