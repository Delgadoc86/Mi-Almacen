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
      <Stack.Screen name="categories/index" options={{ title: 'Categorías' }} />
    </Stack>
  );
}
