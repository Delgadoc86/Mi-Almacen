import type { PlanStatusKind, PlanStatusResult } from './planStatus';
import type { BusinessSyncStatus } from '@/context/AuthContext';

export type SyncAwarePlanStatusKind = PlanStatusKind | 'sync-loading' | 'sync-stale' | 'sync-error';

export type SyncAwarePlanStatus = {
  kind: SyncAwarePlanStatusKind;
  canWrite: boolean;
  daysRemaining: number | null;
  message: string;
};

const SYNC_MESSAGE: Record<'loading' | 'stale' | 'error', string> = {
  loading: 'Estamos validando tu cuenta. Esperá un momento.',
  // Nunca sugerir que el cambio "queda pendiente" o "se sincronizará
  // luego" — hoy no existe ninguna cola offline, así que decirlo sería
  // prometer algo que la app no hace (ver OfflineBanner).
  stale: 'Estás sin conexión. Para registrar este cambio, conectate a Internet.',
  error: 'No pudimos validar tu plan. Contactá soporte.',
};

// Pura, sin React ni Firebase — testeable directo con node:test (ver
// resolvePlanStatus.test.ts), igual que planStatus.ts. Combina el resultado
// de getPlanStatus() (Fase 2, sin tocar) con el estado del listener en
// tiempo real de businesses/{uid} (Fase 4.1, AuthContext).
//
// El plan nunca decide "puedo escribir" sin que el listener haya CONFIRMADO
// que ese plan es el vigente. `synced` y `missing` son las únicas dos
// confirmaciones reales (el negocio existe y está al día, o confirmadamente
// no existe). `loading`/`stale`/`error` bloquean escritura SIEMPRE, sin
// importar lo que diga el plan cacheado — no se inventan permisos por cache.
export function resolveSyncAwarePlanStatus(
  base: PlanStatusResult,
  syncStatus: BusinessSyncStatus,
): SyncAwarePlanStatus {
  switch (syncStatus) {
    case 'synced':
    case 'missing':
      return base;
    case 'loading':
      return { kind: 'sync-loading', canWrite: false, daysRemaining: null, message: SYNC_MESSAGE.loading };
    case 'stale':
      return { kind: 'sync-stale', canWrite: false, daysRemaining: null, message: SYNC_MESSAGE.stale };
    case 'error':
      return { kind: 'sync-error', canWrite: false, daysRemaining: null, message: SYNC_MESSAGE.error };
    default:
      return base;
  }
}
