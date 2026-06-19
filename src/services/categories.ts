import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  writeBatch,
  doc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { FIRESTORE_COLLECTIONS, DEFAULT_CATEGORIES } from '@/constants';
import type { Category } from '@/models';

function categoriesRef(businessId: string) {
  return collection(
    db,
    FIRESTORE_COLLECTIONS.BUSINESSES,
    businessId,
    FIRESTORE_COLLECTIONS.CATEGORIES,
  );
}

export async function getOrSeedCategories(businessId: string): Promise<void> {
  const ref = categoriesRef(businessId);
  const snap = await getDocs(query(ref, orderBy('order')));

  // All categories already present — skip seed entirely
  if (snap.size >= DEFAULT_CATEGORIES.length) return;

  // Seed using fixed IDs + merge:true — idempotent, never duplicates
  const batch = writeBatch(db);
  DEFAULT_CATEGORIES.forEach(({ id, name, order, system, locked }) => {
    batch.set(
      doc(ref, id),
      { name, order, system, locked, createdAt: serverTimestamp() },
      { merge: true },
    );
  });
  await batch.commit();
}

export function subscribeToCategories(
  businessId: string,
  onData: (categories: Category[]) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  const q = query(categoriesRef(businessId), orderBy('order'));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Category))),
    onError,
  );
}

export async function createCategory(businessId: string, name: string): Promise<void> {
  const ref = categoriesRef(businessId);
  const snap = await getDocs(query(ref, orderBy('order', 'desc'), limit(1)));
  const maxOrder = snap.empty ? 10 : (snap.docs[0].data().order as number) + 1;
  await addDoc(ref, {
    name: name.trim(),
    order: maxOrder,
    system: false,
    locked: false,
    createdAt: serverTimestamp(),
  });
}

export async function deleteCategory(businessId: string, categoryId: string): Promise<void> {
  await deleteDoc(doc(categoriesRef(businessId), categoryId));
}
