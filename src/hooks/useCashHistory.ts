import { useState, useEffect } from 'react';
import { subscribeCashHistory } from '@/services/cash';
import { useAuth } from '@/hooks/useAuth';
import type { CashSession } from '@/models';

export function useCashHistory(limitCount: number = 100) {
  const { userProfile } = useAuth();
  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.businessId) return;
    setLoading(true);
    const unsub = subscribeCashHistory(
      userProfile.businessId,
      limitCount,
      (data) => {
        setSessions(data);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [userProfile?.businessId, limitCount]);

  return { sessions, loading };
}
