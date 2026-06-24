import { useState, useEffect } from 'react';
import { subscribeTodaySession } from '@/services/cash';
import { useAuth } from '@/hooks/useAuth';
import type { CashSession } from '@/models';

export function useCashSession() {
  const { userProfile } = useAuth();
  const [session, setSession] = useState<CashSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userProfile?.businessId) return;
    setLoading(true);
    const unsub = subscribeTodaySession(
      userProfile.businessId,
      (data) => {
        setSession(data);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );
    return unsub;
  }, [userProfile?.businessId]);

  return { session, loading, error };
}
