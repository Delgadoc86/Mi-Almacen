import type { BusinessPlan } from '@/models';

export type PlanStatusKind =
  | 'no-plan'
  | 'suspended'
  | 'readonly'
  | 'pro'
  | 'trial-active'
  | 'trial-ending-soon'
  | 'trial-expired';

export type PlanStatusResult = {
  kind: PlanStatusKind;
  canWrite: boolean;
  daysRemaining: number | null;
  message: string;
};

const TRIAL_WARNING_DAYS = 5;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Los datos de Firestore no están validados en runtime en ningún otro lugar
// del código (todo pasa por `as Business`/`as Product`, casts sin chequeo) —
// pero acá conviene una excepción: cuentas creadas antes de Fase 1 tienen
// `plan: 'free'` (string legacy), no un objeto. Sin este guard, `.trialEndsAt`
// no existiría y `.toMillis()` explotaría en tiempo de ejecución.
function hasPlanShape(plan: unknown): plan is BusinessPlan {
  return Boolean(plan) && typeof plan === 'object' && 'type' in (plan as object) && 'status' in (plan as object);
}

// Helper centralizado de lectura del plan — Fase 2. No se conecta a ninguna
// pantalla todavía (eso es Fase 3/4); es la única fuente de verdad para no
// duplicar esta lógica en cada lugar que necesite saber el estado del plan.
//
// Sin bypass permanente para cuentas sin plan: `no-plan` siempre resuelve en
// `canWrite: false`. No existe hoy ningún negocio real sin plan además del
// del propio fundador (que se corrige a mano por Firestore Console mientras
// no se ejecuta bootstrap-admin), así que esto no bloquea nada existente —
// y evita que una cuenta rota se trate silenciosamente como "todo bien".
export function getPlanStatus(plan: BusinessPlan | undefined | null): PlanStatusResult {
  if (!hasPlanShape(plan)) {
    return {
      kind: 'no-plan',
      canWrite: false,
      daysRemaining: null,
      message: 'No pudimos verificar tu plan. Contactá soporte.',
    };
  }

  // Las decisiones administrativas (suspender, forzar solo lectura) tienen
  // prioridad sobre cualquier otra cosa, sin importar el tipo de plan.
  if (plan.status === 'suspended') {
    return {
      kind: 'suspended',
      canWrite: false,
      daysRemaining: null,
      message: 'Cuenta suspendida. Contactá soporte.',
    };
  }

  if (plan.status === 'readonly') {
    return {
      kind: 'readonly',
      canWrite: false,
      daysRemaining: null,
      message: 'Tu cuenta está en modo solo lectura. Contactá soporte.',
    };
  }

  // type === 'pro' es prioridad: se resuelve ANTES de mirar ninguna fecha de
  // trial. Una cuenta pro puede tener trialStartedAt == trialEndsAt (ver
  // scripts/bootstrap-admin.mjs, placeholder de duración cero) — comparar
  // fechas antes de chequear `type` la leería como "trial ya vencido", que
  // es exactamente el bug que este orden evita.
  if (plan.type === 'pro') {
    return {
      kind: 'pro',
      canWrite: true,
      daysRemaining: null,
      message: 'Plan Pro activo',
    };
  }

  // A partir de acá: plan.type === 'trial' y plan.status === 'active'.
  const now = Date.now();
  const trialEndsAtMs = plan.trialEndsAt.toMillis();
  const daysRemaining = Math.ceil((trialEndsAtMs - now) / MS_PER_DAY);

  if (trialEndsAtMs <= now) {
    return {
      kind: 'trial-expired',
      canWrite: false,
      daysRemaining: 0,
      message: 'Tu prueba terminó. Activá Pro para seguir registrando.',
    };
  }

  if (daysRemaining <= TRIAL_WARNING_DAYS) {
    return {
      kind: 'trial-ending-soon',
      canWrite: true,
      daysRemaining,
      message: `Tu prueba termina en ${daysRemaining} ${daysRemaining === 1 ? 'día' : 'días'}`,
    };
  }

  return {
    kind: 'trial-active',
    canWrite: true,
    daysRemaining,
    message: `Prueba Premium · quedan ${daysRemaining} ${daysRemaining === 1 ? 'día' : 'días'}`,
  };
}
