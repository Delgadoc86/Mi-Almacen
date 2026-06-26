import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  runTransaction,
  onSnapshot,
  serverTimestamp,
  increment,
  query,
  orderBy,
  limit,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { FIRESTORE_COLLECTIONS } from '@/constants';
import type { Customer, Movement, MovementType, PaymentMethod } from '@/models';

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
  data: { name: string; phone?: string; reference?: string },
): Promise<string> {
  try {
    const ref = await addDoc(customersRef(businessId), {
      name: data.name,
      ...(data.phone ? { phone: data.phone } : {}),
      ...(data.reference ? { reference: data.reference } : {}),
      balance: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code ?? '(sin código)';
    const message = (err as { message?: string })?.message ?? '(sin mensaje)';
    console.error('[createCustomer] FIRESTORE ERROR →', { code, message });
    throw err;
  }
}

export async function updateCustomer(
  businessId: string,
  customerId: string,
  data: { name: string; phone?: string; reference?: string },
): Promise<void> {
  await updateDoc(customerDocRef(businessId, customerId), {
    name: data.name,
    phone: data.phone?.trim() || deleteField(),
    reference: data.reference?.trim() || deleteField(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCustomer(
  businessId: string,
  customerId: string,
): Promise<void> {
  await deleteDoc(customerDocRef(businessId, customerId));
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
  paymentMethod?: PaymentMethod,
  cashSessionId?: string,
  customerName?: string,
): Promise<void> {
  const customerRef = customerDocRef(businessId, customerId);
  const movRef = doc(movementsRef(businessId, customerId));

  // Preparar refs de caja solo si aplica (cobro con sesión abierta)
  const cashSessionRef = type === 'pago' && cashSessionId
    ? doc(db, FIRESTORE_COLLECTIONS.BUSINESSES, businessId, FIRESTORE_COLLECTIONS.CASH_SESSIONS, cashSessionId)
    : null;
  const cashMovRef = cashSessionRef
    ? doc(collection(db, FIRESTORE_COLLECTIONS.BUSINESSES, businessId, FIRESTORE_COLLECTIONS.CASH_SESSIONS, cashSessionId!, FIRESTORE_COLLECTIONS.CASH_MOVEMENTS))
    : null;

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

    // ── Movimiento del fiado ─────────────────────────────
    tx.update(customerRef, {
      balance: newBalance,
      updatedAt: serverTimestamp(),
    });
    tx.set(movRef, {
      type,
      amount,
      ...(description ? { description } : {}),
      ...(type === 'pago' && paymentMethod ? { paymentMethod } : {}),
      balanceAfter: newBalance,
      createdAt: serverTimestamp(),
    });

    // ── Ingreso en caja (solo cobros con sesión abierta) ─
    if (cashSessionRef && cashMovRef) {
      const sessionSnap = await tx.get(cashSessionRef);
      if (sessionSnap.exists() && sessionSnap.data()?.status === 'open') {
        const method = paymentMethod ?? 'efectivo';
        const summaryUpdate: Record<string, ReturnType<typeof increment>> = {
          'summary.movementsCount': increment(1),
          'summary.totalIngresos': increment(amount),
        };
        if (method === 'efectivo') summaryUpdate['summary.efectivo'] = increment(amount);
        else if (method === 'mercado_pago') summaryUpdate['summary.mercadoPago'] = increment(amount);
        else if (method === 'transferencia') summaryUpdate['summary.transferencia'] = increment(amount);
        else summaryUpdate['summary.otro'] = increment(amount);

        tx.set(cashMovRef, {
          type: 'ingreso',
          amount,
          medioPago: method,
          description: `Cobro fiado · ${customerName ?? 'Cliente'}`,
          createdAt: serverTimestamp(),
        });
        tx.update(cashSessionRef, summaryUpdate);
      }
    }
  });
}
