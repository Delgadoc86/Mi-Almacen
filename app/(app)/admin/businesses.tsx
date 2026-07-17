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

const BADGE_BY_KIND: Record<AdminPlanKind, { label: string; tone: 'success' | 'warning' | 'danger' | 'muted' }> = {
  'trial-active': { label: 'Trial', tone: 'muted' },
  'trial-expired': { label: 'Vencido', tone: 'warning' },
  pro: { label: 'Pro', tone: 'success' },
  // Ámbar, no rojo: es el estado esperable de un trial vencido sin pago, no
  // una decisión punitiva — rojo queda solo para "Suspendido".
  readonly: { label: 'Solo lectura', tone: 'warning' },
  suspended: { label: 'Suspendido', tone: 'danger' },
  'no-plan': { label: 'Sin plan', tone: 'danger' },
};

// Con pocos negocios el orden no importa; con 20-30 sí — lo que necesita
// una decisión (suspendido, sin plan, vencido, solo lectura) sube arriba,
// lo sano (Pro, trial en curso) queda abajo. Ordenamiento puramente local,
// no pide nada nuevo al servidor.
const KIND_PRIORITY: Record<AdminPlanKind, number> = {
  'no-plan': 0,
  suspended: 1,
  'trial-expired': 2,
  readonly: 3,
  'trial-active': 4,
  pro: 5,
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
    return businesses
      .filter((b) => {
        if (filter !== 'all' && b.kind !== filter) return false;
        if (!q) return true;
        return b.name.toLowerCase().includes(q) || b.email.toLowerCase().includes(q);
      })
      .sort((a, b) => KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind]);
  }, [businesses, search, filter]);

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <View style={styles.container}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar por nombre o email..." />

        <FlatList
          horizontal
          style={styles.filterList}
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

        {!loading && !error && businesses.length > 0 && (
          <Text style={styles.resultsCount}>
            {filtered.length} de {businesses.length} {businesses.length === 1 ? 'negocio' : 'negocios'}
          </Text>
        )}

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
            style={styles.resultsList}
            data={filtered}
            keyExtractor={(item) => item.businessId}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={styles.rowDivider} />}
            renderItem={({ item }) => (
              <ListRow
                icon={item.hasDeletionRequest ? 'alert-circle-outline' : undefined}
                iconTone="danger"
                title={item.name}
                subtitle={item.email || 'sin email'}
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
  // Sin esto, un <FlatList horizontal> dentro de una columna flex reclama
  // todo el espacio vertical sobrante del contenedor (aunque su contenido
  // real mida ~36px) — empuja el resto de la pantalla hacia abajo y deja
  // el hueco en blanco que se veía entre los chips y la lista de negocios.
  filterList: { flexGrow: 0, flexShrink: 0 },
  filterRow: { gap: 8, paddingBottom: theme.spacing.md },
  filterChip: { marginRight: 0 },
  resultsCount: {
    fontFamily: theme.fontFamily.semibold,
    fontSize: theme.font.micro,
    color: theme.colors.muted,
    marginBottom: theme.spacing.sm,
  },
  loader: { marginTop: 40 },
  resultsList: { flex: 1 },
  list: { paddingBottom: 60 },
  rowDivider: { height: 1, backgroundColor: theme.colors.divider },
});
