// Backend del Panel Admin móvil interno (Fase 6). Cinco Cloud Functions
// callable, todas detrás del mismo portero: exigen sesión de Firebase Auth
// y el custom claim `admin === true` (asignado únicamente por
// scripts/bootstrap-admin.mjs vía Admin SDK — ningún cliente puede
// otorgárselo a sí mismo). Ningún cliente escribe `plan` de otro negocio
// directamente en Firestore; todo cambio de plan pasa por acá, dentro de
// una transacción que además deja un registro en `adminAuditLogs`.
//
// Deliberadamente NO tocan: products, categories, customers, movements,
// cashSessions, cashMovements — el panel admin nunca lee ni escribe datos
// operativos/financieros de un negocio, solo su estado de cuenta.
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const { classifyPlan, KIND } = require('./planStatus');

initializeApp();
const db = getFirestore();

const EXTEND_TRIAL_ALLOWED_DAYS = [1, 3, 7, 14, 30];
const REASON_REQUIRED_ACTIONS = new Set(['extend_trial', 'set_readonly', 'suspend']);
const VALID_ACTIONS = new Set(['activate_pro', 'extend_trial', 'set_readonly', 'suspend', 'reactivate']);
const MS_PER_DAY = 24 * 60 * 60 * 1000;

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
    createdAt: tsToIso(data.createdAt),
  };
}

// ── adminGetDashboard ───────────────────────────────────────────────────

exports.adminGetDashboard = onCall(async (request) => {
  requireAdmin(request);

  const snap = await db.collection('businesses').select('plan', 'deletionRequest').get();

  const counts = {
    trialActive: 0,
    trialExpired: 0,
    pro: 0,
    readonly: 0,
    suspended: 0,
    noPlan: 0,
    pendingDeletionRequests: 0,
    totalBusinesses: snap.size,
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
