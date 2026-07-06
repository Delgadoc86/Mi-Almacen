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
  const [retryKey, setRetryKey] = useState(0);

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
    // retryKey solo fuerza la resuscripción manual — no es un dato real.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.businessId, retryKey]);

  const retry = () => setRetryKey((k) => k + 1);

  return { session, loading, error, retry };
}
