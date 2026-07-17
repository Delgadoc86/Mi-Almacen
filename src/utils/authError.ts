// Distingue "no hay conexión / Firebase Auth no respondió" de un error real
// de credenciales — para que Login, Registro y Recuperar contraseña
// muestren el diálogo de reintento en vez de un mensaje técnico. El mensaje
// 'timeout' es el que lanza withTimeout() en AuthContext cuando la llamada
// de red se queda colgada; 'auth/network-request-failed' es el código que
// entrega el SDK de Firebase Auth cuando la request falla por falta de red.
export function isConnectionError(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code ?? '';
  const message = (err as { message?: string } | null)?.message ?? '';
  return message === 'timeout' || code === 'auth/network-request-failed';
}
