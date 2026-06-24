import { useState, useEffect } from 'react';
import { subscribeCashMovements } from '@/services/cash';
import { useAuth } from '@/hooks/useAuth';
import type { CashMovement } from '@/models';

export function useCashMovements(sessionId: string | null, limitCount: number = 5) {
  const { userProfile } = useAuth();
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.businessId || !sessionId) {
      setMovements([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeCashMovements(
      userProfile.businessId,
      sessionId,
      limitCount,
      (data) => {
        setMovements(data);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [userProfile?.businessId, sessionId, limitCount]);

  return { movements, loading };
}
