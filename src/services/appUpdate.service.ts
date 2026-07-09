import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { AppUpdateInfo } from '@/models';

const UPDATE_DOC_REF = doc(db, 'appConfig', 'updateInfo');

type UpdateInfoInput = Pick<AppUpdateInfo, 'active' | 'latestVersion' | 'title' | 'message' | 'downloadUrl'>;

// Lectura pública (ver firestore.rules) — no requiere sesión iniciada. Si el
// documento no existe todavía, o falla la lectura (sin conexión, etc.), se
// devuelve null: la app sigue funcionando como si no hubiera actualización.
export async function getUpdateInfo(): Promise<AppUpdateInfo | null> {
  try {
    const snap = await getDoc(UPDATE_DOC_REF);
    return snap.exists() ? (snap.data() as AppUpdateInfo) : null;
  } catch (error) {
    console.warn('[appUpdate] No se pudo leer appConfig/updateInfo:', error);
    return null;
  }
}

// Solo admin puede escribir (ver firestore.rules). `isNew` evita pisar
// `createdAt` en cada guardado posterior.
export async function saveUpdateInfo(data: UpdateInfoInput, isNew: boolean): Promise<void> {
  await setDoc(
    UPDATE_DOC_REF,
    {
      active: data.active,
      latestVersion: data.latestVersion,
      title: data.title,
      message: data.message,
      downloadUrl: data.downloadUrl,
      updatedAt: serverTimestamp(),
      ...(isNew ? { createdAt: serverTimestamp() } : {}),
    },
    { merge: true },
  );
}
