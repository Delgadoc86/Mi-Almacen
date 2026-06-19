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
import { ScreenContainer } from '@/components/ScreenContainer';
import { SearchBar } from '@/components/SearchBar';
import { CustomerCard } from '@/components/CustomerCard';
import { EmptyState } from '@/components/EmptyState';
import { useCustomers } from '@/hooks/useCustomers';
import { theme } from '@/theme';

export default function CustomersScreen() {
  const router = useRouter();
  const { customers, loading } = useCustomers();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => c.name.toLowerCase().includes(q));
  }, [customers, search]);

  const totalDebt = useMemo(() => customers.reduce((sum, c) => sum + c.balance, 0), [customers]);
  const debtorCount = useMemo(() => customers.filter((c) => c.balance > 0).length, [customers]);
  const clearCount = customers.length - debtorCount;

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Fiados</Text>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/customers/new')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {!loading && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryAmount, totalDebt > 0 && styles.amountDanger]}>
              ${totalDebt.toLocaleString('es-AR')}
            </Text>
            <Text style={styles.summaryLabel}>Pendiente</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryCount, debtorCount > 0 && styles.amountDanger]}>
              {debtorCount}
            </Text>
            <Text style={styles.summaryLabel}>{debtorCount === 1 ? 'debe' : 'deben'}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryCount, clearCount > 0 && styles.amountOk]}>
              {clearCount}
            </Text>
            <Text style={styles.summaryLabel}>al día</Text>
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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  fab: {
    backgroundColor: theme.colors.primary,
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
    overflow: 'hidden',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  summaryCount: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
  },
  amountDanger: { color: theme.colors.error },
  amountOk: { color: theme.colors.success },
  summaryLabel: {
    fontSize: 11,
    color: theme.colors.muted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: theme.colors.divider,
    marginVertical: 10,
  },
  loader: {
    marginTop: 40,
  },
  list: {
    paddingBottom: 20,
  },
});
