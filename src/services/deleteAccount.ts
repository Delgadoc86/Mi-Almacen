import {
  collection,
  doc,
  getDocs,
  writeBatch,
  deleteDoc,
} from 'firebase/firestore';
import { deleteUser } from 'firebase/auth';
import { db, auth } from './firebase';
import { FIRESTORE_COLLECTIONS } from '@/constants';

// Deletes all docs in a collection in batches of 400 (safe margin under 500 limit)
async function deleteCollection(collPath: string[]): Promise<void> {
  const ref = collection(db, ...collPath as [string, ...string[]]);
  const snap = await getDocs(ref);
  if (snap.empty) return;

  const chunks: typeof snap.docs[] = [];
  for (let i = 0; i < snap.docs.length; i += 400) {
    chunks.push(snap.docs.slice(i, i + 400));
  }

  for (const chunk of chunks) {
    const batch = writeBatch(db);
    chunk.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

export async function deleteBusinessData(businessId: string): Promise<void> {
  // 1. Customer movements (subcollections first)
  const customersSnap = await getDocs(
    collection(db, FIRESTORE_COLLECTIONS.BUSINESSES, businessId, FIRESTORE_COLLECTIONS.CUSTOMERS),
  );
  await Promise.all(
    customersSnap.docs.map((custDoc) =>
      deleteCollection([
        FIRESTORE_COLLECTIONS.BUSINESSES, businessId,
        FIRESTORE_COLLECTIONS.CUSTOMERS, custDoc.id,
        FIRESTORE_COLLECTIONS.MOVEMENTS,
      ]),
    ),
  );

  // 2. Customers
  await deleteCollection([
    FIRESTORE_COLLECTIONS.BUSINESSES, businessId,
    FIRESTORE_COLLECTIONS.CUSTOMERS,
  ]);

  // 3. Cash movements (subcollections first)
  const sessionsSnap = await getDocs(
    collection(db, FIRESTORE_COLLECTIONS.BUSINESSES, businessId, FIRESTORE_COLLECTIONS.CASH_SESSIONS),
  );
  await Promise.all(
    sessionsSnap.docs.map((sessionDoc) =>
      deleteCollection([
        FIRESTORE_COLLECTIONS.BUSINESSES, businessId,
        FIRESTORE_COLLECTIONS.CASH_SESSIONS, sessionDoc.id,
        FIRESTORE_COLLECTIONS.CASH_MOVEMENTS,
      ]),
    ),
  );

  // 4. Cash sessions
  await deleteCollection([
    FIRESTORE_COLLECTIONS.BUSINESSES, businessId,
    FIRESTORE_COLLECTIONS.CASH_SESSIONS,
  ]);

  // 5. Products
  await deleteCollection([
    FIRESTORE_COLLECTIONS.BUSINESSES, businessId,
    FIRESTORE_COLLECTIONS.PRODUCTS,
  ]);

  // 6. Categories
  await deleteCollection([
    FIRESTORE_COLLECTIONS.BUSINESSES, businessId,
    FIRESTORE_COLLECTIONS.CATEGORIES,
  ]);

  // 7. Business document
  await deleteDoc(doc(db, FIRESTORE_COLLECTIONS.BUSINESSES, businessId));
}

export async function deleteUserProfile(uid: string): Promise<void> {
  await deleteDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, uid));
}

export async function deleteAuthUser(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('No hay sesión activa.');
  await deleteUser(user);
}
