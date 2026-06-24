import { type ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, [IconName, IconName]> = {
  index: ['storefront', 'storefront-outline'],
  products: ['basket', 'basket-outline'],
  customers: ['wallet', 'wallet-outline'],
  cash: ['cash', 'cash-outline'],
  pdf: ['pricetag', 'pricetag-outline'],
  settings: ['options', 'options-outline'],
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.label,
        tabBarIcon: ({ focused, color, size }) => {
          const [active, inactive] = TAB_ICONS[route.name] ?? ['ellipse', 'ellipse-outline'];
          return (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Ionicons name={focused ? active : inactive} size={size - 2} color={color} />
            </View>
          );
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="cash" options={{ title: 'Caja' }} />
      <Tabs.Screen name="customers" options={{ title: 'Fiados' }} />
      <Tabs.Screen name="products" options={{ title: 'Productos' }} />
      <Tabs.Screen name="pdf" options={{ title: 'Precios' }} />
      <Tabs.Screen name="settings" options={{ title: 'Config' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    height: 68,
    paddingBottom: 12,
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
    width: 36,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: theme.colors.primaryLight,
  },
});
