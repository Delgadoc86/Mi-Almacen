import {
  doc,
  getDoc,
  updateDoc,
  writeBatch,
  serverTimestamp,
  type FieldValue,
} from 'firebase/firestore';
import type { RoundTo } from '@/models';
import { db } from './firebase';
import { FIRESTORE_COLLECTIONS } from '@/constants';
import type { UserProfile, Business } from '@/models';

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
    plan: 'free',
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

export async function repairIncompleteRegistration(
  uid: string,
  email: string,
): Promise<void> {
  const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, uid);
  const bizRef = doc(db, FIRESTORE_COLLECTIONS.BUSINESSES, uid);

  const [userSnap, bizSnap] = await Promise.all([getDoc(userRef), getDoc(bizRef)]);

  if (userSnap.exists() && bizSnap.exists()) return;

  const now = serverTimestamp();
  const batch = writeBatch(db);

  if (!userSnap.exists()) {
    batch.set(userRef, {
      uid,
      email,
      displayName: '',
      businessId: uid,
      createdAt: now,
      updatedAt: now,
    });
  } else {
    // Doc exists but incomplete — merge only updatedAt, preserve createdAt
    batch.set(userRef, { updatedAt: now }, { merge: true });
  }

  if (!bizSnap.exists()) {
    batch.set(bizRef, {
      id: uid,
      ownerUid: uid,
      name: '',
      plan: 'free',
      createdAt: now,
      updatedAt: now,
    });
  }

  await batch.commit();
}
