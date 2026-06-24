import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SearchBar } from '@/components/SearchBar';
import { CustomerCard } from '@/components/CustomerCard';
import { EmptyState } from '@/components/EmptyState';
import { useCustomers } from '@/hooks/useCustomers';
import { theme } from '@/theme';

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
        {/* ── HEADER ── */}
        <View style={styles.header}>
          <Text style={styles.title}>Fiados</Text>
          <TouchableOpacity
            style={styles.fab}
            onPress={() => router.push('/customers/new')}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* ── SUMMARY ── */}
        {!loading && customers.length > 0 && (
          <View style={[styles.summaryCard, totalDebt > 0 ? styles.summaryCardDebt : styles.summaryCardOk]}>
            <View style={styles.summaryLeft}>
              <Text style={[styles.summaryAmount, totalDebt > 0 ? styles.amountDanger : styles.amountOk]}>
                ${totalDebt.toLocaleString('es-AR')}
              </Text>
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
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  fab: {
    backgroundColor: theme.colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 3,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
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
  summaryAmount: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  summaryMainLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  summarySep: {
    width: 1,
    height: 36,
    backgroundColor: theme.colors.divider,
    marginHorizontal: 16,
  },
  summaryRight: { alignItems: 'flex-end' },
  summaryStatLine: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  summaryStatSub: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.muted,
    marginTop: 2,
  },
  amountDanger: { color: theme.colors.error },
  amountOk: { color: theme.colors.success },
  loader: { marginTop: 40 },
  list: { paddingBottom: 20 },
});
