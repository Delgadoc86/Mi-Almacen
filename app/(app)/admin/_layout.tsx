import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/theme';

// Guardia de la ruta, no solo del botón: entrar acá por navegación directa
// (deep link, historial, o simplemente escribiendo la URL) sin el custom
// claim `admin === true` redirige de inmediato al inicio — nunca llega a
// pedir ni a mostrar ningún dato administrativo. `isAdmin` viene de
// AuthContext, resuelto contra el ID token real de Firebase Auth, no de
// ningún dato de Firestore que el propio cliente pudiera manipular.
export default function AdminLayout() {
  const { isAdmin } = useAuth();

  if (!isAdmin) return <Redirect href="/" />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.primary,
        headerTitleStyle: { fontFamily: theme.fontFamily.semibold, color: theme.colors.text },
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Panel Admin' }} />
      <Stack.Screen name="businesses" options={{ title: 'Negocios' }} />
      <Stack.Screen name="business/[businessId]" options={{ title: 'Detalle de negocio' }} />
    </Stack>
  );
}
