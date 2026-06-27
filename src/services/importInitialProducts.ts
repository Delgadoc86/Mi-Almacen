import {
  collection,
  doc,
  getDocs,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { FIRESTORE_COLLECTIONS } from '@/constants';
import { INITIAL_ALMACEN_PRODUCTS } from '@/data/initialAlmacenProducts';

function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

function productsRef(businessId: string) {
  return collection(
    db,
    FIRESTORE_COLLECTIONS.BUSINESSES,
    businessId,
    FIRESTORE_COLLECTIONS.PRODUCTS,
  );
}

function bizRef(businessId: string) {
  return doc(db, FIRESTORE_COLLECTIONS.BUSINESSES, businessId);
}

/**
 * Imports the initial product list into the business.
 * - Skips products whose normalized name already exists.
 * - Uses a single writeBatch (28 products + 1 business update = 29 ops, well under the 500-op limit).
 * - Marks importedInitialProducts: true on the business doc regardless of how many were skipped.
 * Returns the number of products actually written.
 */
export async function importInitialProducts(businessId: string): Promise<number> {
  const ref = productsRef(businessId);
  const existingSnap = await getDocs(ref);
  const existingNames = new Set(
    existingSnap.docs.map((d) => normalize(d.data().name as string)),
  );

  const toImport = INITIAL_ALMACEN_PRODUCTS.filter(
    (p) => !existingNames.has(normalize(p.name)),
  );

  const batch = writeBatch(db);
  const now = serverTimestamp();

  toImport.forEach((p) => {
    batch.set(doc(ref), {
      name: p.name,
      cost: p.cost,
      price: p.salePrice,
      margin: p.margin,
      roundTo: p.roundTo,
      type: p.type,
      categoryId: p.categoryId,
      createdAt: now,
      updatedAt: now,
    });
  });

  // Mark the business so this offer is never shown again
  batch.set(bizRef(businessId), { importedInitialProducts: true }, { merge: true });

  await batch.commit();
  return toImport.length;
}

/**
 * Marks the business as "user chose to start from scratch" — hides the offer permanently.
 */
export async function declineInitialProducts(businessId: string): Promise<void> {
  const batch = writeBatch(db);
  batch.set(bizRef(businessId), { importedInitialProducts: true }, { merge: true });
  await batch.commit();
}
