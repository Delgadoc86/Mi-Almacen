import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SearchBar } from '@/components/SearchBar';
import { CustomerCard } from '@/components/CustomerCard';
import { EmptyState } from '@/components/EmptyState';
import { useCustomers } from '@/hooks/useCustomers';
import { theme } from '@/theme';
import { AmountDisplay, ScreenHeader } from '@/components/ui';

export default function CustomersScreen() {
  const router = useRouter();
  const { customers, loading } = useCustomers();
  const [search, setSearch] = useState('');

  const totalDebt = useMemo(() => customers.reduce((sum, c) => sum + c.balance, 0), [customers]);
  const debtorCount = useMemo(() => customers.filter((c) => c.balance > 0).length, [customers]);
  const clearCount = customers.length - debtorCount;

  // Deudores primero (por monto desc), luego al-día (alfabético)
  const sorted = useMemo(() => {
    const debtors = customers
      .filter((c) => c.balance > 0)
      .sort((a, b) => b.balance - a.balance);
    const clear = customers
      .filter((c) => c.balance === 0)
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
    return [...debtors, ...clear];
  }, [customers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((c) => c.name.toLowerCase().includes(q));
  }, [sorted, search]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <ScreenHeader
          title="Fiados"
          right={
            <TouchableOpacity
              style={styles.fab}
              onPress={() => router.push('/customers/new')}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          }
        />
        <View style={styles.headerSpacer} />

        {!loading && customers.length > 0 && (
          <View style={[styles.summaryCard, totalDebt > 0 ? styles.summaryCardDebt : styles.summaryCardOk]}>
            <View style={styles.summaryLeft}>
              <AmountDisplay value={totalDebt} tone={totalDebt > 0 ? 'danger' : 'success'} />
              <Text style={styles.summaryMainLabel}>pendiente total</Text>
            </View>
            <View style={styles.summarySep} />
            <View style={styles.summaryRight}>
              {debtorCount > 0 ? (
                <Text style={[styles.summaryStatLine, styles.amountDanger]}>
                  {debtorCount} {debtorCount === 1 ? 'debe' : 'deben'}
                </Text>
              ) : (
                <Text style={[styles.summaryStatLine, styles.amountOk]}>Todos al día</Text>
              )}
              {clearCount > 0 && debtorCount > 0 && (
                <Text style={styles.summaryStatSub}>
                  {clearCount} al día
                </Text>
              )}
            </View>
          </View>
        )}

        <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar cliente..." />

        {loading ? (
          <ActivityIndicator style={styles.loader} color={theme.colors.primary} />
        ) : customers.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="No hay clientes fiados todavía"
            subtitle="Agregá un cliente para empezar a registrar fiados y cobros."
            actionLabel="Agregar cliente"
            onAction={() => router.push('/customers/new')}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="search-outline"
            title="Sin resultados"
            subtitle="Probá con otro nombre."
          />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <CustomerCard
                customer={item}
                onPress={() => router.push(`/customers/${item.id}`)}
              />
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
  },
  headerSpacer: { height: theme.spacing.md },
  fab: {
    backgroundColor: theme.colors.accent,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 3,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.radius.cardLg,
    borderWidth: 1,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.md,
    ...theme.shadow.md,
  },
  summaryCardDebt: {
    backgroundColor: theme.colors.dangerLight,
    borderColor: theme.colors.dangerMid,
  },
  summaryCardOk: {
    backgroundColor: theme.colors.successLight,
    borderColor: theme.colors.successMid,
  },
  summaryLeft: { flex: 1 },
  summaryMainLabel: {
    fontFamily: theme.fontFamily.semibold,
    fontSize: theme.font.micro,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  summarySep: {
    width: 1,
    height: 36,
    backgroundColor: theme.colors.divider,
    marginHorizontal: theme.spacing.lg,
  },
  summaryRight: { alignItems: 'flex-end' },
  summaryStatLine: {
    fontFamily: theme.fontFamily.extrabold,
    fontSize: theme.font.h2,
    letterSpacing: -0.3,
  },
  summaryStatSub: {
    fontFamily: theme.fontFamily.semibold,
    fontSize: theme.font.micro,
    color: theme.colors.muted,
    marginTop: 2,
  },
  amountDanger: { color: theme.colors.error },
  amountOk: { color: theme.colors.success },
  loader: { marginTop: 40 },
  list: { paddingBottom: theme.spacing.xl },
});
