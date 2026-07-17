// Tests de integración de la eliminación definitiva de cuenta
// (adminGetDeletionPreview / adminDeleteRequestedAccount, functions/index.js),
// contra el Functions + Firestore + Auth Emulator — no contra producción.
// Mismo harness que scripts/functions-tests/admin.test.mjs; separado en su
// propio archivo por tamaño/tema, no por infraestructura distinta — comparte
// el mismo proyecto de emulador (Functions no soporta multi-proyecto como sí
// lo hace @firebase/rules-unit-testing para Firestore), así que
// package.json corre test:functions con --test-concurrency=1 para que este
// archivo y admin.test.mjs no se pisen borrando/creando el mismo estado.
//
// Cómo correr:
//   firebase emulators:exec --only functions,firestore,auth "npm run test:functions"

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

const adminApp = initAdminApp({ projectId: PROJECT_ID }, 'admin-deletion-test-app');
const adminAuth = getAdminAuth(adminApp);
const adminDb = getAdminFirestore(adminApp);

const clientApp = initClientApp(
  { apiKey: 'fake-api-key', projectId: PROJECT_ID, authDomain: `${PROJECT_ID}.firebaseapp.com` },
  'client-deletion-test-app',
);
const clientAuth = getAuth(clientApp);
connectAuthEmulator(clientAuth, 'http://127.0.0.1:9099', { disableWarnings: true });
const clientFunctions = getFunctions(clientApp);
connectFunctionsEmulator(clientFunctions, '127.0.0.1', 5001);

const ADMIN_UID = 'admin-user-deletion';
const NON_ADMIN_UID = 'non-admin-user-deletion';

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

// Fixtures completas: productos, categorías, un cliente con 2 movimientos,
// una caja con 1 movimiento, billing con 1 pago — para que preview/delete
// tengan algo real que contar y borrar en cada subcolección.
async function seedFullBusinessData(businessId) {
  const businessRef = adminDb.collection('businesses').doc(businessId);

  await businessRef.collection('products').doc('p1').set({ name: 'Prod 1' });
  await businessRef.collection('products').doc('p2').set({ name: 'Prod 2' });
  await businessRef.collection('categories').doc('c1').set({ name: 'Cat 1' });

  const customerRef = businessRef.collection('customers').doc('cust1');
  await customerRef.set({ name: 'Cliente 1' });
  await customerRef.collection('movements').doc('m1').set({ amount: 100 });
  await customerRef.collection('movements').doc('m2').set({ amount: 200 });

  const sessionRef = businessRef.collection('cashSessions').doc('s1');
  await sessionRef.set({ openedAt: Timestamp.now() });
  await sessionRef.collection('cashMovements').doc('cm1').set({ amount: 50 });

  await adminDb.collection('adminBilling').doc(businessId).set({
    businessId,
    lastAmount: 1000,
    updatedAt: Timestamp.now(),
  });
  await adminDb.collection('adminBilling').doc(businessId).collection('payments').doc('pay1').set({
    businessId,
    amount: 1000,
    createdAt: Timestamp.now(),
  });
}

test.before(async () => {
  await clearFirestoreEmulator();
  await adminAuth.createUser({ uid: ADMIN_UID, email: 'admin-del@test.com', password: 'password123' });
  await adminAuth.setCustomUserClaims(ADMIN_UID, { admin: true });
  await adminAuth.createUser({ uid: NON_ADMIN_UID, email: 'nonadmin-del@test.com', password: 'password123' });
});

// ── Portero: sin sesión / sin claim admin ────────────────────────────────

test('sin sesión: adminGetDeletionPreview y adminDeleteRequestedAccount rechazan con unauthenticated', async () => {
  await signOut(clientAuth).catch(() => {});
  await assert.rejects(callable('adminGetDeletionPreview')({ businessId: 'x' }), (err) => {
    assert.equal(err.code, 'functions/unauthenticated');
    return true;
  });
  await assert.rejects(callable('adminDeleteRequestedAccount')({ businessId: 'x', confirmation: 'x' }), (err) => {
    assert.equal(err.code, 'functions/unauthenticated');
    return true;
  });
});

test('usuario sin claim admin: adminGetDeletionPreview y adminDeleteRequestedAccount rechazan con permission-denied', async () => {
  await signInAs(NON_ADMIN_UID);
  await assert.rejects(callable('adminGetDeletionPreview')({ businessId: 'x' }), (err) => {
    assert.equal(err.code, 'functions/permission-denied');
    return true;
  });
  await assert.rejects(callable('adminDeleteRequestedAccount')({ businessId: 'x', confirmation: 'x' }), (err) => {
    assert.equal(err.code, 'functions/permission-denied');
    return true;
  });
});

// ── adminGetDeletionPreview ───────────────────────────────────────────────

test('adminGetDeletionPreview rechaza con not-found si el negocio no existe', async () => {
  await signInAs(ADMIN_UID);
  await assert.rejects(callable('adminGetDeletionPreview')({ businessId: 'no-existe-del-1' }), (err) => {
    assert.equal(err.code, 'functions/not-found');
    return true;
  });
});

test('adminGetDeletionPreview rechaza con failed-precondition si no hay deletionRequest', async () => {
  await clearFirestoreEmulator();
  await seedBusiness('biz-no-request', { name: 'X', email: 'a@test.com', plan: planFixture() });
  await signInAs(ADMIN_UID);
  await assert.rejects(callable('adminGetDeletionPreview')({ businessId: 'biz-no-request' }), (err) => {
    assert.equal(err.code, 'functions/failed-precondition');
    return true;
  });
});

test('adminGetDeletionPreview devuelve conteos correctos y no borra nada', async () => {
  await clearFirestoreEmulator();
  await seedBusiness('biz-preview', {
    name: 'Kiosco Preview',
    email: 'preview@test.com',
    plan: planFixture(),
    deletionRequest: { requestedAt: Timestamp.now() },
  });
  await seedFullBusinessData('biz-preview');
  await signInAs(ADMIN_UID);

  const res = await callable('adminGetDeletionPreview')({ businessId: 'biz-preview' });
  assert.equal(res.data.name, 'Kiosco Preview');
  assert.equal(res.data.ownerEmail, 'preview@test.com');
  assert.ok(res.data.requestedAt);
  assert.equal(res.data.counts.products, 2);
  assert.equal(res.data.counts.categories, 1);
  assert.equal(res.data.counts.customers, 1);
  assert.equal(res.data.counts.movements, 2);
  assert.equal(res.data.counts.cashSessions, 1);
  assert.equal(res.data.counts.cashMovements, 1);
  assert.equal(res.data.counts.hasBilling, true);
  assert.equal(res.data.counts.billingPayments, 1);
  // No se creó ninguna cuenta de Firebase Auth para este businessId.
  assert.equal(res.data.authUserExists, false);

  const businessSnap = await adminDb.collection('businesses').doc('biz-preview').get();
  assert.equal(businessSnap.exists, true);
  const productsSnap = await adminDb.collection('businesses').doc('biz-preview').collection('products').get();
  assert.equal(productsSnap.size, 2);
});

// ── adminDeleteRequestedAccount ───────────────────────────────────────────

test('adminDeleteRequestedAccount rechaza con failed-precondition sin deletionRequest previo, y no borra nada', async () => {
  await clearFirestoreEmulator();
  await seedBusiness('biz-no-req-2', { name: 'X', email: 'b@test.com', plan: planFixture() });
  await signInAs(ADMIN_UID);
  await assert.rejects(
    callable('adminDeleteRequestedAccount')({ businessId: 'biz-no-req-2', confirmation: 'b@test.com' }),
    (err) => {
      assert.equal(err.code, 'functions/failed-precondition');
      return true;
    },
  );
  const snap = await adminDb.collection('businesses').doc('biz-no-req-2').get();
  assert.equal(snap.exists, true);
});

test('adminDeleteRequestedAccount rechaza con invalid-argument si la confirmación no coincide, y no borra nada', async () => {
  await clearFirestoreEmulator();
  await seedBusiness('biz-bad-confirm', {
    name: 'X',
    email: 'c@test.com',
    plan: planFixture(),
    deletionRequest: { requestedAt: Timestamp.now() },
  });
  await signInAs(ADMIN_UID);
  await assert.rejects(
    callable('adminDeleteRequestedAccount')({ businessId: 'biz-bad-confirm', confirmation: 'email-equivocado@test.com' }),
    (err) => {
      assert.equal(err.code, 'functions/invalid-argument');
      return true;
    },
  );
  const snap = await adminDb.collection('businesses').doc('biz-bad-confirm').get();
  assert.equal(snap.exists, true);
});

test('adminDeleteRequestedAccount borra todo (Firestore + Auth) y deja auditoría con conteos', async () => {
  await clearFirestoreEmulator();
  const businessId = 'biz-delete-full';
  await seedBusiness(businessId, {
    name: 'Kiosco Full',
    email: 'full@test.com',
    plan: planFixture(),
    deletionRequest: { requestedAt: Timestamp.now() },
  });
  await seedFullBusinessData(businessId);
  await adminAuth.createUser({ uid: businessId, email: 'full@test.com', password: 'password123' });
  await signInAs(ADMIN_UID);

  // Confirmación case-insensitive: escribir el email en otra capitalización
  // igual confirma.
  const res = await callable('adminDeleteRequestedAccount')({ businessId, confirmation: 'FULL@test.com' });
  assert.equal(res.data.success, true);
  assert.equal(res.data.alreadyDeleted, false);
  assert.equal(res.data.deletedCounts.products, 2);
  assert.equal(res.data.deletedCounts.categories, 1);
  assert.equal(res.data.deletedCounts.customers, 1);
  assert.equal(res.data.deletedCounts.movements, 2);
  assert.equal(res.data.deletedCounts.cashSessions, 1);
  assert.equal(res.data.deletedCounts.cashMovements, 1);
  assert.equal(res.data.deletedCounts.billingPayments, 1);

  const businessSnap = await adminDb.collection('businesses').doc(businessId).get();
  assert.equal(businessSnap.exists, false);
  const usersSnap = await adminDb.collection('users').doc(businessId).get();
  assert.equal(usersSnap.exists, false);
  const billingSnap = await adminDb.collection('adminBilling').doc(businessId).get();
  assert.equal(billingSnap.exists, false);
  const paymentsSnap = await adminDb.collection('adminBilling').doc(businessId).collection('payments').get();
  assert.equal(paymentsSnap.size, 0);
  const productsSnap = await adminDb.collection('businesses').doc(businessId).collection('products').get();
  assert.equal(productsSnap.size, 0);
  const movementsSnap = await adminDb
    .collection('businesses').doc(businessId).collection('customers').doc('cust1').collection('movements').get();
  assert.equal(movementsSnap.size, 0);

  await assert.rejects(adminAuth.getUser(businessId));

  const logs = await callable('adminListAuditLogs')({ businessId });
  const actions = logs.data.logs.map((l) => l.action).sort();
  assert.deepEqual(actions, ['delete_account_completed', 'delete_account_requested_execute'].sort());
  const completed = logs.data.logs.find((l) => l.action === 'delete_account_completed');
  assert.equal(completed.actorUid, ADMIN_UID);
  assert.equal(completed.deletedCounts.products, 2);
  // Sin datos sensibles en el log: ni nombre, ni email, ni montos.
  assert.equal('name' in completed, false);
  assert.equal('ownerEmail' in completed, false);
});

test('adminDeleteRequestedAccount rechaza con not-found si el negocio nunca existió (sin fixture ni auditoría previa)', async () => {
  await signInAs(ADMIN_UID);
  await assert.rejects(
    callable('adminDeleteRequestedAccount')({ businessId: 'nunca-existio-del', confirmation: 'x@test.com' }),
    (err) => {
      assert.equal(err.code, 'functions/not-found');
      return true;
    },
  );
});

test('adminDeleteRequestedAccount es idempotente: reintentar tras completado devuelve éxito sin duplicar el log', async () => {
  await clearFirestoreEmulator();
  const businessId = 'biz-delete-retry';
  await seedBusiness(businessId, {
    name: 'Kiosco Retry',
    email: 'retry@test.com',
    plan: planFixture(),
    deletionRequest: { requestedAt: Timestamp.now() },
  });
  await adminAuth.createUser({ uid: businessId, email: 'retry@test.com', password: 'password123' });
  await signInAs(ADMIN_UID);

  const first = await callable('adminDeleteRequestedAccount')({ businessId, confirmation: 'retry@test.com' });
  assert.equal(first.data.success, true);
  assert.equal(first.data.alreadyDeleted, false);

  const second = await callable('adminDeleteRequestedAccount')({ businessId, confirmation: 'retry@test.com' });
  assert.equal(second.data.success, true);
  assert.equal(second.data.alreadyDeleted, true);

  const logs = await callable('adminListAuditLogs')({ businessId });
  const completedLogs = logs.data.logs.filter((l) => l.action === 'delete_account_completed');
  assert.equal(completedLogs.length, 1);
});
