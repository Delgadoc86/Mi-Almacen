// Tests unitarios puros — sin React, sin Firebase. Misma convención que
// planStatus.test.ts (node:test + type-stripping de Node, ver package.json
// "test:unit").
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSyncAwarePlanStatus } from './resolvePlanStatus.ts';
import type { PlanStatusResult } from './planStatus.ts';

const proBase: PlanStatusResult = {
  kind: 'pro',
  canWrite: true,
  daysRemaining: null,
  message: 'Plan Pro activo',
};

const noPlanBase: PlanStatusResult = {
  kind: 'no-plan',
  canWrite: false,
  daysRemaining: null,
  message: 'No pudimos verificar tu plan. Contactá soporte.',
};

test('synced devuelve el resultado base sin modificar', () => {
  const result = resolveSyncAwarePlanStatus(proBase, 'synced');
  assert.deepEqual(result, proBase);
});

test('missing devuelve el resultado base sin modificar', () => {
  // En la práctica business=null implica base=no-plan, pero la función pura
  // no depende de ese acoplamiento — se prueba genérico.
  const result = resolveSyncAwarePlanStatus(noPlanBase, 'missing');
  assert.deepEqual(result, noPlanBase);
});

test('loading bloquea escritura aunque el plan base diga Pro (no se inventan permisos por cache)', () => {
  const result = resolveSyncAwarePlanStatus(proBase, 'loading');
  assert.equal(result.kind, 'sync-loading');
  assert.equal(result.canWrite, false);
});

test('stale bloquea escritura aunque el plan cacheado diga Pro, con mensaje de sin conexión', () => {
  const result = resolveSyncAwarePlanStatus(proBase, 'stale');
  assert.equal(result.kind, 'sync-stale');
  assert.equal(result.canWrite, false);
  assert.match(result.message, /sin conexión/i);
});

test('error bloquea escritura aunque el plan base diga Pro', () => {
  const result = resolveSyncAwarePlanStatus(proBase, 'error');
  assert.equal(result.kind, 'sync-error');
  assert.equal(result.canWrite, false);
});
