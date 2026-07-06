// Tests unitarios puros — sin Firebase, sin emulador. Corren con el
// type-stripping experimental de Node (ver package.json, script "test:unit"),
// consistente con node:test que ya se usa en scripts/rules-tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import { getPlanStatus } from './planStatus.ts';
import type { BusinessPlan } from '@/models';

// Fake mínimo de Timestamp — getPlanStatus solo necesita .toMillis().
function fakeTimestamp(ms: number) {
  return { toMillis: () => ms } as unknown as BusinessPlan['trialEndsAt'];
}

const DAY = 24 * 60 * 60 * 1000;
const TRIAL_WARNING_DAYS = 5;

function trialPlan(overrides: Partial<BusinessPlan> = {}): BusinessPlan {
  return {
    type: 'trial',
    status: 'active',
    trialStartedAt: fakeTimestamp(Date.now() - DAY),
    trialEndsAt: fakeTimestamp(Date.now() + 29 * DAY),
    updatedAt: fakeTimestamp(Date.now()),
    ...overrides,
  };
}

test('plan ausente -> no-plan, canWrite false', () => {
  const result = getPlanStatus(undefined);
  assert.equal(result.kind, 'no-plan');
  assert.equal(result.canWrite, false);
});

test('plan con forma legacy (string "free") -> no-plan, no explota', () => {
  // @ts-expect-error — reproduce a propósito la forma vieja pre-Fase-1
  const result = getPlanStatus('free');
  assert.equal(result.kind, 'no-plan');
  assert.equal(result.canWrite, false);
});

test('status suspended tiene prioridad sobre cualquier type', () => {
  const result = getPlanStatus(trialPlan({ status: 'suspended' }));
  assert.equal(result.kind, 'suspended');
  assert.equal(result.canWrite, false);
});

test('status readonly tiene prioridad sobre cualquier type', () => {
  const result = getPlanStatus(trialPlan({ status: 'readonly' }));
  assert.equal(result.kind, 'readonly');
  assert.equal(result.canWrite, false);
});

test('type pro con status active -> pro, canWrite true', () => {
  const result = getPlanStatus(trialPlan({ type: 'pro' }));
  assert.equal(result.kind, 'pro');
  assert.equal(result.canWrite, true);
});

test('type pro con trialStartedAt == trialEndsAt (placeholder de bootstrap) NO se lee como vencido', () => {
  const now = fakeTimestamp(Date.now());
  const result = getPlanStatus({
    type: 'pro',
    status: 'active',
    trialStartedAt: now,
    trialEndsAt: now,
    proActivatedAt: now,
    updatedAt: now,
  });
  assert.equal(result.kind, 'pro');
  assert.equal(result.canWrite, true);
});

test('trial activo con más de 5 días restantes', () => {
  const result = getPlanStatus(trialPlan({ trialEndsAt: fakeTimestamp(Date.now() + 20 * DAY) }));
  assert.equal(result.kind, 'trial-active');
  assert.equal(result.canWrite, true);
  assert.ok((result.daysRemaining ?? 0) > TRIAL_WARNING_DAYS);
});

test('trial con 5 días o menos restantes -> trial-ending-soon', () => {
  const result = getPlanStatus(trialPlan({ trialEndsAt: fakeTimestamp(Date.now() + 3 * DAY) }));
  assert.equal(result.kind, 'trial-ending-soon');
  assert.equal(result.canWrite, true);
  assert.equal(result.daysRemaining, 3);
});

test('trial vencido -> trial-expired, canWrite false', () => {
  const result = getPlanStatus(trialPlan({ trialEndsAt: fakeTimestamp(Date.now() - DAY) }));
  assert.equal(result.kind, 'trial-expired');
  assert.equal(result.canWrite, false);
  assert.equal(result.daysRemaining, 0);
});
