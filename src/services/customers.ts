import {
  collection,
  doc,
  addDoc,
  runTransaction,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  limit,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { FIRESTORE_COLLECTIONS } from '@/constants';
import type { Customer, Movement, MovementType } from '@/models';

function customersRef(businessId: string) {
  return collection(
    db,
    FIRESTORE_COLLECTIONS.BUSINESSES,
    businessId,
    FIRESTORE_COLLECTIONS.CUSTOMERS,
  );
}

function customerDocRef(businessId: string, customerId: string) {
  return doc(
    db,
    FIRESTORE_COLLECTIONS.BUSINESSES,
    businessId,
    FIRESTORE_COLLECTIONS.CUSTOMERS,
    customerId,
  );
}

function movementsRef(businessId: string, customerId: string) {
  return collection(
    db,
    FIRESTORE_COLLECTIONS.BUSINESSES,
    businessId,
    FIRESTORE_COLLECTIONS.CUSTOMERS,
    customerId,
    FIRESTORE_COLLECTIONS.MOVEMENTS,
  );
}

export function subscribeToCustomers(
  businessId: string,
  onData: (customers: Customer[]) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  const q = query(customersRef(businessId), orderBy('name'));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Customer))),
    onError,
  );
}

export function subscribeToCustomer(
  businessId: string,
  customerId: string,
  onData: (customer: Customer | null) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    customerDocRef(businessId, customerId),
    (snap) => {
      if (!snap.exists()) { onData(null); return; }
      onData({ id: snap.id, ...snap.data() } as Customer);
    },
    onError,
  );
}

export async function createCustomer(
  businessId: string,
  data: { name: string; phone?: string },
): Promise<string> {
  const ref = await addDoc(customersRef(businessId), {
    name: data.name,
    ...(data.phone ? { phone: data.phone } : {}),
    balance: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export function subscribeToMovements(
  businessId: string,
  customerId: string,
  onData: (movements: Movement[]) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  const q = query(
    movementsRef(businessId, customerId),
    orderBy('createdAt', 'desc'),
    limit(50),
  );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Movement))),
    onError,
  );
}

export async function registerMovement(
  businessId: string,
  customerId: string,
  type: MovementType,
  amount: number,
  description?: string,
): Promise<void> {
  const customerRef = customerDocRef(businessId, customerId);
  // Generate new movement ID outside transaction (safe — only creates a reference)
  const movRef = doc(movementsRef(businessId, customerId));

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(customerRef);
    if (!snap.exists()) throw new Error('Cliente no encontrado.');

    const currentBalance = (snap.data().balance as number) ?? 0;
    const newBalance = type === 'fiado' ? currentBalance + amount : currentBalance - amount;

    if (newBalance < 0) {
      throw new Error(
        `El pago ($${amount.toLocaleString('es-AR')}) supera el saldo actual ($${currentBalance.toLocaleString('es-AR')}).`,
      );
    }

    tx.update(customerRef, {
      balance: newBalance,
      updatedAt: serverTimestamp(),
    });

    tx.set(movRef, {
      type,
      amount,
      description: description ?? null,
      balanceAfter: newBalance,
      createdAt: serverTimestamp(),
    });
  });
}
