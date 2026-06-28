import { type ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OfflineBanner } from '@/components/OfflineBanner';
import { theme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, [IconName, IconName]> = {
  index: ['storefront', 'storefront-outline'],
  cash: ['cash', 'cash-outline'],
  customers: ['wallet', 'wallet-outline'],
  products: ['basket', 'basket-outline'],
  settings: ['options', 'options-outline'],
};

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1 }}>
      <OfflineBanner />
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarStyle: [styles.tabBar, {
          height: 68 + insets.bottom,
          paddingBottom: 12 + insets.bottom,
        }],
        tabBarLabelStyle: styles.label,
        tabBarIcon: ({ focused, size }) => {
          const [active, inactive] = TAB_ICONS[route.name] ?? ['ellipse', 'ellipse-outline'];
          return (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Ionicons
                name={focused ? active : inactive}
                size={size - 2}
                color={focused ? '#fff' : theme.colors.muted}
              />
            </View>
          );
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="cash" options={{ title: 'Caja' }} />
      <Tabs.Screen name="customers" options={{ title: 'Fiados' }} />
      <Tabs.Screen name="products" options={{ title: 'Productos' }} />
      <Tabs.Screen name="settings" options={{ title: 'Config' }} />
      <Tabs.Screen name="pdf" options={{ href: null }} />
    </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 4,
    elevation: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  iconWrap: {
    width: 38,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Pill sólido oscuro: muy obvia la diferencia activo/inactivo
  iconWrapActive: {
    backgroundColor: theme.colors.primary,
  },
});
