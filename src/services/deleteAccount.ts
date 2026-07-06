import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { FIRESTORE_COLLECTIONS } from '@/constants';

// El borrado real (negocio + perfil + cuenta de Firebase Auth) se removió
// de acá a propósito. Encadenaba tres operaciones no atómicas desde el
// cliente: si `deleteUser()` fallaba (ej. auth/requires-recent-login,
// exigido por Firebase para operaciones sensibles) DESPUÉS de que negocio
// y perfil ya se habían borrado, la cuenta quedaba viva sin datos —  y
// el próximo login podía terminar generando un negocio y un trial nuevos.
// firestore.rules ahora deniega delete sobre `businesses/{uid}` y
// `users/{uid}` para cualquier cliente, así que ese camino ya ni siquiera
// es posible. El borrado real de una cuenta se resuelve en Fase 6, vía
// Admin SDK/Cloud Function (una sola operación server-side, sin pasos
// intermedios que puedan dejar datos a medio borrar).
export async function requestAccountDeletion(businessId: string): Promise<void> {
  await updateDoc(doc(db, FIRESTORE_COLLECTIONS.BUSINESSES, businessId), {
    deletionRequest: { requestedAt: serverTimestamp() },
  });
}
