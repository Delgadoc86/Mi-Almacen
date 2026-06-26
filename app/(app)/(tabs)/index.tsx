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
import { useCashSession } from '@/hooks/useCashSession';
import { theme } from '@/theme';

function formatARS(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-AR');
}

export default function HomeScreen() {
  const router = useRouter();
  const { business } = useAuth();
  const { customers, loading: loadingCustomers } = useCustomers();
  const { products, loading: loadingProducts } = useProducts();
  const { session, loading: loadingCash } = useCashSession();

  const totalDebt = useMemo(() => customers.reduce((s, c) => s + c.balance, 0), [customers]);
  const debtorCount = useMemo(() => customers.filter((c) => c.balance > 0).length, [customers]);
  const clearCount = customers.length - debtorCount;
  const categoriesUsed = useMemo(
    () => new Set(products.map((p) => p.categoryId).filter(Boolean)).size,
    [products],
  );

  const saldo = session
    ? session.openingBalance + session.summary.totalIngresos - session.summary.totalEgresos
    : null;
  const movCount = session?.summary.movementsCount ?? 0;
  const cajaAbierta = session?.status === 'open';
  const hasDebt = totalDebt > 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

  // ── Caja: colores y textos según estado ──
  const cajaColor = !session
    ? theme.colors.muted
    : cajaAbierta
    ? theme.colors.success
    : theme.colors.textSecondary;

  const cajaIconName = !session
    ? 'cash-outline'
    : cajaAbierta
    ? 'cash'
    : 'checkmark-circle';

  const cajaAmountStr = saldo !== null ? formatARS(saldo) : '—';

  const cajaStatusBadge = !session
    ? null
    : cajaAbierta
    ? 'ABIERTA'
    : 'CERRADA';

  const cajaMeta = !session
    ? 'Tocá para abrir'
    : `${movCount} ${movCount === 1 ? 'movimiento' : 'movimientos'}`;

  // ── Fiados: colores y textos ──
  const fiadosColor = hasDebt ? theme.colors.error : theme.colors.success;
  const fiadosMeta =
    customers.length === 0
      ? 'Sin clientes aún'
      : hasDebt
      ? `${debtorCount} ${debtorCount === 1 ? 'debe' : 'deben'} · ${clearCount} al día`
      : 'Todos al día';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.businessName}>{business?.name ?? 'Mi Almacén'}</Text>
          </View>
          <View style={styles.logoWrap}>
            <Ionicons name="storefront" size={20} color="#ffffff" />
          </View>
        </View>

        {/* ── DASHBOARD — tres filas en un card unificado ── */}
        <View style={styles.dashCard}>

          {/* CAJA */}
          <TouchableOpacity
            style={styles.dashRow}
            onPress={() => router.push('/cash')}
            activeOpacity={0.7}
          >
            <View style={[
              styles.dashIconWrap,
              { backgroundColor: !session ? theme.colors.divider : cajaAbierta ? theme.colors.successMid : theme.colors.divider },
            ]}>
              {loadingCash ? (
                <ActivityIndicator size="small" color={theme.colors.muted} />
              ) : (
                <Ionicons name={cajaIconName} size={22} color={cajaColor} />
              )}
            </View>

            <View style={styles.dashBody}>
              <View style={styles.dashTitleRow}>
                <Text style={styles.dashLabel}>Caja</Text>
                {cajaStatusBadge && (
                  <View style={[
                    styles.badge,
                    { backgroundColor: cajaAbierta ? theme.colors.successMid : theme.colors.divider },
                  ]}>
                    <Text style={[
                      styles.badgeTxt,
                      { color: cajaAbierta ? theme.colors.success : theme.colors.muted },
                    ]}>
                      {cajaStatusBadge}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.dashMeta}>{cajaMeta}</Text>
            </View>

            <View style={styles.dashRight}>
              {loadingCash ? null : (
                <Text style={[
                  styles.dashAmount,
                  { color: saldo !== null && saldo < 0 ? theme.colors.error : cajaColor },
                ]}>
                  {cajaAmountStr}
                </Text>
              )}
              <Ionicons name="chevron-forward" size={16} color={theme.colors.muted} />
            </View>
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          {/* FIADOS */}
          <TouchableOpacity
            style={styles.dashRow}
            onPress={() => router.push('/customers')}
            activeOpacity={0.7}
          >
            <View style={[
              styles.dashIconWrap,
              { backgroundColor: hasDebt ? theme.colors.dangerMid : theme.colors.successMid },
            ]}>
              {loadingCustomers ? (
                <ActivityIndicator size="small" color={theme.colors.muted} />
              ) : (
                <Ionicons
                  name={hasDebt ? 'people' : 'people-outline'}
                  size={22}
                  color={fiadosColor}
                />
              )}
            </View>

            <View style={styles.dashBody}>
              <Text style={styles.dashLabel}>Fiados</Text>
              <Text style={styles.dashMeta}>{loadingCustomers ? '...' : fiadosMeta}</Text>
            </View>

            <View style={styles.dashRight}>
              {!loadingCustomers && (
                <Text style={[styles.dashAmount, { color: hasDebt ? theme.colors.error : theme.colors.success }]}>
                  {formatARS(totalDebt)}
                </Text>
              )}
              <Ionicons name="chevron-forward" size={16} color={theme.colors.muted} />
            </View>
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          {/* INVENTARIO */}
          <TouchableOpacity
            style={styles.dashRow}
            onPress={() => router.push('/products')}
            activeOpacity={0.7}
          >
            <View style={[styles.dashIconWrap, { backgroundColor: theme.colors.primaryLight }]}>
              {loadingProducts ? (
                <ActivityIndicator size="small" color={theme.colors.muted} />
              ) : (
                <Ionicons name="cube" size={22} color={theme.colors.primary} />
              )}
            </View>

            <View style={styles.dashBody}>
              <Text style={styles.dashLabel}>Inventario</Text>
              <Text style={styles.dashMeta}>
                {loadingProducts
                  ? '...'
                  : products.length === 0
                  ? 'Sin productos aún'
                  : `${categoriesUsed} ${categoriesUsed === 1 ? 'categoría' : 'categorías'}`}
              </Text>
            </View>

            <View style={styles.dashRight}>
              {!loadingProducts && (
                <Text style={[styles.dashAmount, { color: theme.colors.primary }]}>
                  {products.length}
                  <Text style={styles.dashAmountUnit}> prod</Text>
                </Text>
              )}
              <Ionicons name="chevron-forward" size={16} color={theme.colors.muted} />
            </View>
          </TouchableOpacity>
        </View>

        {/* ── LIVE ── */}
        <View style={styles.liveRow}>
          <View style={styles.liveDot} />
          <Text style={styles.liveTxt}>Datos en tiempo real</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  greeting: {
    fontSize: 13,
    color: theme.colors.muted,
    fontWeight: '500',
    marginBottom: 2,
  },
  businessName: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  logoWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },

  // ── Dashboard card unificado ──
  dashCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  dashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
  },
  rowDivider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginHorizontal: 16,
  },
  dashIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashBody: { flex: 1, gap: 2 },
  dashTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dashLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  dashMeta: {
    fontSize: 12,
    color: theme.colors.muted,
    fontWeight: '500',
  },
  dashRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  dashAmount: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  dashAmountUnit: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0,
  },

  // Badge "ABIERTA" / "CERRADA"
  badge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeTxt: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Live
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.success,
  },
  liveTxt: {
    fontSize: 11,
    color: theme.colors.muted,
    fontWeight: '500',
  },
});
