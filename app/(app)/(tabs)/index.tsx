import { useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useCustomers } from '@/hooks/useCustomers';
import { useProducts } from '@/hooks/useProducts';
import { theme } from '@/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { business } = useAuth();
  const { customers, loading: loadingCustomers } = useCustomers();
  const { products, loading: loadingProducts } = useProducts();

  const totalDebt = useMemo(() => customers.reduce((s, c) => s + c.balance, 0), [customers]);
  const debtorCount = useMemo(() => customers.filter((c) => c.balance > 0).length, [customers]);
  const productCount = products.length;

  const hasDebt = totalDebt > 0;
  const allClear = !hasDebt && customers.length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.businessName}>{business?.name ?? 'Mi Almacén'}</Text>
        <Text style={styles.tagline}>Panel de tu negocio</Text>

        {/* ── FIADOS ── */}
        <Text style={styles.sectionLabel}>FIADOS</Text>
        <TouchableOpacity
          style={[
            styles.card,
            hasDebt ? styles.cardRed : allClear ? styles.cardGreen : null,
          ]}
          onPress={() => router.push('/customers')}
          activeOpacity={0.75}
        >
          {loadingCustomers ? (
            <ActivityIndicator color={theme.colors.primary} style={styles.loader} />
          ) : (
            <>
              <View style={styles.cardMain}>
                <View
                  style={[
                    styles.iconWrap,
                    { backgroundColor: hasDebt ? theme.colors.dangerLight : theme.colors.primaryLight },
                  ]}
                >
                  <Ionicons
                    name={allClear ? 'checkmark-circle' : 'people'}
                    size={26}
                    color={
                      hasDebt
                        ? theme.colors.error
                        : allClear
                        ? theme.colors.success
                        : theme.colors.primary
                    }
                  />
                </View>
                <View style={styles.cardBody}>
                  <Text style={[styles.cardAmount, hasDebt && styles.amountRed]}>
                    ${totalDebt.toLocaleString('es-AR')}
                  </Text>
                  <Text style={styles.cardSub}>pendiente total</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
              </View>
              <View style={styles.cardDivider} />
              <View style={styles.cardFooter}>
                <Text style={styles.cardMeta}>
                  {customers.length === 0
                    ? 'Sin clientes cargados'
                    : allClear
                    ? 'Todos los clientes al día'
                    : `${debtorCount} cliente${debtorCount !== 1 ? 's deben' : ' debe'}`}
                </Text>
                <Text style={styles.cardAction}>Ver fiados</Text>
              </View>
            </>
          )}
        </TouchableOpacity>

        {/* ── INVENTARIO ── */}
        <Text style={styles.sectionLabel}>INVENTARIO</Text>
        <View style={styles.card}>
          {loadingProducts ? (
            <ActivityIndicator color={theme.colors.primary} style={styles.loader} />
          ) : (
            <>
              <View style={styles.cardMain}>
                <View style={[styles.iconWrap, { backgroundColor: theme.colors.primaryLight }]}>
                  <Ionicons name="cube" size={26} color={theme.colors.primary} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardAmount}>{productCount}</Text>
                  <Text style={styles.cardSub}>
                    {productCount === 1 ? 'producto cargado' : 'productos en catálogo'}
                  </Text>
                </View>
              </View>
              <View style={styles.cardDivider} />
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => router.push('/products/new')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add-circle-outline" size={18} color={theme.colors.primary} />
                  <Text style={styles.actionBtnText}>Nuevo producto</Text>
                </TouchableOpacity>
                <View style={styles.actionSep} />
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => router.push('/pdf')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="document-text-outline" size={18} color={theme.colors.primary} />
                  <Text style={styles.actionBtnText}>Lista PDF</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  businessName: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: theme.colors.muted,
    marginTop: 2,
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.muted,
    letterSpacing: 1,
    marginBottom: 8,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 24,
  },
  cardRed: {
    backgroundColor: theme.colors.dangerLight,
    borderColor: '#FECACA',
  },
  cardGreen: {
    backgroundColor: theme.colors.successLight,
    borderColor: '#BBF7D0',
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  amountRed: { color: theme.colors.error },
  cardSub: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  cardDivider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardMeta: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  cardAction: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  actionSep: {
    width: 1,
    height: 24,
    backgroundColor: theme.colors.divider,
  },
  loader: {
    paddingVertical: 20,
  },
});
