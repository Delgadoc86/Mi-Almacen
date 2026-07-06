// Fase 5: enforcement real de planIsActive() en products, categories,
// customers, customer movements, cashSessions y cashMovements.
//
// Todos los tests negativos usan un cliente autenticado normal
// (testEnv.authenticatedContext), NUNCA Admin SDK ni
// withSecurityRulesDisabled para la acción bajo prueba — Console/Admin SDK
// no representan al cliente móvil real y no probarían nada sobre las Rules.
// withSecurityRulesDisabled solo se usa para preparar datos previos
// (seed), nunca para la operación que se está evaluando.
//
// Cómo correr: firebase emulators:exec --only firestore,auth "npm run test:rules"

import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';
import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  writeBatch,
  runTransaction,
  serverTimestamp,
  increment,
  Timestamp,
} from 'firebase/firestore';

// Project ID propio — ver nota en los otros archivos de este directorio
// sobre por qué node --test en paralelo exige esto.
const PROJECT_ID = 'minegocio-rules-test-plan-enforcement';
const OWNER_UID = 'owner-1';
const DAY = 24 * 60 * 60 * 1000;

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

// ── Seeds (bypassean Rules a propósito, solo para preparar estado previo) ──

async function seedBusiness(plan) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const data = {
      id: OWNER_UID,
      ownerUid: OWNER_UID,
      name: 'Almacén de prueba',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    if (plan !== undefined) data.plan = plan;
    await setDoc(doc(db, 'businesses', OWNER_UID), data);
  });
}

function proPlan() {
  return {
    type: 'pro',
    status: 'active',
    trialStartedAt: Timestamp.now(),
    trialEndsAt: Timestamp.fromMillis(Date.now() + 30 * DAY),
    updatedAt: Timestamp.now(),
  };
}

function trialActivePlan() {
  return {
    type: 'trial',
    status: 'active',
    trialStartedAt: Timestamp.fromMillis(Date.now() - DAY),
    trialEndsAt: Timestamp.fromMillis(Date.now() + 20 * DAY),
    updatedAt: Timestamp.now(),
  };
}

function trialExpiredPlan() {
  return {
    type: 'trial',
    status: 'active',
    trialStartedAt: Timestamp.fromMillis(Date.now() - 40 * DAY),
    trialEndsAt: Timestamp.fromMillis(Date.now() - 10 * DAY),
    updatedAt: Timestamp.now(),
  };
}

function readonlyPlan() {
  return { ...proPlan(), status: 'readonly' };
}

function suspendedPlan() {
  return { ...proPlan(), status: 'suspended' };
}

async function seedProduct(id = 'prod-1') {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'businesses', OWNER_UID, 'products', id), {
      name: 'Fideos', type: 'unidad', categoryId: 'almacen',
      cost: 100, margin: 30, roundTo: 10, price: 130,
      createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
    });
  });
}

async function seedCategory(id = 'cat-1') {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'businesses', OWNER_UID, 'categories', id), {
      name: 'Bebidas', order: 1, createdAt: Timestamp.now(),
    });
  });
}

async function seedCustomer(id = 'cust-1', balance = 0) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'businesses', OWNER_UID, 'customers', id), {
      name: 'Juan Pérez', balance, createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
    });
  });
}

async function seedMovement(customerId = 'cust-1', movId = 'mov-1', amount = 500) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'businesses', OWNER_UID, 'customers', customerId, 'movements', movId), {
      type: 'fiado', amount, balanceAfter: amount, createdAt: Timestamp.now(),
    });
  });
}

async function seedCashSession(id = 'session-1', status = 'open') {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'businesses', OWNER_UID, 'cashSessions', id), {
      date: '2026-07-05', openingBalance: 0, status,
      summary: { totalIngresos: 0, totalEgresos: 0, efectivo: 0, mercadoPago: 0, transferencia: 0, otro: 0, movementsCount: 0 },
      createdAt: Timestamp.now(),
    });
  });
}

async function seedCashMovement(sessionId = 'session-1', movId = 'cmov-1') {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'businesses', OWNER_UID, 'cashSessions', sessionId, 'cashMovements', movId), {
      type: 'ingreso', amount: 100, createdAt: Timestamp.now(),
    });
  });
}

// ── Trial vencido: create/update/delete DENEGADOS en las 6 colecciones ────
// (exhaustivo acá porque planIsActive() es la misma función en las 6 —
// probarla a fondo en un solo estado y solo con muestras representativas en
// los otros 3 estados evita 4x la misma combinatoria sin perder cobertura
// real de que está conectada en cada `match`.)

test('trial vencido: NO puede crear producto', async () => {
  await seedBusiness(trialExpiredPlan());
  const db = ownerDb();
  await assertFails(setDoc(doc(db, 'businesses', OWNER_UID, 'products', 'prod-1'), {
    name: 'X', type: 'unidad', categoryId: 'almacen', cost: 1, margin: 1, roundTo: 10, price: 1,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  }));
});

test('trial vencido: NO puede editar producto existente', async () => {
  await seedBusiness(trialExpiredPlan());
  await seedProduct();
  const db = ownerDb();
  await assertFails(updateDoc(doc(db, 'businesses', OWNER_UID, 'products', 'prod-1'), { price: 999 }));
});

test('trial vencido: NO puede eliminar producto existente', async () => {
  await seedBusiness(trialExpiredPlan());
  await seedProduct();
  const db = ownerDb();
  await assertFails(deleteDoc(doc(db, 'businesses', OWNER_UID, 'products', 'prod-1')));
});

test('trial vencido: NO puede crear/eliminar categoría', async () => {
  await seedBusiness(trialExpiredPlan());
  await seedCategory();
  const db = ownerDb();
  await assertFails(setDoc(doc(db, 'businesses', OWNER_UID, 'categories', 'cat-2'), { name: 'Y', order: 2, createdAt: serverTimestamp() }));
  await assertFails(deleteDoc(doc(db, 'businesses', OWNER_UID, 'categories', 'cat-1')));
});

test('trial vencido: NO puede crear/editar/eliminar cliente', async () => {
  await seedBusiness(trialExpiredPlan());
  await seedCustomer();
  const db = ownerDb();
  await assertFails(setDoc(doc(db, 'businesses', OWNER_UID, 'customers', 'cust-2'), { name: 'Z', balance: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(db, 'businesses', OWNER_UID, 'customers', 'cust-1'), { name: 'Editado' }));
  await assertFails(deleteDoc(doc(db, 'businesses', OWNER_UID, 'customers', 'cust-1')));
});

test('trial vencido: NO puede crear ni anular un movimiento de fiado', async () => {
  await seedBusiness(trialExpiredPlan());
  await seedCustomer();
  await seedMovement();
  const db = ownerDb();
  await assertFails(setDoc(doc(db, 'businesses', OWNER_UID, 'customers', 'cust-1', 'movements', 'mov-2'), {
    type: 'pago', amount: 100, balanceAfter: 400, createdAt: serverTimestamp(),
  }));
  await assertFails(updateDoc(doc(db, 'businesses', OWNER_UID, 'customers', 'cust-1', 'movements', 'mov-1'), { annulled: true }));
});

test('trial vencido: NO puede abrir/actualizar una sesión de caja', async () => {
  await seedBusiness(trialExpiredPlan());
  await seedCashSession();
  const db = ownerDb();
  await assertFails(setDoc(doc(db, 'businesses', OWNER_UID, 'cashSessions', 'session-2'), {
    date: '2026-07-05', openingBalance: 0, status: 'open',
    summary: { totalIngresos: 0, totalEgresos: 0, efectivo: 0, mercadoPago: 0, transferencia: 0, otro: 0, movementsCount: 0 },
    createdAt: serverTimestamp(),
  }));
  await assertFails(updateDoc(doc(db, 'businesses', OWNER_UID, 'cashSessions', 'session-1'), { status: 'closed' }));
});

test('trial vencido: NO puede crear ni anular un movimiento de caja', async () => {
  await seedBusiness(trialExpiredPlan());
  await seedCashSession();
  await seedCashMovement();
  const db = ownerDb();
  await assertFails(setDoc(doc(db, 'businesses', OWNER_UID, 'cashSessions', 'session-1', 'cashMovements', 'cmov-2'), {
    type: 'egreso', amount: 50, createdAt: serverTimestamp(),
  }));
  await assertFails(updateDoc(doc(db, 'businesses', OWNER_UID, 'cashSessions', 'session-1', 'cashMovements', 'cmov-1'), { annulled: true }));
});

// ── Readonly: muestra representativa (misma función que trial vencido) ───

test('readonly: NO puede crear/editar/eliminar producto', async () => {
  await seedBusiness(readonlyPlan());
  await seedProduct();
  const db = ownerDb();
  await assertFails(setDoc(doc(db, 'businesses', OWNER_UID, 'products', 'prod-2'), {
    name: 'Y', type: 'unidad', categoryId: 'almacen', cost: 1, margin: 1, roundTo: 10, price: 1,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  }));
  await assertFails(updateDoc(doc(db, 'businesses', OWNER_UID, 'products', 'prod-1'), { price: 1 }));
  await assertFails(deleteDoc(doc(db, 'businesses', OWNER_UID, 'products', 'prod-1')));
});

// ── Suspended: muestra representativa ──────────────────────────────────────

test('suspended: NO puede crear/editar/eliminar producto', async () => {
  await seedBusiness(suspendedPlan());
  await seedProduct();
  const db = ownerDb();
  await assertFails(setDoc(doc(db, 'businesses', OWNER_UID, 'products', 'prod-2'), {
    name: 'Y', type: 'unidad', categoryId: 'almacen', cost: 1, margin: 1, roundTo: 10, price: 1,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  }));
  await assertFails(updateDoc(doc(db, 'businesses', OWNER_UID, 'products', 'prod-1'), { price: 1 }));
  await assertFails(deleteDoc(doc(db, 'businesses', OWNER_UID, 'products', 'prod-1')));
});

// ── Plan ausente: ni el campo falta, ni la forma legacy 'free' habilitan nada ─

test('plan ausente (campo plan inexistente): NO puede crear/editar/eliminar producto', async () => {
  await seedBusiness(undefined);
  await seedProduct();
  const db = ownerDb();
  await assertFails(setDoc(doc(db, 'businesses', OWNER_UID, 'products', 'prod-2'), {
    name: 'Y', type: 'unidad', categoryId: 'almacen', cost: 1, margin: 1, roundTo: 10, price: 1,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  }));
  await assertFails(updateDoc(doc(db, 'businesses', OWNER_UID, 'products', 'prod-1'), { price: 1 }));
  await assertFails(deleteDoc(doc(db, 'businesses', OWNER_UID, 'products', 'prod-1')));
});

test('plan ausente (forma legacy string "free"): NO puede crear producto', async () => {
  await seedBusiness('free');
  const db = ownerDb();
  await assertFails(setDoc(doc(db, 'businesses', OWNER_UID, 'products', 'prod-1'), {
    name: 'Y', type: 'unidad', categoryId: 'almacen', cost: 1, margin: 1, roundTo: 10, price: 1,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  }));
});

// ── Controles positivos: el enforcement no debe romper lo legítimo ────────

// NOTA: estos 6 controles positivos se escriben como tests planos
// independientes, NO como subtests anidados (t.test) dentro de un mismo
// test — se encontró que node:test + @firebase/rules-unit-testing, en este
// archivo puntual (después de las ~12 pruebas negativas anteriores),
// produce fallos no determinísticos con subtests anidados ("Null value
// error" espurio al leer businesses/{uid} desde planIsActive(), que no
// ocurre con exactamente las mismas aserciones en tests planos). Es una
// rareza del harness de pruebas, no de firestore.rules — verificado
// aislando el caso: las mismas operaciones, con el mismo plan Pro
// sembrado, pasan de forma consistente en un test plano y fallan de forma
// consistente en un subtest anidado en este mismo archivo. Se documenta
// acá para que quede claro por qué el estilo difiere del resto de los
// archivos de este directorio.

test('Pro activo: puede crear/editar/eliminar producto', async () => {
  await seedBusiness(proPlan());
  const db = ownerDb();
  await assertSucceeds(setDoc(doc(db, 'businesses', OWNER_UID, 'products', 'p1'), {
    name: 'X', type: 'unidad', categoryId: 'almacen', cost: 1, margin: 1, roundTo: 10, price: 1,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  }));
  await assertSucceeds(updateDoc(doc(db, 'businesses', OWNER_UID, 'products', 'p1'), { price: 2 }));
  await assertSucceeds(deleteDoc(doc(db, 'businesses', OWNER_UID, 'products', 'p1')));
});

test('Pro activo: puede crear/eliminar categoría', async () => {
  await seedBusiness(proPlan());
  const db = ownerDb();
  await assertSucceeds(setDoc(doc(db, 'businesses', OWNER_UID, 'categories', 'c1'), { name: 'X', order: 1, createdAt: serverTimestamp() }));
  await assertSucceeds(deleteDoc(doc(db, 'businesses', OWNER_UID, 'categories', 'c1')));
});

test('Pro activo: puede crear/editar/eliminar cliente', async () => {
  await seedBusiness(proPlan());
  const db = ownerDb();
  await assertSucceeds(setDoc(doc(db, 'businesses', OWNER_UID, 'customers', 'cu1'), { name: 'X', balance: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
  await assertSucceeds(updateDoc(doc(db, 'businesses', OWNER_UID, 'customers', 'cu1'), { name: 'Y' }));
  await assertSucceeds(deleteDoc(doc(db, 'businesses', OWNER_UID, 'customers', 'cu1')));
});

test('Pro activo: puede crear/anular un movimiento de fiado', async () => {
  await seedBusiness(proPlan());
  await seedCustomer('cu2');
  const db = ownerDb();
  await assertSucceeds(setDoc(doc(db, 'businesses', OWNER_UID, 'customers', 'cu2', 'movements', 'm1'), {
    type: 'fiado', amount: 100, balanceAfter: 100, createdAt: serverTimestamp(),
  }));
  await assertSucceeds(updateDoc(doc(db, 'businesses', OWNER_UID, 'customers', 'cu2', 'movements', 'm1'), { annulled: true }));
});

test('Pro activo: puede abrir/cerrar una sesión de caja', async () => {
  await seedBusiness(proPlan());
  const db = ownerDb();
  await assertSucceeds(setDoc(doc(db, 'businesses', OWNER_UID, 'cashSessions', 's1'), {
    date: '2026-07-05', openingBalance: 0, status: 'open',
    summary: { totalIngresos: 0, totalEgresos: 0, efectivo: 0, mercadoPago: 0, transferencia: 0, otro: 0, movementsCount: 0 },
    createdAt: serverTimestamp(),
  }));
  await assertSucceeds(updateDoc(doc(db, 'businesses', OWNER_UID, 'cashSessions', 's1'), { status: 'closed' }));
});

test('Pro activo: puede crear/anular un movimiento de caja', async () => {
  await seedBusiness(proPlan());
  await seedCashSession('s2');
  const db = ownerDb();
  await assertSucceeds(setDoc(doc(db, 'businesses', OWNER_UID, 'cashSessions', 's2', 'cashMovements', 'cm1'), {
    type: 'ingreso', amount: 100, createdAt: serverTimestamp(),
  }));
  await assertSucceeds(updateDoc(doc(db, 'businesses', OWNER_UID, 'cashSessions', 's2', 'cashMovements', 'cm1'), { annulled: true }));
});

test('trial vigente (no vencido): puede crear/editar/eliminar producto', async () => {
  await seedBusiness(trialActivePlan());
  const db = ownerDb();
  await assertSucceeds(setDoc(doc(db, 'businesses', OWNER_UID, 'products', 'p1'), {
    name: 'X', type: 'unidad', categoryId: 'almacen', cost: 1, margin: 1, roundTo: 10, price: 1,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  }));
  await assertSucceeds(updateDoc(doc(db, 'businesses', OWNER_UID, 'products', 'p1'), { price: 2 }));
  await assertSucceeds(deleteDoc(doc(db, 'businesses', OWNER_UID, 'products', 'p1')));
});

// ── Regresión: operaciones reales con batch/transaction (Pro activo) ─────
// Reproducen exactamente los patrones de escritura de src/services/customers.ts
// y src/services/cash.ts — no importan el código de la app (los tests de
// Rules no dependen de la app), pero replican la MISMA forma de escritura.

test('registrar fiado (transacción: movement + customer) — Pro activo', async () => {
  await seedBusiness(proPlan());
  await seedCustomer('cu-fiado', 0);
  const db = ownerDb();
  const customerRef = doc(db, 'businesses', OWNER_UID, 'customers', 'cu-fiado');
  const movRef = doc(db, 'businesses', OWNER_UID, 'customers', 'cu-fiado', 'movements', 'mov-fiado');

  await assertSucceeds(runTransaction(db, async (tx) => {
    tx.update(customerRef, { balance: 500, updatedAt: serverTimestamp() });
    tx.set(movRef, { type: 'fiado', amount: 500, balanceAfter: 500, createdAt: serverTimestamp() });
  }));
});

test('registrar cobro con caja abierta (transacción de 4 escrituras) — Pro activo', async () => {
  await seedBusiness(proPlan());
  await seedCustomer('cu-cobro', 500);
  await seedCashSession('session-cobro', 'open');
  const db = ownerDb();
  const customerRef = doc(db, 'businesses', OWNER_UID, 'customers', 'cu-cobro');
  const movRef = doc(db, 'businesses', OWNER_UID, 'customers', 'cu-cobro', 'movements', 'mov-cobro');
  const cashSessionRef = doc(db, 'businesses', OWNER_UID, 'cashSessions', 'session-cobro');
  const cashMovRef = doc(db, 'businesses', OWNER_UID, 'cashSessions', 'session-cobro', 'cashMovements', 'cmov-cobro');

  await assertSucceeds(runTransaction(db, async (tx) => {
    tx.update(customerRef, { balance: 0, updatedAt: serverTimestamp() });
    tx.set(movRef, { type: 'pago', amount: 500, balanceAfter: 0, createdAt: serverTimestamp() });
    tx.set(cashMovRef, { type: 'ingreso', amount: 500, medioPago: 'efectivo', createdAt: serverTimestamp() });
    tx.update(cashSessionRef, {
      'summary.movementsCount': increment(1),
      'summary.totalIngresos': increment(500),
      'summary.efectivo': increment(500),
    });
  }));
});

test('anular fiado (transacción: movement original + reversal + customer) — Pro activo', async () => {
  await seedBusiness(proPlan());
  await seedCustomer('cu-anular', 500);
  await seedMovement('cu-anular', 'mov-orig', 500);
  const db = ownerDb();
  const customerRef = doc(db, 'businesses', OWNER_UID, 'customers', 'cu-anular');
  const origRef = doc(db, 'businesses', OWNER_UID, 'customers', 'cu-anular', 'movements', 'mov-orig');
  const reversalRef = doc(db, 'businesses', OWNER_UID, 'customers', 'cu-anular', 'movements', 'mov-reversal');

  await assertSucceeds(runTransaction(db, async (tx) => {
    tx.update(origRef, { annulled: true, linkedMovementId: 'mov-reversal' });
    tx.set(reversalRef, {
      type: 'reversal', amount: 500, balanceAfter: 0, linkedMovementId: 'mov-orig', createdAt: serverTimestamp(),
    });
    tx.update(customerRef, { balance: 0, updatedAt: serverTimestamp() });
  }));
});

test('abrir caja (create) — Pro activo', async () => {
  await seedBusiness(proPlan());
  const db = ownerDb();
  await assertSucceeds(setDoc(doc(db, 'businesses', OWNER_UID, 'cashSessions', 'session-open'), {
    date: '2026-07-05', openingBalance: 0, status: 'open',
    summary: { totalIngresos: 0, totalEgresos: 0, efectivo: 0, mercadoPago: 0, transferencia: 0, otro: 0, movementsCount: 0 },
    createdAt: serverTimestamp(),
  }));
});

test('cerrar caja (update) — Pro activo', async () => {
  await seedBusiness(proPlan());
  await seedCashSession('session-close', 'open');
  const db = ownerDb();
  await assertSucceeds(updateDoc(doc(db, 'businesses', OWNER_UID, 'cashSessions', 'session-close'), {
    status: 'closed', closedAt: serverTimestamp(),
  }));
});

test('registrar ingreso/gasto (batch: cashMovement + cashSession) — Pro activo', async () => {
  await seedBusiness(proPlan());
  await seedCashSession('session-batch', 'open');
  const db = ownerDb();
  const movRef = doc(db, 'businesses', OWNER_UID, 'cashSessions', 'session-batch', 'cashMovements', 'cmov-batch');
  const sessionRef = doc(db, 'businesses', OWNER_UID, 'cashSessions', 'session-batch');

  const batch = writeBatch(db);
  batch.set(movRef, { type: 'egreso', amount: 200, description: 'Flete', createdAt: serverTimestamp() });
  batch.update(sessionRef, { 'summary.movementsCount': increment(1), 'summary.totalEgresos': increment(200) });
  await assertSucceeds(batch.commit());
});

test('anular movimiento de caja (transacción: original + reversal + session) — Pro activo', async () => {
  await seedBusiness(proPlan());
  await seedCashSession('session-annul', 'open');
  await seedCashMovement('session-annul', 'cmov-orig');
  const db = ownerDb();
  const origRef = doc(db, 'businesses', OWNER_UID, 'cashSessions', 'session-annul', 'cashMovements', 'cmov-orig');
  const reversalRef = doc(db, 'businesses', OWNER_UID, 'cashSessions', 'session-annul', 'cashMovements', 'cmov-reversal');
  const sessionRef = doc(db, 'businesses', OWNER_UID, 'cashSessions', 'session-annul');

  await assertSucceeds(runTransaction(db, async (tx) => {
    tx.update(origRef, { annulled: true, linkedMovementId: 'cmov-reversal' });
    tx.set(reversalRef, { type: 'egreso', amount: 100, isReversal: true, linkedMovementId: 'cmov-orig', createdAt: serverTimestamp() });
    tx.update(sessionRef, { 'summary.movementsCount': increment(1), 'summary.totalEgresos': increment(100) });
  }));
});

// ── La misma regresión de "registrar fiado", pero con trial vencido ───────
// Confirma que el enforcement bloquea el FLUJO REAL completo (transacción
// de 2 escrituras), no solo un create aislado de prueba.

test('registrar fiado bajo trial vencido: la transacción completa es rechazada', async () => {
  await seedBusiness(trialExpiredPlan());
  await seedCustomer('cu-vencido', 0);
  const db = ownerDb();
  const customerRef = doc(db, 'businesses', OWNER_UID, 'customers', 'cu-vencido');
  const movRef = doc(db, 'businesses', OWNER_UID, 'customers', 'cu-vencido', 'movements', 'mov-vencido');

  await assertFails(runTransaction(db, async (tx) => {
    tx.update(customerRef, { balance: 500, updatedAt: serverTimestamp() });
    tx.set(movRef, { type: 'fiado', amount: 500, balanceAfter: 500, createdAt: serverTimestamp() });
  }));
});

// ── Fase 5.1: enforcement en businesses/{businessId} (documento raíz) ─────
//
// Cierra el hueco que Fase 5 dejó: updateBusiness/updateBusinessPreferences
// (nombre, preferencias) escriben directo sobre businesses/{uid}, no sobre
// una subcolección — sin esto, una cuenta readonly/suspended/vencida podía
// seguir guardando Configuración aunque la UI (Fase 4) ya se lo impidiera.
// `deletionRequest` es la única excepción: debe seguir funcionando siempre,
// pero aislado (no se puede combinar con ningún otro cambio en la misma
// escritura).

test('Pro activo: puede actualizar nombre y preferencias', async () => {
  await seedBusiness(proPlan());
  const db = ownerDb();
  await assertSucceeds(updateDoc(doc(db, 'businesses', OWNER_UID), {
    name: 'Nuevo nombre', updatedAt: serverTimestamp(),
  }));
  await assertSucceeds(updateDoc(doc(db, 'businesses', OWNER_UID), {
    defaultMargin: 30, defaultRoundTo: 10, updatedAt: serverTimestamp(),
  }));
});

test('Trial vigente: puede actualizar nombre y preferencias', async () => {
  await seedBusiness(trialActivePlan());
  const db = ownerDb();
  await assertSucceeds(updateDoc(doc(db, 'businesses', OWNER_UID), {
    name: 'Nuevo nombre', updatedAt: serverTimestamp(),
  }));
  await assertSucceeds(updateDoc(doc(db, 'businesses', OWNER_UID), {
    defaultMargin: 30, defaultRoundTo: 10, updatedAt: serverTimestamp(),
  }));
});

test('Trial vencido: NO puede actualizar nombre ni preferencias', async () => {
  await seedBusiness(trialExpiredPlan());
  const db = ownerDb();
  await assertFails(updateDoc(doc(db, 'businesses', OWNER_UID), {
    name: 'Nuevo nombre', updatedAt: serverTimestamp(),
  }));
  await assertFails(updateDoc(doc(db, 'businesses', OWNER_UID), {
    defaultMargin: 30, updatedAt: serverTimestamp(),
  }));
});

test('readonly: NO puede actualizar nombre ni preferencias', async () => {
  await seedBusiness(readonlyPlan());
  const db = ownerDb();
  await assertFails(updateDoc(doc(db, 'businesses', OWNER_UID), {
    name: 'Nuevo nombre', updatedAt: serverTimestamp(),
  }));
  await assertFails(updateDoc(doc(db, 'businesses', OWNER_UID), {
    defaultRoundTo: 50, updatedAt: serverTimestamp(),
  }));
});

test('suspended: NO puede actualizar nombre ni preferencias', async () => {
  await seedBusiness(suspendedPlan());
  const db = ownerDb();
  await assertFails(updateDoc(doc(db, 'businesses', OWNER_UID), {
    name: 'Nuevo nombre', updatedAt: serverTimestamp(),
  }));
  await assertFails(updateDoc(doc(db, 'businesses', OWNER_UID), {
    defaultCategoryId: 'bebidas', updatedAt: serverTimestamp(),
  }));
});

test('plan ausente: NO puede actualizar nombre (intento directo, sin pasar por la app)', async () => {
  await seedBusiness(undefined);
  const db = ownerDb();
  await assertFails(updateDoc(doc(db, 'businesses', OWNER_UID), {
    name: 'Nuevo nombre', updatedAt: serverTimestamp(),
  }));
});

test('readonly puede crear una solicitud de eliminación de cuenta válida', async () => {
  await seedBusiness(readonlyPlan());
  const db = ownerDb();
  await assertSucceeds(updateDoc(doc(db, 'businesses', OWNER_UID), {
    deletionRequest: { requestedAt: serverTimestamp() },
  }));
});

test('suspended puede crear una solicitud de eliminación de cuenta válida', async () => {
  await seedBusiness(suspendedPlan());
  const db = ownerDb();
  await assertSucceeds(updateDoc(doc(db, 'businesses', OWNER_UID), {
    deletionRequest: { requestedAt: serverTimestamp() },
  }));
});

test('trial vencido puede crear una solicitud de eliminación de cuenta válida', async () => {
  await seedBusiness(trialExpiredPlan());
  const db = ownerDb();
  await assertSucceeds(updateDoc(doc(db, 'businesses', OWNER_UID), {
    deletionRequest: { requestedAt: serverTimestamp() },
  }));
});

test('NO se puede crear deletionRequest y cambiar el nombre en la misma escritura', async () => {
  await seedBusiness(readonlyPlan());
  const db = ownerDb();
  await assertFails(updateDoc(doc(db, 'businesses', OWNER_UID), {
    name: 'Nuevo nombre',
    deletionRequest: { requestedAt: serverTimestamp() },
  }));
});

test('NO se puede crear deletionRequest y cambiar preferencias en la misma escritura', async () => {
  await seedBusiness(proPlan());
  const db = ownerDb();
  await assertFails(updateDoc(doc(db, 'businesses', OWNER_UID), {
    defaultMargin: 40,
    deletionRequest: { requestedAt: serverTimestamp() },
  }));
});

test('NO se puede modificar una solicitud de eliminación ya existente', async () => {
  await seedBusiness(proPlan());
  const db = ownerDb();
  await assertSucceeds(updateDoc(doc(db, 'businesses', OWNER_UID), {
    deletionRequest: { requestedAt: serverTimestamp() },
  }));
  await assertFails(updateDoc(doc(db, 'businesses', OWNER_UID), {
    deletionRequest: { requestedAt: serverTimestamp() },
  }));
});

test('NO se puede borrar una solicitud de eliminación ya existente', async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'businesses', OWNER_UID), {
      id: OWNER_UID, ownerUid: OWNER_UID, name: 'X',
      plan: proPlan(),
      deletionRequest: { requestedAt: Timestamp.now() },
      createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
    });
  });
  const db = ownerDb();
  await assertFails(updateDoc(doc(db, 'businesses', OWNER_UID), {
    deletionRequest: deleteField(),
  }));
});

test('regresión: una cuenta activa sigue pudiendo guardar Configuración (nombre + preferencias juntos)', async () => {
  await seedBusiness(proPlan());
  const db = ownerDb();
  await assertSucceeds(updateDoc(doc(db, 'businesses', OWNER_UID), {
    name: 'Almacén renovado',
    defaultMargin: 35,
    defaultRoundTo: 100,
    defaultCategoryId: 'almacen',
    updatedAt: serverTimestamp(),
  }));
});
