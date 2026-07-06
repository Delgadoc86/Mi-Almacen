import { Linking, type StyleProp, type ViewStyle } from 'react-native';
import { InlineMessage } from '@/components/ui';
import { usePlanStatus } from '@/hooks/usePlanStatus';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { SUPPORT_URL } from '@/constants';
import type { SyncAwarePlanStatusKind } from '@/utils/resolvePlanStatus';

type Variant = 'error' | 'success' | 'warning' | 'info';

// Tono visual por estado. `error`/rojo queda reservado exclusivamente para
// `suspended` (la única acción punitiva real hoy). `trial-expired` y
// `readonly` usan warning/ámbar — el texto de cada uno (definido en
// getPlanStatus()) ya distingue el motivo, el color no necesita hacerlo.
// `sync-*` (Fase 4.1, mientras no se puede confirmar el plan en tiempo
// real) tampoco usa rojo — es un problema de conexión, no una sanción.
const TONE_BY_KIND: Record<SyncAwarePlanStatusKind, Variant> = {
  'no-plan': 'warning',
  suspended: 'error',
  readonly: 'warning',
  pro: 'success',
  'trial-active': 'info',
  'trial-ending-soon': 'warning',
  'trial-expired': 'warning',
  'sync-loading': 'info',
  'sync-stale': 'warning',
  'sync-error': 'warning',
};

type Props = {
  style?: StyleProp<ViewStyle>;
};

// Kinds "sanos" — no requieren ninguna decisión ni acción del cliente.
// El banner completo se omite en estos casos en TODAS las pantallas de
// trabajo (repetirlo en cada tab durante los ~25 días de trial "normal"
// es justo el tipo de aviso que un cliente aprende a ignorar). El único
// lugar donde este estado se sigue mostrando es Configuración, como un
// dato de cuenta discreto — ver el indicador propio en settings.tsx,
// que reusa este mismo set para decidir cuándo mostrarse.
export const HEALTHY_PLAN_KINDS = new Set<SyncAwarePlanStatusKind>(['pro', 'trial-active']);

// Label del CTA por kind — distingue "activar Pro" (trial por vencer o
// vencido, es una venta) de "contactar soporte" (cuenta suspendida/solo
// lectura/sin plan, es un problema a resolver). `trial-active` no tiene
// entrada acá: ya no llega a este componente (ver HEALTHY_PLAN_KINDS) — el
// CTA de activar Pro durante el trial temprano vive en el indicador
// discreto de Configuración, no en un banner repetido en cada pantalla.
const CONTACT_LABEL_BY_KIND: Partial<Record<SyncAwarePlanStatusKind, string>> = {
  'trial-ending-soon': 'Activar Pro',
  'trial-expired': 'Activar Pro',
  'no-plan': 'Contactar soporte',
  suspended: 'Contactar soporte',
  readonly: 'Contactar soporte',
};

export function openSupportSite() {
  Linking.openURL(SUPPORT_URL).catch(() => {});
}

// Puramente informativo — el bloqueo de acciones lo hace useWriteGuard().
//
// Mientras el dispositivo está sin conexión, OfflineBanner (global, arriba
// de todos los tabs) ya cubre ese estado — este banner cede por completo
// para no competir visualmente ni mostrar un mensaje de plan a la vez que
// el de "Solo lectura".
export function PlanBanner({ style }: Props) {
  const status = usePlanStatus();
  const { isOnline } = useNetworkStatus();
  if (!isOnline) return null;
  if (HEALTHY_PLAN_KINDS.has(status.kind)) return null;
  const actionLabel = CONTACT_LABEL_BY_KIND[status.kind];
  return (
    <InlineMessage
      variant={TONE_BY_KIND[status.kind]}
      text={status.message}
      style={style}
      actionLabel={actionLabel}
      onPressAction={actionLabel ? openSupportSite : undefined}
    />
  );
}
