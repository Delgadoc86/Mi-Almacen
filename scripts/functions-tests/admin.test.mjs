// Tests de integración de las Cloud Functions callable del Panel Admin
// (Fase 6, functions/index.js), contra el Functions + Firestore + Auth
// Emulator — no contra producción. Corre solo local, sin necesidad de sesión
// real de Firebase CLI (los emuladores no requieren login ni Blaze).
//
// Cómo correr:
//   firebase emulators:exec --only functions,firestore,auth "npm run test:functions"
//
// Estilo: tests planos (sin t.test anidado) — ver la nota equivalente en
// scripts/rules-tests/plan-enforcement.test.mjs sobre inestabilidad de
// subtests anidados bajo carga en este mismo tipo de harness.

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.GCLOUD_PROJECT = 'minegocio-8bbef';

import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp as initAdminApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp as initClientApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithCustomToken, signOut } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';

const PROJECT_ID = 'minegocio-8bbef';
const DAY_MS = 24 * 60 * 60 * 1000;

const adminApp = initAdminApp({ projectId: PROJECT_ID }, 'admin-test-app');
const adminAuth = getAdminAuth(adminApp);
const adminDb = getAdminFirestore(adminApp);

const clientApp = initClientApp(
  { apiKey: 'fake-api-key', projectId: PROJECT_ID, authDomain: `${PROJECT_ID}.firebaseapp.com` },
  'client-test-app',
);
const clientAuth = getAuth(clientApp);
connectAuthEmulator(clientAuth, 'http://127.0.0.1:9099', { disableWarnings: true });
const clientFunctions = getFunctions(clientApp);
connectFunctionsEmulator(clientFunctions, '127.0.0.1', 5001);

const ADMIN_UID = 'admin-user-1';
const NON_ADMIN_UID = 'non-admin-user-1';

async function clearFirestoreEmulator() {
  await fetch(
    `http://127.0.0.1:8080/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
}

async function signInAs(uid) {
  const customToken = await adminAuth.createCustomToken(uid);
  await signOut(clientAuth).catch(() => {});
  await signInWithCustomToken(clientAuth, customToken);
}

function callable(name) {
  return httpsCallable(clientFunctions, name);
}

function planFixture(overrides) {
  return {
    type: 'trial',
    status: 'active',
    trialStartedAt: Timestamp.now(),
    trialEndsAt: Timestamp.fromMillis(Date.now() + 30 * DAY_MS),
    updatedAt: Timestamp.now(),
    ...overrides,
  };
}

async function seedBusiness(businessId, { name, email, plan, deletionRequest }) {
  await adminDb.collection('businesses').doc(businessId).set({
    id: businessId,
    ownerUid: businessId,
    name,
    ...(plan !== undefined ? { plan } : {}),
    ...(deletionRequest ? { deletionRequest } : {}),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  await adminDb.collection('users').doc(businessId).set({
    uid: businessId,
    email,
    displayName: '',
    businessId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
}

test.before(async () => {
  await clearFirestoreEmulator();
  await adminAuth.createUser({ uid: ADMIN_UID, email: 'admin@test.com', password: 'password123' });
  await adminAuth.setCustomUserClaims(ADMIN_UID, { admin: true });
  await adminAuth.createUser({ uid: NON_ADMIN_UID, email: 'nonadmin@test.com', password: 'password123' });
});

// ── Portero: sin sesión / sin claim admin ────────────────────────────────

test('sin sesión: adminGetDashboard rechaza con unauthenticated', async () => {
  await signOut(clientAuth).catch(() => {});
  await assert.rejects(callable('adminGetDashboard')(), (err) => {
    assert.equal(err.code, 'functions/unauthenticated');
    return true;
  });
});

test('usuario sin claim admin: adminGetDashboard rechaza con permission-denied', async () => {
  await signInAs(NON_ADMIN_UID);
  await assert.rejects(callable('adminGetDashboard')(), (err) => {
    assert.equal(err.code, 'functions/permission-denied');
    return true;
  });
});

test('usuario sin claim admin: adminChangePlan rechaza con permission-denied', async () => {
  await signInAs(NON_ADMIN_UID);
  await assert.rejects(
    callable('adminChangePlan')({ businessId: 'whatever', action: 'activate_pro' }),
    (err) => {
      assert.equal(err.code, 'functions/permission-denied');
      return true;
    },
  );
});

test('usuario sin claim admin: adminListBusinesses, adminGetBusinessDetail y adminListAuditLogs rechazan', async () => {
  await signInAs(NON_ADMIN_UID);
  await assert.rejects(callable('adminListBusinesses')({}));
  await assert.rejects(callable('adminGetBusinessDetail')({ businessId: 'x' }));
  await assert.rejects(callable('adminListAuditLogs')({}));
});

test('usuario sin claim admin: adminGetBillingDetail, adminRecordPayment y adminUpdateBillingNotes rechazan', async () => {
  await signInAs(NON_ADMIN_UID);
  await assert.rejects(callable('adminGetBillingDetail')({ businessId: 'x' }));
  await assert.rejects(
    callable('adminRecordPayment')({ businessId: 'x', amount: 1000, method: 'efectivo' }),
  );
  await assert.rejects(callable('adminUpdateBillingNotes')({ businessId: 'x', notes: 'nota' }));
});

// ── adminGetDashboard ─────────────────────────────────────────────────────

test('adminGetDashboard cuenta correctamente cada estado de plan', async () => {
  await clearFirestoreEmulator();
  await seedBusiness('biz-trial-active', { name: 'Trial activo', email: 'a@test.com', plan: planFixture() });
  await seedBusiness('biz-trial-expired', {
    name: 'Trial vencido', email: 'b@test.com',
    plan: planFixture({ trialEndsAt: Timestamp.fromMillis(Date.now() - DAY_MS) }),
  });
  await seedBusiness('biz-pro', { name: 'Pro', email: 'c@test.com', plan: planFixture({ type: 'pro' }) });
  await seedBusiness('biz-readonly', { name: 'Readonly', email: 'd@test.com', plan: planFixture({ status: 'readonly' }) });
  await seedBusiness('biz-suspended', { name: 'Suspendido', email: 'e@test.com', plan: planFixture({ status: 'suspended' }) });
  await seedBusiness('biz-deletion', {
    name: 'Con solicitud', email: 'f@test.com', plan: planFixture({ type: 'pro' }),
    deletionRequest: { requestedAt: Timestamp.now() },
  });

  await signInAs(ADMIN_UID);
  const res = await callable('adminGetDashboard')();
  assert.equal(res.data.trialActive, 1);
  assert.equal(res.data.trialExpired, 1);
  assert.equal(res.data.pro, 2); // biz-pro + biz-deletion
  assert.equal(res.data.readonly, 1);
  assert.equal(res.data.suspended, 1);
  assert.equal(res.data.pendingDeletionRequests, 1);
  assert.equal(res.data.totalBusinesses, 6);
});

// ── adminListBusinesses ──────────────────────────────────────────────────

test('adminListBusinesses filtra por estado y busca por nombre/email', async () => {
  await clearFirestoreEmulator();
  await seedBusiness('biz-1', { name: 'Almacén Don José', email: 'jose@test.com', plan: planFixture({ type: 'pro' }) });
  await seedBusiness('biz-2', { name: 'Kiosco Norte', email: 'norte@test.com', plan: planFixture() });

  await signInAs(ADMIN_UID);
  const all = await callable('adminListBusinesses')({});
  assert.equal(all.data.businesses.length, 2);

  const onlyPro = await callable('adminListBusinesses')({ statusFilter: 'pro' });
  assert.equal(onlyPro.data.businesses.length, 1);
  assert.equal(onlyPro.data.businesses[0].businessId, 'biz-1');

  const bySearch = await callable('adminListBusinesses')({ search: 'norte' });
  assert.equal(bySearch.data.businesses.length, 1);
  assert.equal(bySearch.data.businesses[0].businessId, 'biz-2');
});

// ── adminGetBusinessDetail ───────────────────────────────────────────────

test('adminGetBusinessDetail devuelve solo estado de cuenta, no datos operativos', async () => {
  await clearFirestoreEmulator();
  await seedBusiness('biz-detail', { name: 'Negocio Detalle', email: 'detalle@test.com', plan: planFixture({ type: 'pro' }) });

  await signInAs(ADMIN_UID);
  const res = await callable('adminGetBusinessDetail')({ businessId: 'biz-detail' });
  assert.equal(res.data.name, 'Negocio Detalle');
  assert.equal(res.data.ownerEmail, 'detalle@test.com');
  assert.equal(res.data.kind, 'pro');
  assert.deepEqual(res.data.auditLog, []);
  const keys = Object.keys(res.data);
  for (const forbidden of ['products', 'customers', 'cashSessions', 'movements', 'cashMovements']) {
    assert.ok(!keys.includes(forbidden), `no debería incluir "${forbidden}"`);
  }
});

test('adminGetBusinessDetail rechaza con not-found si el negocio no existe', async () => {
  await signInAs(ADMIN_UID);
  await assert.rejects(callable('adminGetBusinessDetail')({ businessId: 'no-existe' }), (err) => {
    assert.equal(err.code, 'functions/not-found');
    return true;
  });
});

// ── adminChangePlan ───────────────────────────────────────────────────────

test('activate_pro convierte un trial en Pro y deja auditoría', async () => {
  await clearFirestoreEmulator();
  await seedBusiness('biz-activate', { name: 'A activar', email: 'g@test.com', plan: planFixture() });

  await signInAs(ADMIN_UID);
  const res = await callable('adminChangePlan')({ businessId: 'biz-activate', action: 'activate_pro' });
  assert.equal(res.data.success, true);
  assert.equal(res.data.nextPlan.type, 'pro');
  assert.equal(res.data.nextPlan.status, 'active');

  const snap = await adminDb.collection('businesses').doc('biz-activate').get();
  assert.equal(snap.data().plan.type, 'pro');

  const logs = await callable('adminListAuditLogs')({ businessId: 'biz-activate' });
  assert.equal(logs.data.logs.length, 1);
  assert.equal(logs.data.logs[0].action, 'activate_pro');
  assert.equal(logs.data.logs[0].actorUid, ADMIN_UID);
  assert.equal(logs.data.logs[0].previousPlan.type, 'trial');
  assert.equal(logs.data.logs[0].nextPlan.type, 'pro');
});

test('extend_trial exige motivo', async () => {
  await clearFirestoreEmulator();
  await seedBusiness('biz-extend', { name: 'A extender', email: 'h@test.com', plan: planFixture() });
  await signInAs(ADMIN_UID);
  await assert.rejects(
    callable('adminChangePlan')({ businessId: 'biz-extend', action: 'extend_trial', days: 7 }),
    (err) => { assert.equal(err.code, 'functions/invalid-argument'); return true; },
  );
});

test('extend_trial exige que los días sean uno de los valores permitidos', async () => {
  await clearFirestoreEmulator();
  await seedBusiness('biz-extend2', { name: 'A extender', email: 'i@test.com', plan: planFixture() });
  await signInAs(ADMIN_UID);
  await assert.rejects(
    callable('adminChangePlan')({ businessId: 'biz-extend2', action: 'extend_trial', days: 2, reason: 'motivo' }),
    (err) => { assert.equal(err.code, 'functions/invalid-argument'); return true; },
  );
});

test('extend_trial válido suma días desde el vencimiento actual', async () => {
  await clearFirestoreEmulator();
  const originalEndsAt = Date.now() + 5 * DAY_MS;
  await seedBusiness('biz-extend3', {
    name: 'A extender', email: 'j@test.com',
    plan: planFixture({ trialEndsAt: Timestamp.fromMillis(originalEndsAt) }),
  });
  await signInAs(ADMIN_UID);
  const res = await callable('adminChangePlan')({
    businessId: 'biz-extend3', action: 'extend_trial', days: 7, reason: 'pidió más tiempo',
  });
  const newEndsAtMs = new Date(res.data.nextPlan.trialEndsAt).getTime();
  assert.ok(Math.abs(newEndsAtMs - (originalEndsAt + 7 * DAY_MS)) < 5000);
});

test('extend_trial rechaza sobre una cuenta Pro (failed-precondition)', async () => {
  await clearFirestoreEmulator();
  await seedBusiness('biz-pro-extend', { name: 'Pro', email: 'k@test.com', plan: planFixture({ type: 'pro' }) });
  await signInAs(ADMIN_UID);
  await assert.rejects(
    callable('adminChangePlan')({ businessId: 'biz-pro-extend', action: 'extend_trial', days: 7, reason: 'motivo' }),
    (err) => { assert.equal(err.code, 'functions/failed-precondition'); return true; },
  );
});

test('set_readonly y suspend exigen motivo; reactivate no', async () => {
  await clearFirestoreEmulator();
  await seedBusiness('biz-reasons', { name: 'X', email: 'l@test.com', plan: planFixture({ type: 'pro' }) });
  await signInAs(ADMIN_UID);
  await assert.rejects(callable('adminChangePlan')({ businessId: 'biz-reasons', action: 'set_readonly' }));
  await assert.rejects(callable('adminChangePlan')({ businessId: 'biz-reasons', action: 'suspend' }));

  await callable('adminChangePlan')({ businessId: 'biz-reasons', action: 'suspend', reason: 'mora' });
  const res = await callable('adminChangePlan')({ businessId: 'biz-reasons', action: 'reactivate' });
  assert.equal(res.data.nextPlan.status, 'active');
});

test('suspend con motivo suspende y reactivate vuelve a active', async () => {
  await clearFirestoreEmulator();
  await seedBusiness('biz-suspend-cycle', { name: 'X', email: 'm@test.com', plan: planFixture({ type: 'pro' }) });
  await signInAs(ADMIN_UID);
  const suspended = await callable('adminChangePlan')({
    businessId: 'biz-suspend-cycle', action: 'suspend', reason: 'pago rechazado',
  });
  assert.equal(suspended.data.nextPlan.status, 'suspended');

  const reactivated = await callable('adminChangePlan')({ businessId: 'biz-suspend-cycle', action: 'reactivate' });
  assert.equal(reactivated.data.nextPlan.status, 'active');
});

test('set_readonly/suspend/reactivate rechazan si el negocio no tiene plan asignado', async () => {
  await clearFirestoreEmulator();
  await seedBusiness('biz-noplan', { name: 'Sin plan', email: 'n@test.com', plan: undefined });
  await signInAs(ADMIN_UID);
  await assert.rejects(
    callable('adminChangePlan')({ businessId: 'biz-noplan', action: 'set_readonly', reason: 'x' }),
    (err) => { assert.equal(err.code, 'functions/failed-precondition'); return true; },
  );
  await assert.rejects(
    callable('adminChangePlan')({ businessId: 'biz-noplan', action: 'suspend', reason: 'x' }),
    (err) => { assert.equal(err.code, 'functions/failed-precondition'); return true; },
  );
  await assert.rejects(
    callable('adminChangePlan')({ businessId: 'biz-noplan', action: 'reactivate' }),
    (err) => { assert.equal(err.code, 'functions/failed-precondition'); return true; },
  );
});

test('adminChangePlan rechaza una acción inválida', async () => {
  await clearFirestoreEmulator();
  await seedBusiness('biz-invalid-action', { name: 'X', email: 'o@test.com', plan: planFixture() });
  await signInAs(ADMIN_UID);
  await assert.rejects(
    callable('adminChangePlan')({ businessId: 'biz-invalid-action', action: 'delete_everything' }),
    (err) => { assert.equal(err.code, 'functions/invalid-argument'); return true; },
  );
});

test('adminChangePlan rechaza con not-found si el negocio no existe', async () => {
  await signInAs(ADMIN_UID);
  await assert.rejects(
    callable('adminChangePlan')({ businessId: 'no-existe-2', action: 'activate_pro' }),
    (err) => { assert.equal(err.code, 'functions/not-found'); return true; },
  );
});

// ── adminListAuditLogs ────────────────────────────────────────────────────

test('adminListAuditLogs ordena por fecha descendente y respeta el límite global', async () => {
  await clearFirestoreEmulator();
  await seedBusiness('biz-audit', { name: 'X', email: 'p@test.com', plan: planFixture({ type: 'pro' }) });
  await signInAs(ADMIN_UID);
  await callable('adminChangePlan')({ businessId: 'biz-audit', action: 'suspend', reason: 'r1' });
  await callable('adminChangePlan')({ businessId: 'biz-audit', action: 'reactivate' });

  const logs = await callable('adminListAuditLogs')({ businessId: 'biz-audit' });
  assert.equal(logs.data.logs.length, 2);
  assert.equal(logs.data.logs[0].action, 'reactivate');
  assert.equal(logs.data.logs[1].action, 'suspend');

  const globalLogs = await callable('adminListAuditLogs')({});
  assert.ok(globalLogs.data.logs.length >= 2);
});

// ── Libreta de cobros (adminBilling) ─────────────────────────────────────
// `plan` = acceso, `billing` = administración comercial interna. Estos
// tests verifican explícitamente que registrar un pago NUNCA toca `plan`.

test('adminGetBillingDetail devuelve billing null y sin pagos para un negocio sin datos de cobro todavía', async () => {
  await clearFirestoreEmulator();
  await seedBusiness('biz-billing-empty', { name: 'Sin cobro', email: 'q@test.com', plan: planFixture() });
  await signInAs(ADMIN_UID);
  const res = await callable('adminGetBillingDetail')({ businessId: 'biz-billing-empty' });
  assert.equal(res.data.businessName, 'Sin cobro');
  assert.equal(res.data.billing, null);
  assert.deepEqual(res.data.payments, []);
});

test('adminGetBillingDetail rechaza con not-found si el negocio no existe', async () => {
  await signInAs(ADMIN_UID);
  await assert.rejects(
    callable('adminGetBillingDetail')({ businessId: 'no-existe-billing' }),
    (err) => { assert.equal(err.code, 'functions/not-found'); return true; },
  );
});

test('adminRecordPayment rechaza monto inválido, método inválido y período inválido', async () => {
  await clearFirestoreEmulator();
  await seedBusiness('biz-validation', { name: 'X', email: 'r@test.com', plan: planFixture() });
  await signInAs(ADMIN_UID);
  await assert.rejects(
    callable('adminRecordPayment')({ businessId: 'biz-validation', amount: 0, method: 'efectivo' }),
    (err) => { assert.equal(err.code, 'functions/invalid-argument'); return true; },
  );
  await assert.rejects(
    callable('adminRecordPayment')({ businessId: 'biz-validation', amount: -100, method: 'efectivo' }),
    (err) => { assert.equal(err.code, 'functions/invalid-argument'); return true; },
  );
  await assert.rejects(
    callable('adminRecordPayment')({ businessId: 'biz-validation', amount: 1000, method: 'bitcoin' }),
    (err) => { assert.equal(err.code, 'functions/invalid-argument'); return true; },
  );
  await assert.rejects(
    callable('adminRecordPayment')({ businessId: 'biz-validation', amount: 1000, method: 'efectivo', periodDays: 15 }),
    (err) => { assert.equal(err.code, 'functions/invalid-argument'); return true; },
  );
});

test('adminRecordPayment rechaza con not-found si el negocio no existe', async () => {
  await signInAs(ADMIN_UID);
  await assert.rejects(
    callable('adminRecordPayment')({ businessId: 'no-existe-3', amount: 1000, method: 'efectivo' }),
    (err) => { assert.equal(err.code, 'functions/not-found'); return true; },
  );
});

test('adminRecordPayment crea el pago, actualiza el resumen, deja auditoría y NO toca el plan', async () => {
  await clearFirestoreEmulator();
  await seedBusiness('biz-record', { name: 'A cobrar', email: 's@test.com', plan: planFixture() });
  await signInAs(ADMIN_UID);

  const planBefore = await adminDb.collection('businesses').doc('biz-record').get();

  const res = await callable('adminRecordPayment')({
    businessId: 'biz-record',
    amount: 5000,
    method: 'transferencia',
    periodDays: 30,
    note: 'primer pago',
  });

  assert.equal(res.data.success, true);
  assert.equal(res.data.billing.lastAmount, 5000);
  assert.equal(res.data.billing.paymentMethod, 'transferencia');
  assert.equal(res.data.billing.currency, 'ARS');
  assert.equal(res.data.billing.notes, 'primer pago');
  assert.ok(res.data.billing.nextPaymentDueAt);

  const nextDueMs = new Date(res.data.billing.nextPaymentDueAt).getTime();
  const paidAtMs = new Date(res.data.billing.lastPaymentAt).getTime();
  assert.ok(Math.abs(nextDueMs - (paidAtMs + 30 * DAY_MS)) < 5000);

  // El plan del negocio queda exactamente igual que antes de registrar el pago.
  const planAfter = await adminDb.collection('businesses').doc('biz-record').get();
  assert.deepEqual(planAfter.data().plan, planBefore.data().plan);

  const detail = await callable('adminGetBillingDetail')({ businessId: 'biz-record' });
  assert.equal(detail.data.payments.length, 1);
  assert.equal(detail.data.payments[0].amount, 5000);
  assert.equal(detail.data.payments[0].note, 'primer pago');

  const logs = await callable('adminListAuditLogs')({ businessId: 'biz-record' });
  assert.equal(logs.data.logs.length, 1);
  assert.equal(logs.data.logs[0].action, 'record_payment');
  assert.equal(logs.data.logs[0].actorUid, ADMIN_UID);
  assert.equal(logs.data.logs[0].previousBilling, null);
  assert.equal(logs.data.logs[0].nextBilling.lastAmount, 5000);
  assert.equal(logs.data.logs[0].previousPlan, null);
  assert.equal(logs.data.logs[0].nextPlan, null);
});

test('adminRecordPayment sin período no borra un nextPaymentDueAt ya existente', async () => {
  await clearFirestoreEmulator();
  await seedBusiness('biz-keep-due', { name: 'X', email: 't@test.com', plan: planFixture() });
  await signInAs(ADMIN_UID);

  const first = await callable('adminRecordPayment')({
    businessId: 'biz-keep-due', amount: 3000, method: 'efectivo', periodDays: 30,
  });
  const originalDueAt = first.data.billing.nextPaymentDueAt;

  const second = await callable('adminRecordPayment')({
    businessId: 'biz-keep-due', amount: 500, method: 'otro',
  });

  assert.equal(second.data.billing.lastAmount, 500);
  assert.equal(second.data.billing.nextPaymentDueAt, originalDueAt);
});

test('adminUpdateBillingNotes actualiza solo la nota, crea el resumen si no existía y deja auditoría', async () => {
  await clearFirestoreEmulator();
  await seedBusiness('biz-notes', { name: 'X', email: 'u@test.com', plan: planFixture() });
  await signInAs(ADMIN_UID);

  const res = await callable('adminUpdateBillingNotes')({
    businessId: 'biz-notes', notes: 'avisó que paga la semana que viene',
  });
  assert.equal(res.data.billing.notes, 'avisó que paga la semana que viene');
  assert.equal(res.data.billing.lastAmount, null);
  assert.equal(res.data.billing.nextPaymentDueAt, null);

  const logs = await callable('adminListAuditLogs')({ businessId: 'biz-notes' });
  assert.equal(logs.data.logs.length, 1);
  assert.equal(logs.data.logs[0].action, 'update_billing_notes');

  const planSnap = await adminDb.collection('businesses').doc('biz-notes').get();
  assert.equal(planSnap.data().plan.type, 'trial');
});

test('adminUpdateBillingNotes rechaza con not-found si el negocio no existe', async () => {
  await signInAs(ADMIN_UID);
  await assert.rejects(
    callable('adminUpdateBillingNotes')({ businessId: 'no-existe-4', notes: 'x' }),
    (err) => { assert.equal(err.code, 'functions/not-found'); return true; },
  );
});

test('adminGetDashboard cuenta cobros esta semana, vencidos y sin datos a partir de adminBilling', async () => {
  await clearFirestoreEmulator();
  await seedBusiness('biz-due-soon', { name: 'X', email: 'v@test.com', plan: planFixture() });
  await seedBusiness('biz-overdue', { name: 'Y', email: 'w@test.com', plan: planFixture() });
  await seedBusiness('biz-no-billing', { name: 'Z', email: 'x@test.com', plan: planFixture() });

  await signInAs(ADMIN_UID);
  await callable('adminRecordPayment')({ businessId: 'biz-due-soon', amount: 1000, method: 'efectivo', periodDays: 30 });
  await adminDb.collection('adminBilling').doc('biz-due-soon').update({
    nextPaymentDueAt: Timestamp.fromMillis(Date.now() + 3 * DAY_MS),
  });
  await callable('adminRecordPayment')({ businessId: 'biz-overdue', amount: 1000, method: 'efectivo', periodDays: 30 });
  await adminDb.collection('adminBilling').doc('biz-overdue').update({
    nextPaymentDueAt: Timestamp.fromMillis(Date.now() - 2 * DAY_MS),
  });

  const res = await callable('adminGetDashboard')();
  assert.equal(res.data.billingDueThisWeek, 1);
  assert.equal(res.data.billingOverdue, 1);
  assert.equal(res.data.billingNoData, 1); // biz-no-billing
});
