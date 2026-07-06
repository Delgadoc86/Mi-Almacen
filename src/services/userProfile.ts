import {
  doc,
  getDoc,
  updateDoc,
  writeBatch,
  serverTimestamp,
  type FieldValue,
} from 'firebase/firestore';
import type { RoundTo, BusinessPlan } from '@/models';
import { db } from './firebase';
import { FIRESTORE_COLLECTIONS, TRIAL_DURATION_DAYS } from '@/constants';
import type { UserProfile, Business } from '@/models';

// trialStartedAt/updatedAt van como serverTimestamp() (sentinel que Firestore
// resuelve a request.time al escribir, validable exacto en las Rules).
// trialEndsAt no puede ser un sentinel — no existe "serverTimestamp() + N
// días" — así que se manda como valor calculado en el cliente; las Rules lo
// aceptan con una tolerancia de ±5min alrededor de "ahora + 30 días" en vez
// de una igualdad exacta, porque el cliente no puede predecir el reloj del
// servidor con precisión de milisegundos.
function newTrialPlan(): BusinessPlan {
  return {
    type: 'trial',
    status: 'active',
    trialStartedAt: serverTimestamp() as unknown as BusinessPlan['trialStartedAt'],
    trialEndsAt: new Date(Date.now() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000) as unknown as BusinessPlan['trialEndsAt'],
    updatedAt: serverTimestamp() as unknown as BusinessPlan['updatedAt'],
  };
}

export async function createUserAndBusiness(
  uid: string,
  email: string,
  businessName: string,
): Promise<void> {
  const now = serverTimestamp();
  const batch = writeBatch(db);

  batch.set(doc(db, FIRESTORE_COLLECTIONS.USERS, uid), {
    uid,
    email,
    displayName: '',
    businessId: uid,
    createdAt: now,
    updatedAt: now,
  });

  batch.set(doc(db, FIRESTORE_COLLECTIONS.BUSINESSES, uid), {
    id: uid,
    ownerUid: uid,
    name: businessName,
    plan: newTrialPlan(),
    createdAt: now,
    updatedAt: now,
  });

  await batch.commit();
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, uid));
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

export async function getBusiness(businessId: string): Promise<Business | null> {
  const snap = await getDoc(doc(db, FIRESTORE_COLLECTIONS.BUSINESSES, businessId));
  if (!snap.exists()) return null;
  return snap.data() as Business;
}

export async function updateBusiness(uid: string, name: string): Promise<void> {
  await updateDoc(doc(db, FIRESTORE_COLLECTIONS.BUSINESSES, uid), {
    name,
    updatedAt: serverTimestamp(),
  });
}

type BusinessPrefsUpdate = {
  defaultMargin: number | FieldValue;
  defaultRoundTo: RoundTo | FieldValue;
  defaultCategoryId: string | FieldValue;
};

export async function updateBusinessPreferences(
  uid: string,
  prefs: BusinessPrefsUpdate,
): Promise<void> {
  await updateDoc(doc(db, FIRESTORE_COLLECTIONS.BUSINESSES, uid), {
    ...prefs,
    updatedAt: serverTimestamp(),
  });
}

export async function completeOnboarding(uid: string, skipped = false): Promise<void> {
  await updateDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, uid), {
    'onboarding.completed': true,
    'onboarding.completedAt': serverTimestamp(),
    'onboarding.skipped': skipped,
    updatedAt: serverTimestamp(),
  });
}

export async function updateLastLogin(uid: string): Promise<void> {
  await updateDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, uid), {
    lastLoginAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// Repara ÚNICAMENTE el caso de un registro genuinamente interrumpido: la
// cuenta de Firebase Auth se creó pero el batch de Firestore (users +
// businesses) nunca llegó a commitear (app cerrada a mitad de camino, sin
// red, etc.) — en ese caso NINGUNO de los dos documentos existe todavía, y
// es seguro recrearlos con un trial nuevo porque es la primera vez real.
//
// Si existe EXACTAMENTE UNO de los dos documentos, la cuenta está en un
// estado inconsistente por otro motivo (ej. un fallo a mitad de camino de
// una eliminación) — y NO se autorepara ni se genera un trial nuevo. Ver
// AuthContext.accountInconsistent: ese estado se muestra al usuario como
// una pantalla de recuperación, nunca se resuelve creando datos nuevos en
// silencio.
export async function repairIncompleteRegistration(
  uid: string,
  email: string,
): Promise<void> {
  const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, uid);
  const bizRef = doc(db, FIRESTORE_COLLECTIONS.BUSINESSES, uid);

  const [userSnap, bizSnap] = await Promise.all([getDoc(userRef), getDoc(bizRef)]);

  if (userSnap.exists() || bizSnap.exists()) return;

  const now = serverTimestamp();
  const batch = writeBatch(db);

  batch.set(userRef, {
    uid,
    email,
    displayName: '',
    businessId: uid,
    createdAt: now,
    updatedAt: now,
  });

  batch.set(bizRef, {
    id: uid,
    ownerUid: uid,
    name: '',
    plan: newTrialPlan(),
    createdAt: now,
    updatedAt: now,
  });

  await batch.commit();
}
