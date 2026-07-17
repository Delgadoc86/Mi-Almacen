// Backend del Panel Admin móvil interno (Fase 6). Cloud Functions callable,
// todas detrás del mismo portero: exigen sesión de Firebase Auth y el custom
// claim `admin === true` (asignado únicamente por scripts/bootstrap-admin.mjs
// vía Admin SDK — ningún cliente puede otorgárselo a sí mismo). Ningún
// cliente escribe `plan` de otro negocio directamente en Firestore; todo
// cambio de plan pasa por acá, dentro de una transacción que además deja un
// registro en `adminAuditLogs`.
//
// Deliberadamente NO leen ni exponen al admin el contenido de products,
// categories, customers, movements, cashSessions, cashMovements — el panel
// admin nunca ve datos operativos/financieros de un negocio, solo su estado
// de cuenta. Única excepción: adminDeleteRequestedAccount, que SÍ borra esas
// subcolecciones (nunca las lee/expone) al ejecutar una eliminación
// definitiva ya solicitada por el propio dueño — ver esa función más abajo.
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { classifyPlan, KIND } = require('./planStatus');

initializeApp();
const db = getFirestore();

const EXTEND_TRIAL_ALLOWED_DAYS = [1, 3, 7, 14, 30];
const REASON_REQUIRED_ACTIONS = new Set(['extend_trial', 'set_readonly', 'suspend']);
const VALID_ACTIONS = new Set(['activate_pro', 'extend_trial', 'set_readonly', 'suspend', 'reactivate']);
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Libreta de cobros (adminBilling) — administración comercial interna, no
// acceso. `plan` sigue siendo la única fuente de verdad para canWrite; estas
// constantes y funciones nunca lo tocan.
const BILLING_METHODS = new Set(['transferencia', 'mercado_pago_link', 'efectivo', 'otro']);
const BILLING_PERIOD_DAYS = new Set([30, 90, 365]);
const BILLING_NOTE_MAX_LENGTH = 500;
// Tolerancia por reloj/zona horaria del dispositivo del admin — no permite
// registrar pagos de verdad "del futuro", solo absorbe el margen normal de
// que el admin cargue el pago un rato después de recibirlo.
const BILLING_FUTURE_TOLERANCE_MS = MS_PER_DAY;
const BILLING_DUE_SOON_DAYS = 7;

function requireAdmin(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Necesitás iniciar sesión.');
  }
  if (request.auth.token.admin !== true) {
    throw new HttpsError('permission-denied', 'Esta acción es solo para administradores.');
  }
}

// Convierte Timestamps de Firestore a ISO string para la respuesta al
// cliente — evita ambigüedad de serialización del protocolo callable con
// tipos que no son JSON plano.
function tsToIso(ts) {
  return ts && typeof ts.toDate === 'function' ? ts.toDate().toISOString() : null;
}

function serializePlan(plan) {
  if (!plan || typeof plan !== 'object') return null;
  return {
    type: plan.type ?? null,
    status: plan.status ?? null,
    trialStartedAt: tsToIso(plan.trialStartedAt),
    trialEndsAt: tsToIso(plan.trialEndsAt),
    proActivatedAt: tsToIso(plan.proActivatedAt),
    proExpiresAt: tsToIso(plan.proExpiresAt),
    updatedAt: tsToIso(plan.updatedAt),
  };
}

function serializeAuditLog(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    actorUid: data.actorUid,
    businessId: data.businessId,
    action: data.action,
    reason: data.reason ?? null,
    previousPlan: data.previousPlan ?? null,
    nextPlan: data.nextPlan ?? null,
    previousBilling: data.previousBilling ?? null,
    nextBilling: data.nextBilling ?? null,
    // Presentes únicamente en entradas de eliminación definitiva de cuenta
    // (delete_account_completed/delete_account_failed) — null en el resto.
    deletedCounts: data.deletedCounts ?? null,
    error: data.error ?? null,
    createdAt: tsToIso(data.createdAt),
  };
}

function serializeBilling(businessId, data) {
  if (!data) return null;
  return {
    businessId,
    lastPaymentAt: tsToIso(data.lastPaymentAt),
    nextPaymentDueAt: tsToIso(data.nextPaymentDueAt),
    paymentMethod: data.paymentMethod ?? null,
    lastAmount: typeof data.lastAmount === 'number' ? data.lastAmount : null,
    currency: data.currency ?? null,
    notes: typeof data.notes === 'string' ? data.notes : null,
    updatedAt: tsToIso(data.updatedAt),
    updatedBy: data.updatedBy ?? null,
  };
}

function serializePaymentData(id, data) {
  return {
    id,
    businessId: data.businessId,
    amount: data.amount,
    currency: data.currency ?? 'ARS',
    method: data.method,
    paidAt: tsToIso(data.paidAt),
    periodDays: data.periodDays ?? null,
    nextPaymentDueAt: tsToIso(data.nextPaymentDueAt),
    note: data.note ?? null,
    createdAt: tsToIso(data.createdAt),
    createdBy: data.createdBy,
  };
}

function serializePayment(doc) {
  return serializePaymentData(doc.id, doc.data());
}

// ── Validación de entrada — adminRecordPayment/adminUpdateBillingNotes ────
// Nunca se confía en datos del cliente sin validar, mismo criterio que el
// resto de las funciones admin de este archivo.

function parseBillingAmount(raw) {
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new HttpsError('invalid-argument', 'El monto debe ser un número mayor a 0.');
  }
  return amount;
}

function parseBillingMethod(raw) {
  if (typeof raw !== 'string' || !BILLING_METHODS.has(raw)) {
    throw new HttpsError('invalid-argument', 'Método de pago inválido.');
  }
  return raw;
}

function parseBillingPaidAt(raw, now) {
  if (raw === undefined || raw === null || raw === '') {
    return now;
  }
  const ms = typeof raw === 'number' ? raw : Date.parse(raw);
  if (!Number.isFinite(ms)) {
    throw new HttpsError('invalid-argument', 'Fecha de pago inválida.');
  }
  if (ms > now.toMillis() + BILLING_FUTURE_TOLERANCE_MS) {
    throw new HttpsError('invalid-argument', 'La fecha de pago no puede ser futura.');
  }
  return Timestamp.fromMillis(ms);
}

function parseBillingPeriodDays(raw) {
  if (raw === undefined || raw === null) return null;
  const days = Number(raw);
  if (!BILLING_PERIOD_DAYS.has(days)) {
    throw new HttpsError('invalid-argument', 'El período debe ser 30, 90 o 365 días.');
  }
  return days;
}

function parseBillingNote(raw) {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'string') {
    throw new HttpsError('invalid-argument', 'La nota debe ser texto.');
  }
  const trimmed = raw.trim();
  if (trimmed.length > BILLING_NOTE_MAX_LENGTH) {
    throw new HttpsError('invalid-argument', `La nota no puede superar los ${BILLING_NOTE_MAX_LENGTH} caracteres.`);
  }
  return trimmed || null;
}

// ── adminGetDashboard ───────────────────────────────────────────────────

exports.adminGetDashboard = onCall(async (request) => {
  requireAdmin(request);

  const [snap, billingSnap] = await Promise.all([
    db.collection('businesses').select('plan', 'deletionRequest').get(),
    // Solo el campo necesario para clasificar vencimiento — nunca se lee
    // notes/lastAmount/método acá, este endpoint es puramente un conteo.
    db.collection('adminBilling').select('nextPaymentDueAt').get(),
  ]);

  const counts = {
    trialActive: 0,
    trialExpired: 0,
    pro: 0,
    readonly: 0,
    suspended: 0,
    noPlan: 0,
    pendingDeletionRequests: 0,
    totalBusinesses: snap.size,
    billingDueThisWeek: 0,
    billingOverdue: 0,
    billingNoData: 0,
  };

  snap.forEach((doc) => {
    const data = doc.data();
    switch (classifyPlan(data.plan)) {
      case KIND.TRIAL_ACTIVE: counts.trialActive += 1; break;
      case KIND.TRIAL_EXPIRED: counts.trialExpired += 1; break;
      case KIND.PRO: counts.pro += 1; break;
      case KIND.READONLY: counts.readonly += 1; break;
      case KIND.SUSPENDED: counts.suspended += 1; break;
      default: counts.noPlan += 1;
    }
    if (data.deletionRequest) counts.pendingDeletionRequests += 1;
  });

  // Mapa businessId -> vencimiento (ms), solo para negocios que tienen
  // adminBilling/{businessId} con nextPaymentDueAt seteado. Un negocio sin
  // documento de billing, o con documento pero sin esa fecha (ej. solo se
  // le registró una nota, o un pago "sin período"), cuenta como "sin datos"
  // — no hay nada que vigilar para ese negocio todavía.
  const nextDueMsByBusiness = new Map();
  billingSnap.forEach((doc) => {
    const nextPaymentDueAt = doc.data().nextPaymentDueAt;
    if (nextPaymentDueAt && typeof nextPaymentDueAt.toMillis === 'function') {
      nextDueMsByBusiness.set(doc.id, nextPaymentDueAt.toMillis());
    }
  });

  const now = Date.now();
  snap.forEach((doc) => {
    const dueMs = nextDueMsByBusiness.get(doc.id);
    if (dueMs === undefined) {
      counts.billingNoData += 1;
    } else if (dueMs < now) {
      counts.billingOverdue += 1;
    } else if (dueMs - now <= BILLING_DUE_SOON_DAYS * MS_PER_DAY) {
      counts.billingDueThisWeek += 1;
    }
  });

  return counts;
});

// ── adminListBusinesses ─────────────────────────────────────────────────

exports.adminListBusinesses = onCall(async (request) => {
  requireAdmin(request);

  const search = typeof request.data?.search === 'string' ? request.data.search.trim().toLowerCase() : '';
  const statusFilter = typeof request.data?.statusFilter === 'string' ? request.data.statusFilter : 'all';

  const businessesSnap = await db.collection('businesses').get();
  const userRefs = businessesSnap.docs.map((doc) => db.collection('users').doc(doc.id));
  const userSnaps = userRefs.length > 0 ? await db.getAll(...userRefs) : [];
  const emailByUid = new Map(userSnaps.map((s) => [s.id, s.exists ? s.data().email ?? '' : '']));

  let businesses = businessesSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      businessId: doc.id,
      name: data.name ?? '(sin nombre)',
      email: emailByUid.get(doc.id) ?? '',
      kind: classifyPlan(data.plan),
      planType: data.plan?.type ?? null,
      planStatus: data.plan?.status ?? null,
      trialEndsAt: tsToIso(data.plan?.trialEndsAt),
      createdAt: tsToIso(data.createdAt),
      hasDeletionRequest: Boolean(data.deletionRequest),
    };
  });

  if (statusFilter !== 'all') {
    businesses = businesses.filter((b) => b.kind === statusFilter);
  }
  if (search) {
    businesses = businesses.filter(
      (b) => b.name.toLowerCase().includes(search) || b.email.toLowerCase().includes(search),
    );
  }
  businesses.sort((a, b) => a.name.localeCompare(b.name, 'es'));

  return { businesses };
});

// ── adminGetBusinessDetail ──────────────────────────────────────────────

exports.adminGetBusinessDetail = onCall(async (request) => {
  requireAdmin(request);

  const businessId = request.data?.businessId;
  if (typeof businessId !== 'string' || !businessId) {
    throw new HttpsError('invalid-argument', 'Falta businessId.');
  }

  const [businessSnap, userSnap, auditSnap] = await Promise.all([
    db.collection('businesses').doc(businessId).get(),
    db.collection('users').doc(businessId).get(),
    db.collection('adminAuditLogs')
      .where('businessId', '==', businessId)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get(),
  ]);

  if (!businessSnap.exists) {
    throw new HttpsError('not-found', 'No existe ese negocio.');
  }

  const business = businessSnap.data();
  const user = userSnap.exists ? userSnap.data() : null;

  return {
    businessId,
    name: business.name ?? '(sin nombre)',
    ownerEmail: user?.email ?? '',
    ownerDisplayName: user?.displayName ?? '',
    createdAt: tsToIso(business.createdAt),
    kind: classifyPlan(business.plan),
    plan: serializePlan(business.plan),
    deletionRequestedAt: business.deletionRequest ? tsToIso(business.deletionRequest.requestedAt) : null,
    auditLog: auditSnap.docs.map(serializeAuditLog),
  };
});

// ── adminListAuditLogs ──────────────────────────────────────────────────

exports.adminListAuditLogs = onCall(async (request) => {
  requireAdmin(request);

  const businessId = typeof request.data?.businessId === 'string' ? request.data.businessId : null;
  const requestedLimit = Number(request.data?.limit) || 50;
  const limit = Math.min(Math.max(requestedLimit, 1), 200);

  let query = db.collection('adminAuditLogs').orderBy('createdAt', 'desc').limit(limit);
  if (businessId) {
    query = db.collection('adminAuditLogs')
      .where('businessId', '==', businessId)
      .orderBy('createdAt', 'desc')
      .limit(limit);
  }

  const snap = await query.get();
  return { logs: snap.docs.map(serializeAuditLog) };
});

// ── adminChangePlan ──────────────────────────────────────────────────────

function computeNextPlan(action, currentPlan, days, now) {
  const base = currentPlan && typeof currentPlan === 'object' ? currentPlan : {};

  if (action === 'activate_pro') {
    return {
      ...base,
      type: 'pro',
      status: 'active',
      trialStartedAt: base.trialStartedAt ?? now,
      trialEndsAt: base.trialEndsAt ?? now,
      proActivatedAt: now,
      updatedAt: now,
    };
  }

  if (action === 'extend_trial') {
    const currentEndsAtMs = base.trialEndsAt && typeof base.trialEndsAt.toMillis === 'function'
      ? base.trialEndsAt.toMillis()
      : now.toMillis();
    const startFromMs = Math.max(currentEndsAtMs, now.toMillis());
    return {
      ...base,
      trialEndsAt: Timestamp.fromMillis(startFromMs + days * MS_PER_DAY),
      updatedAt: now,
    };
  }

  if (action === 'set_readonly') {
    return { ...base, status: 'readonly', updatedAt: now };
  }

  if (action === 'suspend') {
    return { ...base, status: 'suspended', updatedAt: now };
  }

  // reactivate
  return { ...base, status: 'active', updatedAt: now };
}

exports.adminChangePlan = onCall(async (request) => {
  requireAdmin(request);

  const { businessId, action, days, reason } = request.data ?? {};

  if (typeof businessId !== 'string' || !businessId) {
    throw new HttpsError('invalid-argument', 'Falta businessId.');
  }
  if (!VALID_ACTIONS.has(action)) {
    throw new HttpsError('invalid-argument', `Acción inválida: ${action}.`);
  }
  const trimmedReason = typeof reason === 'string' ? reason.trim() : '';
  if (REASON_REQUIRED_ACTIONS.has(action) && !trimmedReason) {
    throw new HttpsError('invalid-argument', 'Esta acción requiere un motivo.');
  }
  if (action === 'extend_trial' && !EXTEND_TRIAL_ALLOWED_DAYS.includes(Number(days))) {
    throw new HttpsError('invalid-argument', 'Los días de extensión deben ser 1, 3, 7, 14 o 30.');
  }

  const businessRef = db.collection('businesses').doc(businessId);
  const auditRef = db.collection('adminAuditLogs').doc();
  const now = Timestamp.now();

  const result = await db.runTransaction(async (tx) => {
    const businessSnap = await tx.get(businessRef);
    if (!businessSnap.exists) {
      throw new HttpsError('not-found', 'No existe ese negocio.');
    }

    const currentPlan = businessSnap.data().plan ?? null;
    const currentKind = classifyPlan(currentPlan);

    if (action === 'extend_trial' && currentKind !== KIND.TRIAL_ACTIVE && currentKind !== KIND.TRIAL_EXPIRED) {
      throw new HttpsError('failed-precondition', 'Solo se puede extender el trial de una cuenta en trial.');
    }
    if ((action === 'set_readonly' || action === 'suspend' || action === 'reactivate') && currentKind === KIND.NO_PLAN) {
      throw new HttpsError('failed-precondition', 'Este negocio no tiene un plan asignado. Usá "Activar Pro" primero.');
    }

    const nextPlan = computeNextPlan(action, currentPlan, Number(days), now);

    tx.update(businessRef, { plan: nextPlan, updatedAt: now });
    tx.set(auditRef, {
      actorUid: request.auth.uid,
      businessId,
      action,
      reason: trimmedReason || null,
      previousPlan: currentPlan,
      nextPlan,
      createdAt: now,
    });

    return { previousPlan: currentPlan, nextPlan };
  });

  return {
    success: true,
    previousPlan: serializePlan(result.previousPlan),
    nextPlan: serializePlan(result.nextPlan),
  };
});

// ── Libreta de cobros (adminBilling) ─────────────────────────────────────
// Administración comercial interna — último pago, próximo cobro esperado,
// método, monto, notas. Deliberadamente separado de `plan`: estas funciones
// NUNCA leen ni escriben `businesses/{businessId}.plan`. Activar/cortar
// acceso sigue siendo, únicamente, adminChangePlan de arriba — el admin
// decide esa acción a mano después de ver el estado de cobro acá, nunca
// automático.

// ── adminGetBillingDetail ─────────────────────────────────────────────────

exports.adminGetBillingDetail = onCall(async (request) => {
  requireAdmin(request);

  const businessId = request.data?.businessId;
  if (typeof businessId !== 'string' || !businessId) {
    throw new HttpsError('invalid-argument', 'Falta businessId.');
  }

  const businessRef = db.collection('businesses').doc(businessId);
  const billingRef = db.collection('adminBilling').doc(businessId);

  const [businessSnap, billingSnap, paymentsSnap] = await Promise.all([
    businessRef.get(),
    billingRef.get(),
    billingRef.collection('payments').orderBy('paidAt', 'desc').limit(10).get(),
  ]);

  if (!businessSnap.exists) {
    throw new HttpsError('not-found', 'No existe ese negocio.');
  }

  return {
    businessId,
    businessName: businessSnap.data().name ?? '(sin nombre)',
    billing: billingSnap.exists ? serializeBilling(businessId, billingSnap.data()) : null,
    payments: paymentsSnap.docs.map(serializePayment),
  };
});

// ── adminRecordPayment ─────────────────────────────────────────────────────
// Registra un pago nuevo y actualiza el resumen de adminBilling/{businessId}.
// No toca `plan` bajo ninguna circunstancia — activar Pro / pasar a solo
// lectura siguen siendo decisiones separadas del admin vía adminChangePlan.

exports.adminRecordPayment = onCall(async (request) => {
  requireAdmin(request);

  const businessId = request.data?.businessId;
  if (typeof businessId !== 'string' || !businessId) {
    throw new HttpsError('invalid-argument', 'Falta businessId.');
  }

  const now = Timestamp.now();
  const amount = parseBillingAmount(request.data?.amount);
  const method = parseBillingMethod(request.data?.method);
  const paidAt = parseBillingPaidAt(request.data?.paidAt, now);
  const periodDays = parseBillingPeriodDays(request.data?.periodDays);
  const note = parseBillingNote(request.data?.note);
  const nextPaymentDueAt = periodDays !== null
    ? Timestamp.fromMillis(paidAt.toMillis() + periodDays * MS_PER_DAY)
    : null;

  const businessRef = db.collection('businesses').doc(businessId);
  const billingRef = db.collection('adminBilling').doc(businessId);
  const paymentRef = billingRef.collection('payments').doc();
  const auditRef = db.collection('adminAuditLogs').doc();

  const result = await db.runTransaction(async (tx) => {
    const businessSnap = await tx.get(businessRef);
    if (!businessSnap.exists) {
      throw new HttpsError('not-found', 'No existe ese negocio.');
    }
    const billingSnap = await tx.get(billingRef);
    const previousBillingData = billingSnap.exists ? billingSnap.data() : null;

    // Solo se pisan las claves que este pago realmente informa — un pago
    // "sin período" no borra un nextPaymentDueAt que ya existía de un pago
    // anterior, y un pago sin nota no borra la nota interna vigente.
    const nextBillingPatch = {
      businessId,
      lastPaymentAt: paidAt,
      paymentMethod: method,
      lastAmount: amount,
      currency: 'ARS',
      updatedAt: now,
      updatedBy: request.auth.uid,
    };
    if (nextPaymentDueAt !== null) nextBillingPatch.nextPaymentDueAt = nextPaymentDueAt;
    if (note !== null) nextBillingPatch.notes = note;

    const paymentData = {
      businessId,
      amount,
      currency: 'ARS',
      method,
      paidAt,
      periodDays,
      nextPaymentDueAt,
      note,
      createdAt: now,
      createdBy: request.auth.uid,
    };

    tx.set(paymentRef, paymentData);
    tx.set(billingRef, nextBillingPatch, { merge: true });
    tx.set(auditRef, {
      actorUid: request.auth.uid,
      businessId,
      action: 'record_payment',
      reason: note,
      previousPlan: null,
      nextPlan: null,
      previousBilling: previousBillingData,
      nextBilling: { ...previousBillingData, ...nextBillingPatch },
      createdAt: now,
    });

    return {
      nextBilling: { ...previousBillingData, ...nextBillingPatch },
      payment: paymentData,
    };
  });

  return {
    success: true,
    billing: serializeBilling(businessId, result.nextBilling),
    payment: serializePaymentData(paymentRef.id, result.payment),
  };
});

// ── adminUpdateBillingNotes ────────────────────────────────────────────────
// Edición acotada de la nota interna, sin necesidad de registrar un pago
// (ej. "avisó que paga la semana que viene"). Igual que adminRecordPayment,
// nunca toca `plan`.

exports.adminUpdateBillingNotes = onCall(async (request) => {
  requireAdmin(request);

  const businessId = request.data?.businessId;
  if (typeof businessId !== 'string' || !businessId) {
    throw new HttpsError('invalid-argument', 'Falta businessId.');
  }
  if (typeof request.data?.notes !== 'string') {
    throw new HttpsError('invalid-argument', 'Las notas deben ser texto.');
  }
  const notes = request.data.notes.trim();
  if (notes.length > BILLING_NOTE_MAX_LENGTH) {
    throw new HttpsError('invalid-argument', `Las notas no pueden superar los ${BILLING_NOTE_MAX_LENGTH} caracteres.`);
  }

  const businessRef = db.collection('businesses').doc(businessId);
  const billingRef = db.collection('adminBilling').doc(businessId);
  const auditRef = db.collection('adminAuditLogs').doc();
  const now = Timestamp.now();

  const result = await db.runTransaction(async (tx) => {
    const businessSnap = await tx.get(businessRef);
    if (!businessSnap.exists) {
      throw new HttpsError('not-found', 'No existe ese negocio.');
    }
    const billingSnap = await tx.get(billingRef);
    const previousBillingData = billingSnap.exists ? billingSnap.data() : null;

    const nextBillingPatch = {
      businessId,
      notes: notes || FieldValue.delete(),
      updatedAt: now,
      updatedBy: request.auth.uid,
    };

    tx.set(billingRef, nextBillingPatch, { merge: true });
    tx.set(auditRef, {
      actorUid: request.auth.uid,
      businessId,
      action: 'update_billing_notes',
      reason: null,
      previousPlan: null,
      nextPlan: null,
      previousBilling: previousBillingData,
      nextBilling: { ...previousBillingData, ...nextBillingPatch, notes: notes || null },
      createdAt: now,
    });

    return { nextBilling: { ...previousBillingData, ...nextBillingPatch, notes: notes || null } };
  });

  return { success: true, billing: serializeBilling(businessId, result.nextBilling) };
});

// ── Eliminación definitiva de cuenta ─────────────────────────────────────
// El cliente solo puede "solicitar" eliminación (deletionRequest, ver
// firestore.rules e isNewDeletionRequestOnly()) — nunca borra nada. El
// borrado real de un negocio (Firestore + Auth) es exclusivamente admin,
// acá, y exige que exista una solicitud previa más una confirmación exacta
// del email del dueño. No toca ningún negocio sin deletionRequest.

// Cuenta subcolecciones sin leer sus documentos (aggregation query) — usado
// tanto en la previsualización como en el log final, para que el admin vea
// exactamente lo que después queda auditado.
async function computeDeletionCounts(businessId) {
  const businessRef = db.collection('businesses').doc(businessId);
  const billingRef = db.collection('adminBilling').doc(businessId);

  const [productsCount, categoriesCount, customersCount, cashSessionsCount, customerRefs, sessionRefs, billingSnap] =
    await Promise.all([
      businessRef.collection('products').count().get(),
      businessRef.collection('categories').count().get(),
      businessRef.collection('customers').count().get(),
      businessRef.collection('cashSessions').count().get(),
      businessRef.collection('customers').listDocuments(),
      businessRef.collection('cashSessions').listDocuments(),
      billingRef.get(),
    ]);

  const [movementCounts, cashMovementCounts, paymentsCount] = await Promise.all([
    Promise.all(customerRefs.map((ref) => ref.collection('movements').count().get())),
    Promise.all(sessionRefs.map((ref) => ref.collection('cashMovements').count().get())),
    billingSnap.exists ? billingRef.collection('payments').count().get() : null,
  ]);

  return {
    products: productsCount.data().count,
    categories: categoriesCount.data().count,
    customers: customersCount.data().count,
    movements: movementCounts.reduce((sum, snap) => sum + snap.data().count, 0),
    cashSessions: cashSessionsCount.data().count,
    cashMovements: cashMovementCounts.reduce((sum, snap) => sum + snap.data().count, 0),
    hasBilling: billingSnap.exists,
    billingPayments: paymentsCount ? paymentsCount.data().count : 0,
  };
}

async function deleteAuthUserIfExists(uid) {
  try {
    await getAuth().deleteUser(uid);
    return true;
  } catch (err) {
    if (err && err.code === 'auth/user-not-found') return false;
    throw err;
  }
}

function summarizeError(err) {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.slice(0, 300);
}

// ── adminGetDeletionPreview ───────────────────────────────────────────────

exports.adminGetDeletionPreview = onCall(async (request) => {
  requireAdmin(request);

  const businessId = request.data?.businessId;
  if (typeof businessId !== 'string' || !businessId) {
    throw new HttpsError('invalid-argument', 'Falta businessId.');
  }

  const [businessSnap, userSnap] = await Promise.all([
    db.collection('businesses').doc(businessId).get(),
    db.collection('users').doc(businessId).get(),
  ]);

  if (!businessSnap.exists) {
    throw new HttpsError('not-found', 'No existe ese negocio.');
  }

  const business = businessSnap.data();
  if (!business.deletionRequest) {
    throw new HttpsError('failed-precondition', 'Este negocio no solicitó eliminación de cuenta.');
  }

  const user = userSnap.exists ? userSnap.data() : null;

  const [counts, authUserExists] = await Promise.all([
    computeDeletionCounts(businessId),
    getAuth().getUser(businessId).then(() => true).catch(() => false),
  ]);

  return {
    businessId,
    name: business.name ?? '(sin nombre)',
    ownerEmail: user?.email ?? '',
    requestedAt: tsToIso(business.deletionRequest.requestedAt),
    counts,
    authUserExists,
  };
});

// ── adminDeleteRequestedAccount ───────────────────────────────────────────
// Borrado real y definitivo: businesses/{id} (+ products/categories/
// customers+movements/cashSessions+cashMovements), adminBilling/{id}
// (+ payments), users/{id} y la cuenta de Firebase Auth. Exige
// deletionRequest previo + confirmación exacta del email del dueño. Es
// reintentable: si una ejecución anterior quedó a mitad de camino (el
// negocio ya no existe pero no hay log `delete_account_completed`), retoma
// el borrado en vez de fallar — cada paso es no-op seguro sobre lo que ya
// esté borrado.
exports.adminDeleteRequestedAccount = onCall({ timeoutSeconds: 120 }, async (request) => {
  requireAdmin(request);

  const { businessId, confirmation } = request.data ?? {};
  if (typeof businessId !== 'string' || !businessId) {
    throw new HttpsError('invalid-argument', 'Falta businessId.');
  }
  if (typeof confirmation !== 'string' || !confirmation.trim()) {
    throw new HttpsError('invalid-argument', 'Falta la confirmación.');
  }

  const businessRef = db.collection('businesses').doc(businessId);
  const billingRef = db.collection('adminBilling').doc(businessId);
  const usersRef = db.collection('users').doc(businessId);

  const businessSnap = await businessRef.get();

  if (businessSnap.exists) {
    const business = businessSnap.data();
    if (!business.deletionRequest) {
      throw new HttpsError('failed-precondition', 'Este negocio no solicitó eliminación de cuenta.');
    }

    const userSnap = await usersRef.get();
    const ownerEmail = userSnap.exists ? userSnap.data().email ?? '' : '';
    if (!ownerEmail || confirmation.trim().toLowerCase() !== ownerEmail.trim().toLowerCase()) {
      throw new HttpsError('invalid-argument', 'La confirmación no coincide con el email del dueño de la cuenta.');
    }

    // Deja rastro de que el borrado arrancó ANTES de tocar datos — si el
    // proceso se corta acá abajo, el reintento sabe que debe retomar en vez
    // de rechazar con not-found (ver más abajo).
    await db.collection('adminAuditLogs').add({
      actorUid: request.auth.uid,
      businessId,
      action: 'delete_account_requested_execute',
      createdAt: Timestamp.now(),
    });
  } else {
    // El negocio ya no existe: solo es válido si es el reintento de un
    // borrado que ya arrancó (o ya terminó) para este mismo businessId.
    const recentLogsSnap = await db
      .collection('adminAuditLogs')
      .where('businessId', '==', businessId)
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();

    const lastRelevant = recentLogsSnap.docs
      .map((d) => d.data())
      .find((d) => d.action === 'delete_account_completed' || d.action === 'delete_account_requested_execute');

    if (!lastRelevant) {
      throw new HttpsError('not-found', 'No existe ese negocio.');
    }
    if (lastRelevant.action === 'delete_account_completed') {
      return { success: true, alreadyDeleted: true, deletedCounts: lastRelevant.deletedCounts ?? null };
    }
    // action === 'delete_account_requested_execute' sin 'completed' posterior
    // → retomar el borrado abajo.
  }

  try {
    const deletedCounts = await computeDeletionCounts(businessId);

    await db.recursiveDelete(businessRef);
    await db.recursiveDelete(billingRef);
    await usersRef.delete();
    await deleteAuthUserIfExists(businessId);

    await db.collection('adminAuditLogs').add({
      actorUid: request.auth.uid,
      businessId,
      action: 'delete_account_completed',
      deletedCounts,
      createdAt: Timestamp.now(),
    });

    return { success: true, alreadyDeleted: false, deletedCounts };
  } catch (err) {
    await db.collection('adminAuditLogs').add({
      actorUid: request.auth.uid,
      businessId,
      action: 'delete_account_failed',
      error: summarizeError(err),
      createdAt: Timestamp.now(),
    });
    throw new HttpsError('internal', 'Ocurrió un error al eliminar. Podés reintentar.');
  }
});
