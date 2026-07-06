import { useEffect, useState } from 'react';

const DEFAULT_TIMEOUT_MS = 9000;

// Un `loading` que depende de red (getDoc puntual u onSnapshot sin cache
// previo) puede quedar en `true` para siempre si no hay conexión — no hay
// ningún timeout propio en el SDK de Firestore para eso. Este hook convierte
// esa espera indefinida en una señal explícita a los `ms` de no resolver,
// para que la pantalla pueda mostrar "no pudimos conectar" en vez de un
// spinner eterno. Se autolimpia solo: si `loading` vuelve a `false` (llegó
// el dato, incluso tarde) `timedOut` vuelve a `false` sin intervención.
export function useLoadingTimeout(loading: boolean, ms: number = DEFAULT_TIMEOUT_MS): boolean {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!loading) {
      setTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setTimedOut(true), ms);
    return () => clearTimeout(timer);
  }, [loading, ms]);

  return timedOut;
}
