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
