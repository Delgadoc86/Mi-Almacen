// Clasificación de plan usada por el panel admin — es una réplica intencional
// (no un import compartido) de la prioridad definida en
// src/utils/planStatus.ts: suspended > readonly > pro > fecha de trial.
// No se comparte el módulo entre app y functions porque son dos paquetes npm
// separados sin build step común; esta réplica es pequeña y solo cambia si
// getPlanStatus() cambia, lo cual es raro (ver nota "no modificar planStatus.ts
// salvo que sea estrictamente necesario" en el historial del proyecto).
const KIND = {
  NO_PLAN: 'no-plan',
  SUSPENDED: 'suspended',
  READONLY: 'readonly',
  PRO: 'pro',
  TRIAL_ACTIVE: 'trial-active',
  TRIAL_EXPIRED: 'trial-expired',
};

function hasPlanShape(plan) {
  return Boolean(plan) && typeof plan === 'object' && 'type' in plan && 'status' in plan;
}

function classifyPlan(plan) {
  if (!hasPlanShape(plan)) return KIND.NO_PLAN;
  if (plan.status === 'suspended') return KIND.SUSPENDED;
  if (plan.status === 'readonly') return KIND.READONLY;
  if (plan.type === 'pro') return KIND.PRO;
  const trialEndsAtMs = plan.trialEndsAt && typeof plan.trialEndsAt.toMillis === 'function'
    ? plan.trialEndsAt.toMillis()
    : null;
  if (trialEndsAtMs === null) return KIND.NO_PLAN;
  return trialEndsAtMs <= Date.now() ? KIND.TRIAL_EXPIRED : KIND.TRIAL_ACTIVE;
}

module.exports = { KIND, classifyPlan };
