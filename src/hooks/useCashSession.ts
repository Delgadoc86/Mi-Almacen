import { useBusinessData } from '@/context/BusinessDataContext';

// Lee del listener único de BusinessDataContext — ver ese archivo para el
// motivo (antes cada pantalla abría su propio onSnapshot de la sesión de
// caja: Inicio y Caja terminaban con dos listeners leyendo lo mismo).
// `session` es null solo si el negocio nunca tuvo una caja.
export function useCashSession() {
  const { cashSession } = useBusinessData();
  return { session: cashSession.data, loading: cashSession.loading, error: cashSession.error, retry: cashSession.retry };
}
