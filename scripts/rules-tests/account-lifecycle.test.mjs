// Tests del bloqueo de seguridad y ciclo de vida (2026-07-05): nadie puede
// borrar businesses/{uid} ni users/{uid} — ni siquiera el dueño — y
// "Eliminar cuenta" pasa a ser una solicitud no destructiva (deletionRequest).
//
// Nota importante sobre alcance: la garantía de "un usuario con negocio
// faltante no recibe un trial nuevo automáticamente" vive en código de
// aplicación (repairIncompleteRegistration en src/services/userProfile.ts
// ahora solo crea documentos cuando NINGUNO de los dos existe, nunca cuando
// falta exactamente uno) — Firestore Rules no tienen forma de "recordar"
// que un negocio existió antes de ser borrado, así que esa garantía no es
// verificable acá contra el emulador. Lo que SÍ se prueba en este archivo es
// que, dado un estado inconsistente (uno de los dos documentos falta), un
// intento de escritura que intente "reparar" con un plan distinto al que
// ya existía sigue rechazado por las mismas reglas de Fase 1.
//
// Cómo correr:
//   firebase emulators:exec --only firestore,auth "npm run test:rules"

import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

// Project ID propio (no compartido con otros archivos de test): node --test
// puede correr archivos en paralelo, y dos test envs contra el mismo
// projectId terminan pisándose datos entre sí en el emulador.
const PROJECT_ID = 'minegocio-rules-test-lifecycle';
const OWNER_UID = 'owner-1';

let testEnv;

test.before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

test.after(async () => {
  await testEnv.cleanup();
});

test.beforeEach(async () => {
  await testEnv.clearFirestore();
});

function ownerDb() {
  return testEnv.authenticatedContext(OWNER_UID).firestore();
}

function validTrialPlan() {
  return {
    type: 'trial',
    status: 'active',
    trialStartedAt: serverTimestamp(),
    trialEndsAt: Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000),
    updatedAt: serverTimestamp(),
  };
}

async function seedValidBusiness() {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'businesses', OWNER_UID), {
      id: OWNER_UID,
      ownerUid: OWNER_UID,
      name: 'Almacén de prueba',
      plan: {
        type: 'trial',
        status: 'active',
        trialStartedAt: Timestamp.now(),
        trialEndsAt: Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000),
        updatedAt: Timestamp.now(),
      },
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  });
}

async function seedUserProfile() {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users', OWNER_UID), {
      uid: OWNER_UID,
      email: 'owner@test.com',
      displayName: '',
      businessId: OWNER_UID,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  });
}

// ── businesses/{uid}: delete denegado para todos, incluido el dueño ──────

test('el dueño NO puede eliminar su propio negocio (ya no es un hueco de reinicio de trial)', async () => {
  await seedValidBusiness();
  const db = ownerDb();
  await assertFails(deleteDoc(doc(db, 'businesses', OWNER_UID)));
});

test('un negocio que sobrevive intacto sigue de pie tras un intento de delete rechazado', async () => {
  await seedValidBusiness();
  const db = ownerDb();
  await assertFails(deleteDoc(doc(db, 'businesses', OWNER_UID)));
  // Y sigue pudiéndose leer y actualizar con normalidad — no quedó en un
  // estado raro por el intento fallido.
  await assertSucceeds(
    updateDoc(doc(db, 'businesses', OWNER_UID), { name: 'Sigue existiendo' }),
  );
});

// ── users/{uid}: delete denegado ───────────────────────────────────────────

test('el dueño NO puede eliminar su propio perfil de usuario', async () => {
  await seedUserProfile();
  const db = ownerDb();
  await assertFails(deleteDoc(doc(db, 'users', OWNER_UID)));
});

// ── "Eliminar cuenta" ahora es una solicitud no destructiva ───────────────

test('el dueño puede solicitar la eliminación de su cuenta (deletionRequest válido)', async () => {
  await seedValidBusiness();
  const db = ownerDb();
  await assertSucceeds(
    updateDoc(doc(db, 'businesses', OWNER_UID), {
      deletionRequest: { requestedAt: serverTimestamp() },
    }),
  );
});

test('NO se puede crear deletionRequest con campos extra', async () => {
  await seedValidBusiness();
  const db = ownerDb();
  await assertFails(
    updateDoc(doc(db, 'businesses', OWNER_UID), {
      deletionRequest: { requestedAt: serverTimestamp(), reason: 'porque sí' },
    }),
  );
});

test('NO se puede modificar deletionRequest después de creado', async () => {
  await seedValidBusiness();
  const db = ownerDb();
  await assertSucceeds(
    updateDoc(doc(db, 'businesses', OWNER_UID), {
      deletionRequest: { requestedAt: serverTimestamp() },
    }),
  );
  await assertFails(
    updateDoc(doc(db, 'businesses', OWNER_UID), {
      deletionRequest: { requestedAt: serverTimestamp() },
    }),
  );
});

test('solicitar eliminación NO toca el plan', async () => {
  await seedValidBusiness();
  const db = ownerDb();
  await assertSucceeds(
    updateDoc(doc(db, 'businesses', OWNER_UID), {
      deletionRequest: { requestedAt: serverTimestamp() },
    }),
  );
  // El negocio sigue operable con normalidad después de la solicitud —
  // no se convierte en solo-lectura ni cambia de plan solo por pedir el borrado.
  await assertFails(updateDoc(doc(db, 'businesses', OWNER_UID), { 'plan.status': 'suspended' }));
});

// ── Registro nuevo y no-recreación (regresión de Fase 1, re-confirmada) ───

test('registro nuevo válido crea un solo negocio con un trial de 30 días', async () => {
  const db = ownerDb();
  await assertSucceeds(
    setDoc(doc(db, 'businesses', OWNER_UID), {
      id: OWNER_UID,
      ownerUid: OWNER_UID,
      name: 'Almacén nuevo',
      plan: validTrialPlan(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
});

test('un negocio existente no puede recrearse ni cambiar de plan', async () => {
  await seedValidBusiness();
  const db = ownerDb();
  await assertFails(
    setDoc(doc(db, 'businesses', OWNER_UID), {
      id: OWNER_UID,
      ownerUid: OWNER_UID,
      name: 'Intento de recreación',
      plan: validTrialPlan(), // trial "nuevo", distinto del que ya existía
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
});

// ── Regresión: subcolecciones de negocio siguen intactas ──────────────────
//
// Tests planos independientes, no subtests anidados (t.test) — ver la nota
// equivalente en plan-enforcement.test.mjs (Fase 5): con muchas suites
// corriendo juntas contra el mismo emulador, t.test anidado acá mostró
// fallos no determinísticos ("Null value error" espurio en planIsActive())
// que no ocurren con las mismas aserciones en tests planos. Rareza del
// harness de pruebas, no de firestore.rules.

test('regresión: el dueño puede crear un producto', async () => {
  await seedValidBusiness();
  const db = ownerDb();
  await assertSucceeds(
    setDoc(doc(db, 'businesses', OWNER_UID, 'products', 'prod-1'), {
      name: 'Fideos',
      type: 'unidad',
      categoryId: 'almacen',
      cost: 100,
      margin: 30,
      roundTo: 10,
      price: 130,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
});

test('regresión: el dueño puede crear una categoría', async () => {
  await seedValidBusiness();
  const db = ownerDb();
  await assertSucceeds(
    setDoc(doc(db, 'businesses', OWNER_UID, 'categories', 'cat-1'), {
      name: 'Bebidas',
      order: 1,
      createdAt: serverTimestamp(),
    }),
  );
});

test('regresión: el dueño puede crear un cliente y registrar un fiado', async () => {
  await seedValidBusiness();
  const db = ownerDb();
  await assertSucceeds(
    setDoc(doc(db, 'businesses', OWNER_UID, 'customers', 'cust-1'), {
      name: 'Juan Pérez',
      balance: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
  await assertSucceeds(
    setDoc(doc(db, 'businesses', OWNER_UID, 'customers', 'cust-1', 'movements', 'mov-1'), {
      type: 'fiado',
      amount: 500,
      balanceAfter: 500,
      createdAt: serverTimestamp(),
    }),
  );
});

test('regresión: el dueño puede abrir una caja', async () => {
  await seedValidBusiness();
  const db = ownerDb();
  await assertSucceeds(
    setDoc(doc(db, 'businesses', OWNER_UID, 'cashSessions', 'session-1'), {
      date: '2026-07-05',
      openingBalance: 0,
      status: 'open',
      summary: {
        totalIngresos: 0,
        totalEgresos: 0,
        efectivo: 0,
        mercadoPago: 0,
        transferencia: 0,
        otro: 0,
        movementsCount: 0,
      },
      createdAt: serverTimestamp(),
    }),
  );
});

// ── Regresión encontrada al comparar contra producción (2026-07-05) ───────
//
// Al reconstruir firestore.rules se asumió, siguiendo DECISIONES_TECNICAS.md,
// que movements/cashMovements eran inmutables y que customers no se podía
// borrar. El texto real de producción (más permisivo) y una revisión del
// código mostraron que eso era incorrecto: annulMovement/annulCashMovement
// hacen tx.update(...) sobre el documento original para marcarlo `annulled`,
// y existe una pantalla real de "eliminar cliente". Estos tests confirman
// que las reglas corregidas permiten exactamente eso — sin abrir nada más.

test('anular un movimiento de fiado actualiza el original (como annulMovement)', async () => {
  await seedValidBusiness();
  const db = ownerDb();
  await setDoc(doc(db, 'businesses', OWNER_UID, 'customers', 'cust-1'), {
    name: 'Juan Pérez',
    balance: 500,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await setDoc(doc(db, 'businesses', OWNER_UID, 'customers', 'cust-1', 'movements', 'mov-1'), {
    type: 'fiado',
    amount: 500,
    balanceAfter: 500,
    createdAt: serverTimestamp(),
  });
  await assertSucceeds(
    updateDoc(doc(db, 'businesses', OWNER_UID, 'customers', 'cust-1', 'movements', 'mov-1'), {
      annulled: true,
      linkedMovementId: 'reversal-1',
    }),
  );
});

test('anular un movimiento de caja actualiza el original (como annulCashMovement)', async () => {
  await seedValidBusiness();
  const db = ownerDb();
  await setDoc(doc(db, 'businesses', OWNER_UID, 'cashSessions', 'session-1'), {
    date: '2026-07-05',
    openingBalance: 0,
    status: 'open',
    summary: {
      totalIngresos: 100,
      totalEgresos: 0,
      efectivo: 100,
      mercadoPago: 0,
      transferencia: 0,
      otro: 0,
      movementsCount: 1,
    },
    createdAt: serverTimestamp(),
  });
  await setDoc(doc(db, 'businesses', OWNER_UID, 'cashSessions', 'session-1', 'cashMovements', 'mov-1'), {
    type: 'ingreso',
    amount: 100,
    createdAt: serverTimestamp(),
  });
  await assertSucceeds(
    updateDoc(
      doc(db, 'businesses', OWNER_UID, 'cashSessions', 'session-1', 'cashMovements', 'mov-1'),
      { annulled: true, linkedMovementId: 'reversal-1' },
    ),
  );
});

test('el dueño puede eliminar un cliente (como la pantalla de editar cliente)', async () => {
  await seedValidBusiness();
  const db = ownerDb();
  await setDoc(doc(db, 'businesses', OWNER_UID, 'customers', 'cust-1'), {
    name: 'Cliente a borrar',
    balance: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await assertSucceeds(deleteDoc(doc(db, 'businesses', OWNER_UID, 'customers', 'cust-1')));
});

// ── Fase 6: adminAuditLogs es inaccesible para cualquier cliente ─────────
//
// Las Cloud Functions callable (adminChangePlan, etc.) usan el Admin SDK,
// que ignora estas reglas por completo — lo que se prueba acá es que NADIE,
// ni siquiera el propio dueño de una cuenta con el custom claim admin (los
// custom claims no existen en este entorno de test de Rules, que solo conoce
// auth.uid), puede leer o escribir esta colección directamente desde un
// cliente Firestore.

test('nadie puede leer adminAuditLogs directamente desde un cliente', async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'adminAuditLogs', 'log-1'), {
      actorUid: OWNER_UID,
      businessId: OWNER_UID,
      action: 'activate_pro',
      reason: null,
      createdAt: serverTimestamp(),
    });
  });
  const db = ownerDb();
  const { getDoc } = await import('firebase/firestore');
  await assertFails(getDoc(doc(db, 'adminAuditLogs', 'log-1')));
});

test('nadie puede escribir adminAuditLogs directamente desde un cliente', async () => {
  const db = ownerDb();
  await assertFails(
    setDoc(doc(db, 'adminAuditLogs', 'log-2'), {
      actorUid: OWNER_UID,
      businessId: OWNER_UID,
      action: 'activate_pro',
      reason: null,
      createdAt: serverTimestamp(),
    }),
  );
});

// ── Libreta de cobros: adminBilling es inaccesible para cualquier cliente ──
//
// Mismo criterio que adminAuditLogs arriba: las Cloud Functions callable
// (adminGetBillingDetail/adminRecordPayment/adminUpdateBillingNotes) usan el
// Admin SDK, que ignora estas reglas por completo — lo que se prueba acá es
// que NADIE, ni siquiera el propio dueño del negocio, puede leer o escribir
// esta colección (ni el documento resumen ni la subcolección de pagos)
// directamente desde un cliente Firestore.

test('nadie puede leer adminBilling directamente desde un cliente', async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'adminBilling', OWNER_UID), {
      businessId: OWNER_UID,
      lastPaymentAt: serverTimestamp(),
      nextPaymentDueAt: Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000),
      paymentMethod: 'transferencia',
      lastAmount: 5000,
      currency: 'ARS',
      updatedAt: serverTimestamp(),
      updatedBy: 'admin-uid',
    });
  });
  const db = ownerDb();
  await assertFails(getDoc(doc(db, 'adminBilling', OWNER_UID)));
});

test('nadie puede escribir adminBilling directamente desde un cliente', async () => {
  const db = ownerDb();
  await assertFails(
    setDoc(doc(db, 'adminBilling', OWNER_UID), {
      businessId: OWNER_UID,
      lastAmount: 999999,
      currency: 'ARS',
      updatedAt: serverTimestamp(),
      updatedBy: OWNER_UID,
    }),
  );
});

test('nadie puede leer ni escribir la subcolección de pagos de adminBilling directamente', async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'adminBilling', OWNER_UID, 'payments', 'pay-1'), {
      businessId: OWNER_UID,
      amount: 5000,
      currency: 'ARS',
      method: 'transferencia',
      paidAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      createdBy: 'admin-uid',
    });
  });
  const db = ownerDb();
  await assertFails(getDoc(doc(db, 'adminBilling', OWNER_UID, 'payments', 'pay-1')));
  await assertFails(
    setDoc(doc(db, 'adminBilling', OWNER_UID, 'payments', 'pay-2'), {
      businessId: OWNER_UID,
      amount: 1,
      currency: 'ARS',
      method: 'otro',
      paidAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      createdBy: OWNER_UID,
    }),
  );
});
