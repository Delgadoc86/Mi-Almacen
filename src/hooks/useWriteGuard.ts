import { useCallback, useState } from 'react';
import { usePlanStatus } from './usePlanStatus';
import type { SyncAwarePlanStatusKind } from '@/utils/resolvePlanStatus';

// Mensajes del modal de bloqueo — Fase 4. La decisión de bloquear o no viene
// siempre de `canWrite`/`kind` (usePlanStatus, que a su vez viene de
// getPlanStatus + el estado del listener en tiempo real, Fase 4.1). Ningún
// llamador de este hook vuelve a mirar plan.type/status/trialEndsAt por su
// cuenta.
//
// Solo cubre los 4 kinds "de plan" con texto histórico propio del modal
// (a veces distinto del texto del banner, ej. "suspended"). Los kinds
// nuevos de sincronización (`sync-*`, Fase 4.1) no están acá a propósito:
// no hay un texto de modal distinto que mantener a mano — se usa
// directamente `status.message`, que ya resuelve el texto correcto en un
// solo lugar (usePlanStatus). Ver el fallback más abajo.
const RESTRICTION_MESSAGE_BY_KIND: Partial<Record<SyncAwarePlanStatusKind, string>> = {
  'trial-expired': 'Tu prueba terminó. Activá Pro para seguir registrando.',
  readonly: 'Tu cuenta está en modo solo lectura. Contactá soporte.',
  suspended: 'Tu cuenta está suspendida. Contactá soporte.',
  'no-plan': 'No pudimos validar el estado de tu cuenta. Contactá soporte.',
};

const FALLBACK_MESSAGE = 'No podés hacer esta acción ahora. Contactá soporte.';

// Mecanismo reutilizable de Fase 4: envolver cualquier acción que escriba en
// Firestore con `requireWrite(accion)`. Si `canWrite` es true, la acción se
// ejecuta normalmente. Si es false, se muestra el mensaje correspondiente al
// `kind` actual en vez de ejecutarla — nunca un error técnico de Firestore,
// nunca silencio (el usuario siempre recibe un mensaje claro de por qué no
// pasó nada). `canWrite` viene ya resuelto por usePlanStatus() considerando
// el estado del listener en tiempo real — un formulario abierto que pierde
// `canWrite` mientras está abierto (el plan cambió, o se cayó la conexión)
// bloquea la confirmación en el mismo instante en que se vuelve a evaluar,
// sin necesidad de que la pantalla haga nada especial.
export function useWriteGuard() {
  const status = usePlanStatus();

  const [restrictionMessage, setRestrictionMessage] = useState<string | null>(null);

  const requireWrite = useCallback(
    (action: () => void) => {
      if (status.canWrite) {
        action();
        return;
      }
      setRestrictionMessage(
        RESTRICTION_MESSAGE_BY_KIND[status.kind] ?? status.message ?? FALLBACK_MESSAGE,
      );
    },
    [status.canWrite, status.kind, status.message],
  );

  const dismissRestriction = useCallback(() => setRestrictionMessage(null), []);

  return { canWrite: status.canWrite, requireWrite, restrictionMessage, dismissRestriction };
}
