import { View } from 'react-native';
import { Stack } from 'expo-router';
import { OfflineBanner } from '@/components/OfflineBanner';
import { BusinessDataProvider } from '@/context/BusinessDataContext';
import { theme } from '@/theme';

// Único montaje de OfflineBanner para toda el área autenticada — por encima
// del Stack raíz de (app), así cubre tabs, admin y cualquier pantalla hija
// (formularios, detalle) sin repetirse por pantalla. No debe montarse de
// nuevo en (tabs)/_layout.tsx ni en pantallas individuales.
// Mismo criterio para BusinessDataProvider: un solo listener de productos/
// clientes/caja/categorías para toda esta área, en vez de uno por pantalla.
export default function AppLayout() {
  return (
    <BusinessDataProvider>
      <View style={{ flex: 1 }}>
        <OfflineBanner />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: theme.colors.surface },
            headerTintColor: theme.colors.primary,
            headerTitleStyle: { fontFamily: theme.fontFamily.semibold, color: theme.colors.text },
            contentStyle: { backgroundColor: theme.colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="admin" options={{ headerShown: false }} />
          <Stack.Screen name="products/new" options={{ title: 'Nuevo producto' }} />
          <Stack.Screen name="products/[id]" options={{ title: 'Editar producto' }} />
          <Stack.Screen name="products/prices" options={{ title: 'Lista de precios' }} />
          <Stack.Screen name="customers/new" options={{ title: 'Nuevo cliente' }} />
          <Stack.Screen name="customers/[id]" options={{ title: 'Fiado' }} />
          <Stack.Screen name="customers/[id]/edit" options={{ title: 'Editar cliente' }} />
          <Stack.Screen name="categories/index" options={{ title: 'Categorías' }} />
          <Stack.Screen name="cash/new-income" options={{ title: 'Registrar ingreso' }} />
          <Stack.Screen name="cash/new-expense" options={{ title: 'Registrar gasto' }} />
          <Stack.Screen name="cash/close" options={{ title: 'Cerrar caja' }} />
          <Stack.Screen name="cash/movements" options={{ title: 'Movimientos' }} />
          <Stack.Screen name="cash/history" options={{ title: 'Historial de cajas' }} />
        </Stack>
      </View>
    </BusinessDataProvider>
  );
}
