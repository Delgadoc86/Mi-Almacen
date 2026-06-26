import { useState, useEffect } from 'react';
import { subscribeLatestSession } from '@/services/cash';
import { useAuth } from '@/hooks/useAuth';
import type { CashSession } from '@/models';

// Retorna la sesión más reciente (abierta o cerrada).
// `session` es null solo si el negocio nunca tuvo una caja.
export function useCashSession() {
  const { userProfile } = useAuth();
  const [session, setSession] = useState<CashSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userProfile?.businessId) return;
    setLoading(true);
    const unsub = subscribeLatestSession(
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
