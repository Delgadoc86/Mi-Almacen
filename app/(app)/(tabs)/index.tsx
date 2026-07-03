import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useCustomers } from '@/hooks/useCustomers';
import { useProducts } from '@/hooks/useProducts';
import { useCashSession } from '@/hooks/useCashSession';
import { theme } from '@/theme';
import { Card, IconChip, ListRow } from '@/components/ui';
import type { Tone } from '@/components/ui';

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

  const cajaTone: Tone = !session ? 'muted' : cajaAbierta ? 'success' : 'muted';
  const cajaIconName = !session ? 'cash-outline' : cajaAbierta ? 'cash' : 'checkmark-circle';
  const cajaAmountStr = saldo !== null ? formatARS(saldo) : '—';
  const cajaValueTone: Tone = saldo !== null && saldo < 0 ? 'danger' : cajaTone;
  const cajaStatusBadge = !session ? undefined : cajaAbierta ? 'ABIERTA' : 'CERRADA';
  const cajaMeta = !session
    ? 'Tocá para abrir'
    : `${movCount} ${movCount === 1 ? 'movimiento' : 'movimientos'}`;

  const fiadosTone: Tone = hasDebt ? 'danger' : 'success';
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
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.businessName}>{business?.name ?? 'Mi Almacén'}</Text>
          </View>
          <IconChip icon="storefront" size="md" tone="primary" filled />
        </View>

        <Card style={styles.dashCard}>
          <ListRow
            icon={cajaIconName}
            iconTone={cajaTone}
            iconLoading={loadingCash}
            title="Caja"
            subtitle={cajaMeta}
            value={loadingCash ? undefined : cajaAmountStr}
            valueTone={cajaValueTone}
            badge={cajaStatusBadge ? { label: cajaStatusBadge, tone: cajaAbierta ? 'success' : 'muted' } : undefined}
            onPress={() => router.push('/cash')}
          />
          <View style={styles.rowDivider} />
          <ListRow
            icon={hasDebt ? 'people' : 'people-outline'}
            iconTone={fiadosTone}
            iconLoading={loadingCustomers}
            title="Fiados"
            subtitle={loadingCustomers ? '...' : fiadosMeta}
            value={loadingCustomers ? undefined : formatARS(totalDebt)}
            valueTone={fiadosTone}
            onPress={() => router.push('/customers')}
          />
          <View style={styles.rowDivider} />
          <ListRow
            icon="cube"
            iconTone="primary"
            iconLoading={loadingProducts}
            title="Inventario"
            subtitle={
              loadingProducts
                ? '...'
                : products.length === 0
                ? 'Sin productos aún'
                : `${categoriesUsed} ${categoriesUsed === 1 ? 'categoría' : 'categorías'}`
            }
            onPress={() => router.push('/products')}
            rightElement={
              !loadingProducts ? (
                <Text style={styles.dashAmount}>
                  {products.length}
                  <Text style={styles.dashAmountUnit}> prod</Text>
                </Text>
              ) : undefined
            }
          />
        </Card>

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
  content: { paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.xl, paddingBottom: theme.spacing.huge },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.xxl + 4,
  },
  greeting: {
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.caption,
    color: theme.colors.muted,
    marginBottom: 2,
  },
  businessName: {
    fontFamily: theme.fontFamily.extrabold,
    fontSize: theme.font.h1,
    color: theme.colors.text,
    letterSpacing: -0.5,
  },

  dashCard: {
    overflow: 'hidden',
    marginBottom: theme.spacing.xl,
  },
  rowDivider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginHorizontal: theme.spacing.lg,
  },
  dashAmount: {
    fontFamily: theme.fontFamily.extrabold,
    fontSize: theme.font.h3,
    color: theme.colors.primary,
    letterSpacing: -0.5,
  },
  dashAmountUnit: {
    fontFamily: theme.fontFamily.semibold,
    fontSize: theme.font.caption,
  },

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
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.micro,
    color: theme.colors.muted,
  },
});
