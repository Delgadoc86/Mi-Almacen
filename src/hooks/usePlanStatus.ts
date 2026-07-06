import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { getPlanStatus } from '@/utils/planStatus';
import { resolveSyncAwarePlanStatus } from '@/utils/resolvePlanStatus';
import type { SyncAwarePlanStatus } from '@/utils/resolvePlanStatus';

// Reusa el `business`/`businessSyncStatus` que ya escucha AuthContext (Fase
// 4.1) — no dispara ninguna lectura ni suscripción nueva de Firestore.
// getPlanStatus() sigue siendo la única lógica que traduce `plan` a un
// estado usable por UI; resolveSyncAwarePlanStatus() (pura, sin React —
// ver src/utils/resolvePlanStatus.ts) la combina con el estado de
// sincronización. Este hook solo conecta ambas cosas con React y memoiza.
export function usePlanStatus(): SyncAwarePlanStatus {
  const { business, businessSyncStatus } = useAuth();
  const base = useMemo(() => getPlanStatus(business?.plan), [business?.plan]);
  return useMemo(
    () => resolveSyncAwarePlanStatus(base, businessSyncStatus),
    [base, businessSyncStatus],
  );
}
