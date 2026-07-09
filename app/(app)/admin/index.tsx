import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, InlineMessage, ListRow } from '@/components/ui';
import { theme } from '@/theme';
import { getAdminDashboard } from '@/services/admin';
import type { AdminDashboardCounts } from '@/models';

type StatDef = {
  key: keyof AdminDashboardCounts;
  label: string;
  tone: 'primary' | 'success' | 'warning' | 'danger' | 'muted';
};

const STATS: StatDef[] = [
  { key: 'trialActive', label: 'Trials activos', tone: 'primary' },
  { key: 'trialExpired', label: 'Trials vencidos', tone: 'warning' },
  { key: 'pro', label: 'Pro activos', tone: 'success' },
  { key: 'readonly', label: 'Solo lectura', tone: 'warning' },
  { key: 'suspended', label: 'Suspendidos', tone: 'danger' },
  { key: 'pendingDeletionRequests', label: 'Solicitudes de eliminación', tone: 'muted' },
];

const COLOR_BY_TONE: Record<StatDef['tone'], string> = {
  primary: theme.colors.primary,
  success: theme.colors.success,
  warning: theme.colors.warning,
  danger: theme.colors.error,
  muted: theme.colors.textSecondary,
};

export default function AdminDashboardScreen() {
  const router = useRouter();
  const [counts, setCounts] = useState<AdminDashboardCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await getAdminDashboard();
      setCounts(data);
    } catch {
      setError('No se pudo cargar el resumen. Intentá de nuevo.');
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>
          Solo vos ves esta pantalla. No muestra caja, fiados ni datos financieros de ningún negocio.
        </Text>

        {loading ? (
          <ActivityIndicator style={styles.loader} color={theme.colors.primary} />
        ) : error ? (
          <InlineMessage variant="error" text={error} />
        ) : counts ? (
          <>
            <Text style={styles.totalLabel}>{counts.totalBusinesses} negocios en total</Text>
            <View style={styles.grid}>
              {STATS.map((stat) => (
                <Card key={stat.key} style={styles.statCard}>
                  <Text style={[styles.statValue, { color: COLOR_BY_TONE[stat.tone] }]}>
                    {counts[stat.key]}
                  </Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </Card>
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.sectionLabel}>GESTIÓN</Text>
        <Card style={styles.linkCard}>
          <ListRow
            icon="business-outline"
            iconTone="primary"
            title="Ver negocios"
            subtitle="Buscar, filtrar y administrar cuentas"
            onPress={() => router.push('/admin/businesses')}
          />
          <View style={styles.divider} />
          <ListRow
            icon="cloud-upload-outline"
            iconTone="primary"
            title="Configurar actualización"
            subtitle="Avisar a los usuarios de una nueva versión"
            onPress={() => router.push('/admin/update-config')}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.xl, paddingBottom: 60 },
  subtitle: {
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.caption,
    color: theme.colors.muted,
    marginBottom: theme.spacing.xl,
    lineHeight: 18,
  },
  loader: { marginTop: 40 },
  totalLabel: {
    fontFamily: theme.fontFamily.bold,
    fontSize: theme.font.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xxl,
  },
  statCard: {
    width: '47%',
    padding: theme.spacing.lg,
    alignItems: 'flex-start',
  },
  statValue: {
    fontFamily: theme.fontFamily.extrabold,
    fontSize: theme.font.h1,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontFamily: theme.fontFamily.semibold,
    fontSize: theme.font.caption,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  sectionLabel: {
    fontFamily: theme.fontFamily.bold,
    fontSize: theme.font.micro,
    color: theme.colors.muted,
    letterSpacing: 1.5,
    marginBottom: theme.spacing.md,
  },
  linkCard: { padding: 0, overflow: 'hidden' },
  divider: { height: 1, backgroundColor: theme.colors.divider },
});
