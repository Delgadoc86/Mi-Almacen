import { Stack } from 'expo-router';
import { theme } from '@/theme';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.primary,
        headerTitleStyle: { fontWeight: '600', color: theme.colors.text },
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="products/new" options={{ title: 'Nuevo producto' }} />
      <Stack.Screen name="products/[id]" options={{ title: 'Editar producto' }} />
      <Stack.Screen name="customers/new" options={{ title: 'Nuevo cliente' }} />
      <Stack.Screen name="customers/[id]" options={{ title: 'Fiado' }} />
      <Stack.Screen name="customers/[id]/edit" options={{ title: 'Editar cliente' }} />
      <Stack.Screen name="categories/index" options={{ title: 'Categorías' }} />
      <Stack.Screen name="cash/new-income" options={{ title: 'Registrar ingreso' }} />
      <Stack.Screen name="cash/new-expense" options={{ title: 'Registrar gasto' }} />
      <Stack.Screen name="cash/close" options={{ title: 'Cerrar caja' }} />
      <Stack.Screen name="cash/movements" options={{ title: 'Movimientos del día' }} />
    </Stack>
  );
}
