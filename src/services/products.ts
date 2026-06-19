import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  where,
  type Unsubscribe,
  type UpdateData,
} from 'firebase/firestore';
import { db } from './firebase';
import { FIRESTORE_COLLECTIONS } from '@/constants';
import type { Product } from '@/models';

function productsRef(businessId: string) {
  return collection(
    db,
    FIRESTORE_COLLECTIONS.BUSINESSES,
    businessId,
    FIRESTORE_COLLECTIONS.PRODUCTS,
  );
}

function productDocRef(businessId: string, productId: string) {
  return doc(
    db,
    FIRESTORE_COLLECTIONS.BUSINESSES,
    businessId,
    FIRESTORE_COLLECTIONS.PRODUCTS,
    productId,
  );
}

export function subscribeToProducts(
  businessId: string,
  onData: (products: Product[]) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  const q = query(productsRef(businessId), orderBy('name'));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product))),
    onError,
  );
}

export async function getProduct(businessId: string, productId: string): Promise<Product | null> {
  const snap = await getDoc(productDocRef(businessId, productId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Product;
}

type ProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;

export async function createProduct(businessId: string, data: ProductInput): Promise<string> {
  const ref = await addDoc(productsRef(businessId), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateProduct(
  businessId: string,
  productId: string,
  data: UpdateData<Product>,
): Promise<void> {
  await updateDoc(productDocRef(businessId, productId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteProduct(businessId: string, productId: string): Promise<void> {
  await deleteDoc(productDocRef(businessId, productId));
}

export async function getCategoryProductCount(
  businessId: string,
  categoryId: string,
): Promise<number> {
  const snap = await getDocs(
    query(productsRef(businessId), where('categoryId', '==', categoryId)),
  );
  return snap.size;
}
