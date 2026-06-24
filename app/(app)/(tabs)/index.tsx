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

  const saldoActual = session
    ? session.openingBalance + session.summary.totalIngresos - session.summary.totalEgresos
    : 0;
  const movCount = session?.summary.movementsCount ?? 0;

  const hasDebt = totalDebt > 0;
  const allClear = !hasDebt && customers.length > 0;
  const cajaAbierta = session?.status === 'open';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

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

        {/* ── CAJA DEL DÍA ── */}
        <Text style={styles.sectionLabel}>CAJA DEL DÍA</Text>
        <TouchableOpacity
          style={[styles.card, cajaAbierta && styles.cardGreen]}
          onPress={() => router.push('/cash')}
          activeOpacity={0.75}
        >
          {loadingCash ? (
            <ActivityIndicator color={theme.colors.primary} style={styles.loader} />
          ) : !session ? (
            <View style={styles.cardMain}>
              <View style={[styles.iconWrap, { backgroundColor: theme.colors.divider }]}>
                <Ionicons name="cash-outline" size={26} color={theme.colors.muted} />
              </View>
              <View style={styles.cardBody}>
                <Text style={[styles.cardAmount, { color: theme.colors.muted }]}>Sin abrir</Text>
                <Text style={styles.cardSub}>Tocá para abrir la caja de hoy</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
            </View>
          ) : (
            <>
              <View style={styles.cardMain}>
                <View
                  style={[
                    styles.iconWrap,
                    { backgroundColor: cajaAbierta ? theme.colors.successMid : theme.colors.divider },
                  ]}
                >
                  <Ionicons
                    name={cajaAbierta ? 'cash' : 'checkmark-circle'}
                    size={26}
                    color={cajaAbierta ? theme.colors.success : theme.colors.muted}
                  />
                </View>
                <View style={styles.cardBody}>
                  <Text
                    style={[
                      styles.cardAmount,
                      cajaAbierta ? styles.amountGreen : null,
                      saldoActual < 0 && styles.amountRed,
                    ]}
                  >
                    ${saldoActual.toLocaleString('es-AR')}
                  </Text>
                  <Text style={styles.cardSub}>
                    {cajaAbierta ? 'saldo actual' : 'saldo del día · cerrada'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
              </View>
              <View style={styles.cardDivider} />
              <Text style={styles.cardMeta}>
                {movCount} {movCount === 1 ? 'movimiento' : 'movimientos'} registrados
              </Text>
            </>
          )}
        </TouchableOpacity>

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
                    { backgroundColor: hasDebt ? theme.colors.dangerMid : theme.colors.primaryLight },
                  ]}
                >
                  <Ionicons
                    name={allClear ? 'checkmark-circle' : 'people'}
                    size={26}
                    color={hasDebt ? theme.colors.error : allClear ? theme.colors.success : theme.colors.primary}
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
              <Text style={styles.cardMeta}>
                {customers.length === 0
                  ? 'Sin clientes cargados'
                  : allClear
                  ? 'Todos los clientes al día'
                  : `${debtorCount} deben · ${clearCount} al día`}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* ── INVENTARIO ── */}
        <Text style={styles.sectionLabel}>INVENTARIO</Text>
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/products')}
          activeOpacity={0.75}
        >
          {loadingProducts ? (
            <ActivityIndicator color={theme.colors.primary} style={styles.loader} />
          ) : (
            <>
              <View style={styles.cardMain}>
                <View style={[styles.iconWrap, { backgroundColor: theme.colors.primaryLight }]}>
                  <Ionicons name="cube" size={26} color={theme.colors.primary} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardAmount}>{products.length}</Text>
                  <Text style={styles.cardSub}>
                    {products.length === 1 ? 'producto en catálogo' : 'productos en catálogo'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
              </View>
              <View style={styles.cardDivider} />
              <Text style={styles.cardMeta}>
                {products.length === 0
                  ? 'Sin productos cargados'
                  : categoriesUsed > 0
                  ? `${categoriesUsed} ${categoriesUsed === 1 ? 'categoría activa' : 'categorías activas'}`
                  : 'Sin categorías asignadas'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* ── LIVE INDICATOR ── */}
        <View style={styles.updateRow}>
          <View style={styles.liveDot} />
          <Text style={styles.updateTime}>Datos en tiempo real</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
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
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.muted,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardRed: {
    backgroundColor: theme.colors.dangerLight,
    borderColor: theme.colors.dangerMid,
  },
  cardGreen: {
    backgroundColor: theme.colors.successLight,
    borderColor: theme.colors.successMid,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -1,
  },
  amountRed: { color: theme.colors.error },
  amountGreen: { color: theme.colors.success },
  cardSub: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 1,
    fontWeight: '500',
  },
  cardDivider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginVertical: 14,
  },
  cardMeta: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  loader: { paddingVertical: 20 },
  updateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.success,
  },
  updateTime: {
    fontSize: 11,
    color: theme.colors.muted,
    fontWeight: '500',
  },
});
