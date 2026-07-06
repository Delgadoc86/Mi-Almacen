import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SearchBar } from '@/components/SearchBar';
import { EmptyState } from '@/components/EmptyState';
import { Chip, InlineMessage, ListRow } from '@/components/ui';
import { theme } from '@/theme';
import { listAdminBusinesses } from '@/services/admin';
import type { AdminBusinessListItem, AdminPlanKind } from '@/models';

type FilterValue = AdminPlanKind | 'all';

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'trial-active', label: 'Trial activo' },
  { value: 'trial-expired', label: 'Trial vencido' },
  { value: 'pro', label: 'Pro' },
  { value: 'readonly', label: 'Solo lectura' },
  { value: 'suspended', label: 'Suspendido' },
];

const BADGE_BY_KIND: Record<AdminPlanKind, { label: string; tone: 'success' | 'danger' | 'muted' }> = {
  'trial-active': { label: 'Trial', tone: 'muted' },
  'trial-expired': { label: 'Vencido', tone: 'danger' },
  pro: { label: 'Pro', tone: 'success' },
  readonly: { label: 'Solo lectura', tone: 'danger' },
  suspended: { label: 'Suspendido', tone: 'danger' },
  'no-plan': { label: 'Sin plan', tone: 'danger' },
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function AdminBusinessesScreen() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<AdminBusinessListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterValue>('all');

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await listAdminBusinesses({});
      setBusinesses(data);
    } catch {
      setError('No se pudo cargar la lista de negocios.');
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return businesses.filter((b) => {
      if (filter !== 'all' && b.kind !== filter) return false;
      if (!q) return true;
      return b.name.toLowerCase().includes(q) || b.email.toLowerCase().includes(q);
    });
  }, [businesses, search, filter]);

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <View style={styles.container}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar por nombre o email..." />

        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={(item) => item.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          renderItem={({ item }) => (
            <Chip
              label={item.label}
              active={filter === item.value}
              onPress={() => setFilter(item.value)}
              style={styles.filterChip}
            />
          )}
        />

        {loading ? (
          <ActivityIndicator style={styles.loader} color={theme.colors.primary} />
        ) : error ? (
          <InlineMessage variant="error" text={error} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="business-outline"
            title="Sin resultados"
            subtitle="Ningún negocio coincide con la búsqueda o el filtro."
          />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.businessId}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <ListRow
                title={item.name}
                subtitle={`${item.email || 'sin email'} · alta ${formatDate(item.createdAt)}`}
                badge={BADGE_BY_KIND[item.kind]}
                onPress={() => router.push(`/admin/business/${item.businessId}`)}
              />
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.lg },
  filterRow: { gap: 8, paddingBottom: theme.spacing.md },
  filterChip: { marginRight: 0 },
  loader: { marginTop: 40 },
  list: { paddingBottom: 60 },
});
