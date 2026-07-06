// Tests de Firestore Rules para el modelo de plan SaaS (Fase 1).
// Corre contra el Firestore Emulator — nunca toca el proyecto real.
//
// Cómo correr: ver docs/SAAS_ROADMAP.md, sección "Fase 1 — Resultado",
// o directamente:
//   firebase emulators:exec --only firestore "node --test scripts/rules-tests"

import test from 'node:test';
import assert from 'node:assert/strict';
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
  getDoc,
  collection,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

// Project ID propio (no compartido con otros archivos de test): node --test
// puede correr archivos en paralelo, y dos test envs contra el mismo
// projectId terminan pisándose datos entre sí en el emulador.
const PROJECT_ID = 'minegocio-rules-test-business-plan';
const OWNER_UID = 'owner-1';
const OTHER_UID = 'other-2';

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

function validTrialPlan() {
  return {
    type: 'trial',
    status: 'active',
    trialStartedAt: serverTimestamp(),
    trialEndsAt: Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000),
    updatedAt: serverTimestamp(),
  };
}

function ownerDb() {
  return testEnv.authenticatedContext(OWNER_UID).firestore();
}

function otherDb() {
  return testEnv.authenticatedContext(OTHER_UID).firestore();
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

// Con proActivatedAt presente — para poder probar deleteField() sobre un
// campo que sí existe (deleteField() sobre un campo ausente es un no-op,
// no prueba nada).
async function seedProBusinessWithProActivatedAt() {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'businesses', OWNER_UID), {
      id: OWNER_UID,
      ownerUid: OWNER_UID,
      name: 'Almacén pro de prueba',
      plan: {
        type: 'pro',
        status: 'active',
        trialStartedAt: Timestamp.now(),
        trialEndsAt: Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000),
        proActivatedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  });
}

async function seedLegacyBusinessWithoutPlan() {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'businesses', OWNER_UID), {
      id: OWNER_UID,
      ownerUid: OWNER_UID,
      name: 'Almacén legacy',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  });
}

// ── Creación de negocio (registro) ────────────────────────────────────────

test('un usuario puede crear su propio negocio con un trial válido', async () => {
  const db = ownerDb();
  await assertSucceeds(
    setDoc(doc(db, 'businesses', OWNER_UID), {
      id: OWNER_UID,
      ownerUid: OWNER_UID,
      name: 'Almacén de prueba',
      plan: validTrialPlan(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
});

test('un usuario NO puede crear un negocio con un uid que no es el suyo', async () => {
  const db = ownerDb();
  await assertFails(
    setDoc(doc(db, 'businesses', OTHER_UID), {
      id: OTHER_UID,
      ownerUid: OTHER_UID,
      name: 'Negocio ajeno',
      plan: validTrialPlan(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
});

test('NO se puede crear un negocio con plan.type = pro directamente', async () => {
  const db = ownerDb();
  const plan = { ...validTrialPlan(), type: 'pro' };
  await assertFails(
    setDoc(doc(db, 'businesses', OWNER_UID), {
      id: OWNER_UID,
      ownerUid: OWNER_UID,
      name: 'Almacén de prueba',
      plan,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
});

test('NO se puede crear un negocio con trialEndsAt manipulado muy lejos en el futuro', async () => {
  const db = ownerDb();
  const plan = {
    ...validTrialPlan(),
    trialEndsAt: Timestamp.fromMillis(Date.now() + 365 * 24 * 60 * 60 * 1000),
  };
  await assertFails(
    setDoc(doc(db, 'businesses', OWNER_UID), {
      id: OWNER_UID,
      ownerUid: OWNER_UID,
      name: 'Almacén de prueba',
      plan,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
});

test('NO se puede crear un negocio con campos extra dentro de plan', async () => {
  const db = ownerDb();
  const plan = { ...validTrialPlan(), proActivatedAt: serverTimestamp() };
  await assertFails(
    setDoc(doc(db, 'businesses', OWNER_UID), {
      id: OWNER_UID,
      ownerUid: OWNER_UID,
      name: 'Almacén de prueba',
      plan,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
});

// ── Inmutabilidad del plan tras la creación ───────────────────────────────

test('el dueño NO puede modificar plan.status después de creado', async () => {
  await seedValidBusiness();
  const db = ownerDb();
  await assertFails(
    updateDoc(doc(db, 'businesses', OWNER_UID), { 'plan.status': 'suspended' }),
  );
});

test('el dueño NO puede modificar plan.type después de creado', async () => {
  await seedValidBusiness();
  const db = ownerDb();
  await assertFails(updateDoc(doc(db, 'businesses', OWNER_UID), { 'plan.type': 'pro' }));
});

test('el dueño puede actualizar el nombre del negocio sin tocar plan', async () => {
  await seedValidBusiness();
  const db = ownerDb();
  await assertSucceeds(
    updateDoc(doc(db, 'businesses', OWNER_UID), {
      name: 'Nuevo nombre',
      updatedAt: serverTimestamp(),
    }),
  );
});

// Actualizado en Fase 5.1 (2026-07-05): antes, una cuenta legacy sin `plan`
// SÍ podía seguir actualizando otros campos (esta era la única razón de
// planUnchanged() al aceptar "ambos lados sin el campo"). Se decidió cerrar
// también este caso — plan ausente/inválido ya no puede hacer updates
// operativos, solo puede solicitar la eliminación de cuenta (ver el bloque
// de deletionRequest, más abajo en este archivo y en account-lifecycle.test.mjs).
test('una cuenta legacy sin plan NO puede actualizar campos operativos', async () => {
  await seedLegacyBusinessWithoutPlan();
  const db = ownerDb();
  await assertFails(
    updateDoc(doc(db, 'businesses', OWNER_UID), {
      name: 'Nuevo nombre legacy',
      updatedAt: serverTimestamp(),
    }),
  );
});

test('una cuenta legacy sin plan SÍ puede solicitar la eliminación de cuenta', async () => {
  await seedLegacyBusinessWithoutPlan();
  const db = ownerDb();
  await assertSucceeds(
    updateDoc(doc(db, 'businesses', OWNER_UID), {
      deletionRequest: { requestedAt: serverTimestamp() },
    }),
  );
});

// ── Lectura ────────────────────────────────────────────────────────────────

test('otro usuario NO puede leer el negocio ajeno', async () => {
  await seedValidBusiness();
  const db = otherDb();
  await assertFails(getDoc(doc(db, 'businesses', OWNER_UID)));
});

test('el dueño puede leer su propio negocio', async () => {
  await seedValidBusiness();
  const db = ownerDb();
  await assertSucceeds(getDoc(doc(db, 'businesses', OWNER_UID)));
});

// ── Regresión: subcolecciones sin cambios en Fase 1 ───────────────────────

test('el dueño puede crear un producto (sin cambios respecto a antes de Fase 1)', async () => {
  await seedValidBusiness();
  const db = ownerDb();
  await assertSucceeds(
    setDoc(doc(collection(db, 'businesses', OWNER_UID, 'products'), 'prod-1'), {
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

test('el dueño puede crear un cliente y registrar un movimiento (sin cambios en Fase 1)', async () => {
  await seedValidBusiness();
  const db = ownerDb();
  await assertSucceeds(
    setDoc(doc(collection(db, 'businesses', OWNER_UID, 'customers'), 'cust-1'), {
      name: 'Juan Pérez',
      balance: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
  await assertSucceeds(
    setDoc(
      doc(collection(db, 'businesses', OWNER_UID, 'customers', 'cust-1', 'movements'), 'mov-1'),
      {
        type: 'fiado',
        amount: 500,
        balanceAfter: 500,
        createdAt: serverTimestamp(),
      },
    ),
  );
});

test('el dueño puede abrir una caja (sin cambios en Fase 1)', async () => {
  await seedValidBusiness();
  const db = ownerDb();
  await assertSucceeds(
    setDoc(doc(collection(db, 'businesses', OWNER_UID, 'cashSessions'), 'session-1'), {
      date: '2026-07-04',
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

// ── Eliminación de businesses/{uid} ───────────────────────────────────────
//
// Actualizado 2026-07-05: el delete del dueño, que antes estaba permitido a
// propósito para la función "Eliminar cuenta", se denegó por completo (ver
// scripts/rules-tests/account-lifecycle.test.mjs para la cobertura
// detallada del nuevo bloqueo y de "Solicitar eliminación de cuenta").
// Acá solo queda la confirmación de que un tercero tampoco puede.

test('un cliente autenticado NO puede eliminar el negocio de OTRO usuario', async () => {
  await seedValidBusiness();
  const db = otherDb();
  await assertFails(deleteDoc(doc(db, 'businesses', OWNER_UID)));
});

// ── Manipulación directa de campos de plan ────────────────────────────────

test('deleteField() sobre plan completo es rechazado', async () => {
  await seedValidBusiness();
  const db = ownerDb();
  await assertFails(updateDoc(doc(db, 'businesses', OWNER_UID), { plan: deleteField() }));
});

test('deleteField() sobre plan.type es rechazado', async () => {
  await seedValidBusiness();
  const db = ownerDb();
  await assertFails(updateDoc(doc(db, 'businesses', OWNER_UID), { 'plan.type': deleteField() }));
});

test('deleteField() sobre plan.status es rechazado', async () => {
  await seedValidBusiness();
  const db = ownerDb();
  await assertFails(updateDoc(doc(db, 'businesses', OWNER_UID), { 'plan.status': deleteField() }));
});

test('deleteField() sobre plan.trialStartedAt es rechazado', async () => {
  await seedValidBusiness();
  const db = ownerDb();
  await assertFails(
    updateDoc(doc(db, 'businesses', OWNER_UID), { 'plan.trialStartedAt': deleteField() }),
  );
});

test('deleteField() sobre plan.trialEndsAt es rechazado', async () => {
  await seedValidBusiness();
  const db = ownerDb();
  await assertFails(
    updateDoc(doc(db, 'businesses', OWNER_UID), { 'plan.trialEndsAt': deleteField() }),
  );
});

test('deleteField() sobre plan.updatedAt (interno del plan) es rechazado', async () => {
  await seedValidBusiness();
  const db = ownerDb();
  await assertFails(
    updateDoc(doc(db, 'businesses', OWNER_UID), { 'plan.updatedAt': deleteField() }),
  );
});

test('deleteField() sobre plan.proActivatedAt es rechazado (cuenta pro migrada)', async () => {
  await seedProBusinessWithProActivatedAt();
  const db = ownerDb();
  await assertFails(
    updateDoc(doc(db, 'businesses', OWNER_UID), { 'plan.proActivatedAt': deleteField() }),
  );
});

test('deleteField() sobre plan.proExpiresAt sobre un campo ausente es un no-op inofensivo', async () => {
  // proExpiresAt no existe en el plan sembrado — borrar "nada" no cambia el
  // documento, por eso Rules lo deja pasar. No es un hueco: no hay ningún
  // valor que un atacante pueda alterar borrando un campo que no está.
  await seedValidBusiness();
  const db = ownerDb();
  await assertSucceeds(
    updateDoc(doc(db, 'businesses', OWNER_UID), { 'plan.proExpiresAt': deleteField() }),
  );
});

test('setDoc con overwrite total que omite plan es rechazado', async () => {
  await seedValidBusiness();
  const db = ownerDb();
  await assertFails(
    setDoc(doc(db, 'businesses', OWNER_UID), {
      id: OWNER_UID,
      ownerUid: OWNER_UID,
      name: 'Almacén de prueba',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      // plan deliberadamente omitido — un overwrite total sin merge
    }),
  );
});

test('updateDoc reemplazando el objeto plan completo (misma forma, otro valor) es rechazado', async () => {
  await seedValidBusiness();
  const db = ownerDb();
  await assertFails(
    updateDoc(doc(db, 'businesses', OWNER_UID), {
      plan: {
        type: 'trial',
        status: 'active',
        trialStartedAt: Timestamp.now(),
        // trialEndsAt corrido "de más" respecto al original sembrado
        trialEndsAt: Timestamp.fromMillis(Date.now() + 90 * 24 * 60 * 60 * 1000),
        updatedAt: Timestamp.now(),
      },
    }),
  );
});

test('NO se puede agregar un campo no permitido dentro de plan vía update', async () => {
  await seedValidBusiness();
  const db = ownerDb();
  await assertFails(updateDoc(doc(db, 'businesses', OWNER_UID), { 'plan.hackedField': true }));
});

// ── Borrar y recrear para intentar un trial nuevo ─────────────────────────
//
// Actualizado 2026-07-05: como el delete de businesses/{uid} ahora está
// denegado por completo (ver account-lifecycle.test.mjs), "borrar y
// recrear" ya ni siquiera puede empezar — el primer paso (el delete) se
// rechaza. Sigue valiendo la pena confirmar el caso sin delete de por
// medio: ni siquiera con el negocio intacto se puede "recrear" para forzar
// un trial nuevo.

test('sin borrar antes, NO se puede "recrear" el negocio para forzar un trial nuevo', async () => {
  await seedValidBusiness();
  const db = ownerDb();
  // El doc ya existe: esto es un `update` para Rules, no un `create`, y
  // cambia el plan -> lo bloquea planUnchanged(), no isValidNewTrialPlan().
  await assertFails(
    setDoc(doc(db, 'businesses', OWNER_UID), {
      id: OWNER_UID,
      ownerUid: OWNER_UID,
      name: 'Almacén de prueba',
      plan: validTrialPlan(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
});

// ── Flujo real de alta (createUserAndBusiness) ────────────────────────────

test('el batch de alta (users + businesses) tal como lo hace createUserAndBusiness se escribe en una sola operación', async () => {
  const db = ownerDb();
  const batch = writeBatch(db);
  batch.set(doc(db, 'users', OWNER_UID), {
    uid: OWNER_UID,
    email: 'owner@test.com',
    displayName: '',
    businessId: OWNER_UID,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(db, 'businesses', OWNER_UID), {
    id: OWNER_UID,
    ownerUid: OWNER_UID,
    name: 'Almacén nuevo',
    plan: validTrialPlan(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await assertSucceeds(batch.commit());
});

test('un segundo intento de crear el mismo negocio (doble registro) es rechazado', async () => {
  await seedValidBusiness(); // simula que el primer registro ya ocurrió
  const db = ownerDb();
  await assertFails(
    setDoc(doc(db, 'businesses', OWNER_UID), {
      id: OWNER_UID,
      ownerUid: OWNER_UID,
      name: 'Intento de segundo alta',
      plan: validTrialPlan(), // un trial "nuevo", distinto del ya existente
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
});
