import { useCallback, useState } from 'react';
import { useAuth } from './useAuth';

// Gate independiente del plan: exige únicamente que el listener de negocio
// haya confirmado su estado con el servidor (`synced`/`missing`), sin mirar
// plan/status — para acciones que deben seguir disponibles con el plan
// vencido, en solo lectura o suspendido (ej. solicitar eliminación de
// cuenta), pero que igual escriben en Firestore y por lo tanto necesitan
// conexión real. Si hace falta bloquear también por plan, usar
// useWriteGuard (requireWrite) en su lugar — no combinar ambos en un mismo
// call site.
export function useConnectionGuard() {
  const { businessSyncStatus } = useAuth();
  const isConnected = businessSyncStatus === 'synced' || businessSyncStatus === 'missing';

  const [restrictionMessage, setRestrictionMessage] = useState<string | null>(null);

  const requireOnline = useCallback(
    (action: () => void, message: string) => {
      if (isConnected) {
        action();
        return;
      }
      setRestrictionMessage(message);
    },
    [isConnected],
  );

  const dismissRestriction = useCallback(() => setRestrictionMessage(null), []);

  return { isConnected, requireOnline, restrictionMessage, dismissRestriction };
}
