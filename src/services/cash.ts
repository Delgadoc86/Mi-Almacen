import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  increment,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { FIRESTORE_COLLECTIONS } from '@/constants';
import type { CashSession, CashMovement, CashMovementType, PaymentMethod } from '@/models';

function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function cashSessionsRef(businessId: string) {
  return collection(
    db,
    FIRESTORE_COLLECTIONS.BUSINESSES,
    businessId,
    FIRESTORE_COLLECTIONS.CASH_SESSIONS,
  );
}

function cashSessionRef(businessId: string, sessionId: string) {
  return doc(
    db,
    FIRESTORE_COLLECTIONS.BUSINESSES,
    businessId,
    FIRESTORE_COLLECTIONS.CASH_SESSIONS,
    sessionId,
  );
}

function cashMovementsRef(businessId: string, sessionId: string) {
  return collection(
    db,
    FIRESTORE_COLLECTIONS.BUSINESSES,
    businessId,
    FIRESTORE_COLLECTIONS.CASH_SESSIONS,
    sessionId,
    FIRESTORE_COLLECTIONS.CASH_MOVEMENTS,
  );
}

export function subscribeTodaySession(
  businessId: string,
  onData: (session: CashSession | null) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  const today = getTodayDateString();
  const q = query(cashSessionsRef(businessId), where('date', '==', today), limit(1));
  return onSnapshot(
    q,
    (snap) => {
      if (snap.empty) { onData(null); return; }
      const d = snap.docs[0];
      onData({ id: d.id, ...d.data() } as CashSession);
    },
    onError,
  );
}

export async function openCashSession(
  businessId: string,
  openingBalance: number,
): Promise<string> {
  const today = getTodayDateString();
  const existing = await getDocs(
    query(cashSessionsRef(businessId), where('date', '==', today), limit(1)),
  );
  if (!existing.empty) throw new Error('Ya existe una caja para hoy.');

  const ref = await addDoc(cashSessionsRef(businessId), {
    date: today,
    openingBalance,
    status: 'open',
    summary: {
      totalIngresos: 0,
      totalEgresos: 0,
      efectivo: 0,
      mercadoPago: 0,
      transferencia: 0,
      otro: 0,
      movementsCount: 0,
    },
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function addCashMovement(
  businessId: string,
  sessionId: string,
  data: {
    type: CashMovementType;
    amount: number;
    medioPago?: PaymentMethod;
    description?: string;
  },
): Promise<void> {
  const sessionRef = cashSessionRef(businessId, sessionId);
  const movRef = doc(cashMovementsRef(businessId, sessionId));

  const summaryUpdate: Record<string, ReturnType<typeof increment>> = {
    'summary.movementsCount': increment(1),
  };

  if (data.type === 'ingreso') {
    summaryUpdate['summary.totalIngresos'] = increment(data.amount);
    if (data.medioPago === 'efectivo') {
      summaryUpdate['summary.efectivo'] = increment(data.amount);
    } else if (data.medioPago === 'mercado_pago') {
      summaryUpdate['summary.mercadoPago'] = increment(data.amount);
    } else if (data.medioPago === 'transferencia') {
      summaryUpdate['summary.transferencia'] = increment(data.amount);
    } else {
      summaryUpdate['summary.otro'] = increment(data.amount);
    }
  } else {
    summaryUpdate['summary.totalEgresos'] = increment(data.amount);
  }

  const batch = writeBatch(db);
  batch.set(movRef, {
    type: data.type,
    amount: data.amount,
    ...(data.medioPago ? { medioPago: data.medioPago } : {}),
    ...(data.description?.trim() ? { description: data.description.trim() } : {}),
    createdAt: serverTimestamp(),
  });
  batch.update(sessionRef, summaryUpdate);
  await batch.commit();
}

export function subscribeCashMovements(
  businessId: string,
  sessionId: string,
  limitCount: number,
  onData: (movements: CashMovement[]) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  const q = query(
    cashMovementsRef(businessId, sessionId),
    orderBy('createdAt', 'desc'),
    limit(limitCount),
  );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CashMovement))),
    onError,
  );
}

export async function closeCashSession(
  businessId: string,
  sessionId: string,
): Promise<void> {
  await updateDoc(cashSessionRef(businessId, sessionId), {
    status: 'closed',
    closedAt: serverTimestamp(),
  });
}

// Helpers re-exported for screens
export { getTodayDateString };
export type { CashSession, CashMovement };
