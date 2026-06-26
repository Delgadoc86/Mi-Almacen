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
  deleteField,
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

// Retorna la sesión más reciente (abierta o cerrada). Null si nunca hubo ninguna.
export function subscribeLatestSession(
  businessId: string,
  onData: (session: CashSession | null) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  const q = query(cashSessionsRef(businessId), orderBy('createdAt', 'desc'), limit(1));
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

// Para la pantalla de historial: devuelve las últimas N sesiones ordenadas por apertura.
export function subscribeCashHistory(
  businessId: string,
  limitCount: number,
  onData: (sessions: CashSession[]) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  const q = query(cashSessionsRef(businessId), orderBy('createdAt', 'desc'), limit(limitCount));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CashSession))),
    onError,
  );
}

// Abre una nueva sesión. Falla si ya existe una abierta (sin importar la fecha).
export async function openCashSession(
  businessId: string,
  openingBalance: number,
): Promise<string> {
  const existing = await getDocs(
    query(cashSessionsRef(businessId), where('status', '==', 'open'), limit(1)),
  );
  if (!existing.empty) throw new Error('Ya hay una caja abierta.');

  const ref = await addDoc(cashSessionsRef(businessId), {
    date: getTodayDateString(),
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

// Reabre una sesión cerrada sin crear una nueva ni duplicar movimientos.
export async function reopenCashSession(
  businessId: string,
  sessionId: string,
): Promise<void> {
  await updateDoc(cashSessionRef(businessId, sessionId), {
    status: 'open',
    closedAt: deleteField(),
  });
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
