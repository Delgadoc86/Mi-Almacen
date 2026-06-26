import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
} from 'firebase/firestore';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { db } from './firebase';
import { FIRESTORE_COLLECTIONS } from '@/constants';

// Converts Firestore Timestamps to ISO strings for JSON serialization
function serializeDoc(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(data)) {
    if (val && typeof val === 'object' && 'toDate' in val && typeof (val as { toDate: unknown }).toDate === 'function') {
      out[key] = (val as { toDate: () => Date }).toDate().toISOString();
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      out[key] = serializeDoc(val as Record<string, unknown>);
    } else {
      out[key] = val;
    }
  }
  return out;
}

export async function exportBusinessData(businessId: string): Promise<void> {
  const bizRef = doc(db, FIRESTORE_COLLECTIONS.BUSINESSES, businessId);
  const bizSnap = await getDoc(bizRef);
  const businessData = bizSnap.exists() ? serializeDoc(bizSnap.data()) : {};

  // Products
  const productsSnap = await getDocs(
    collection(db, FIRESTORE_COLLECTIONS.BUSINESSES, businessId, FIRESTORE_COLLECTIONS.PRODUCTS),
  );
  const products = productsSnap.docs.map((d) => ({ id: d.id, ...serializeDoc(d.data()) }));

  // Categories
  const categoriesSnap = await getDocs(
    collection(db, FIRESTORE_COLLECTIONS.BUSINESSES, businessId, FIRESTORE_COLLECTIONS.CATEGORIES),
  );
  const categories = categoriesSnap.docs.map((d) => ({ id: d.id, ...serializeDoc(d.data()) }));

  // Customers + their movements
  const customersSnap = await getDocs(
    query(
      collection(db, FIRESTORE_COLLECTIONS.BUSINESSES, businessId, FIRESTORE_COLLECTIONS.CUSTOMERS),
      orderBy('name'),
    ),
  );
  const customers = await Promise.all(
    customersSnap.docs.map(async (custDoc) => {
      const movSnap = await getDocs(
        query(
          collection(
            db,
            FIRESTORE_COLLECTIONS.BUSINESSES, businessId,
            FIRESTORE_COLLECTIONS.CUSTOMERS, custDoc.id,
            FIRESTORE_COLLECTIONS.MOVEMENTS,
          ),
          orderBy('createdAt', 'desc'),
        ),
      );
      return {
        id: custDoc.id,
        ...serializeDoc(custDoc.data()),
        movements: movSnap.docs.map((m) => ({ id: m.id, ...serializeDoc(m.data()) })),
      };
    }),
  );

  // Cash sessions + their movements
  const sessionsSnap = await getDocs(
    query(
      collection(db, FIRESTORE_COLLECTIONS.BUSINESSES, businessId, FIRESTORE_COLLECTIONS.CASH_SESSIONS),
      orderBy('createdAt', 'desc'),
    ),
  );
  const cashSessions = await Promise.all(
    sessionsSnap.docs.map(async (sessionDoc) => {
      const movSnap = await getDocs(
        query(
          collection(
            db,
            FIRESTORE_COLLECTIONS.BUSINESSES, businessId,
            FIRESTORE_COLLECTIONS.CASH_SESSIONS, sessionDoc.id,
            FIRESTORE_COLLECTIONS.CASH_MOVEMENTS,
          ),
          orderBy('createdAt', 'desc'),
        ),
      );
      return {
        id: sessionDoc.id,
        ...serializeDoc(sessionDoc.data()),
        movements: movSnap.docs.map((m) => ({ id: m.id, ...serializeDoc(m.data()) })),
      };
    }),
  );

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    appVersion: '1.0',
    business: { id: businessId, ...businessData },
    products,
    categories,
    customers,
    cashSessions,
  };

  const json = JSON.stringify(exportPayload, null, 2);
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const fileName = `mialmacen-backup-${date}.json`;
  const fileUri = FileSystem.cacheDirectory + fileName;

  await FileSystem.writeAsStringAsync(fileUri, json, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error('Compartir no está disponible en este dispositivo.');

  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/json',
    dialogTitle: 'Guardar backup de Mi Almacén',
    UTI: 'public.json',
  });
}
