import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, InlineMessage, ListRow } from '@/components/ui';
import type { Tone } from '@/components/ui';
import { theme } from '@/theme';
import { getAdminDashboard } from '@/services/admin';
import type { AdminDashboardCounts } from '@/models';

type StatDef = {
  key: keyof AdminDashboardCounts;
  label: string;
  tone: Tone;
};

// Partición completa de `businesses` — cada negocio cae en exactamente uno
// de estos 6 estados, así que las filas siempre suman el total de arriba.
// `pendingDeletionRequests` queda afuera a propósito: no es excluyente con
// los demás (un negocio Pro puede tener una solicitud de eliminación
// pendiente a la vez), se muestra solo en "Atención" si corresponde.
const PLAN_STATS: StatDef[] = [
  { key: 'pro', label: 'Pro', tone: 'success' },
  { key: 'trialActive', label: 'Trial activo', tone: 'primary' },
  { key: 'trialExpired', label: 'Trial vencido', tone: 'warning' },
  { key: 'readonly', label: 'Solo lectura', tone: 'warning' },
  { key: 'suspended', label: 'Suspendido', tone: 'danger' },
  { key: 'noPlan', label: 'Sin plan', tone: 'danger' },
];

// Derivados de adminBilling (administración comercial), no de `plan` — no
// suman al total de negocios (un negocio "al día" con vencimiento lejano no
// entra en ninguna de las tres), separados en su propia tarjeta.
const BILLING_STATS: StatDef[] = [
  { key: 'billingOverdue', label: 'Vencidos', tone: 'danger' },
  { key: 'billingDueThisWeek', label: 'Esta semana', tone: 'warning' },
  { key: 'billingNoData', label: 'Sin datos', tone: 'muted' },
];

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

  const attentionParts: string[] = [];
  if (counts) {
    if (counts.billingOverdue > 0) {
      attentionParts.push(`${counts.billingOverdue} ${counts.billingOverdue === 1 ? 'cobro vencido' : 'cobros vencidos'}`);
    }
    if (counts.trialExpired > 0) {
      attentionParts.push(`${counts.trialExpired} ${counts.trialExpired === 1 ? 'trial vencido' : 'trials vencidos'}`);
    }
    if (counts.suspended > 0) {
      attentionParts.push(`${counts.suspended} ${counts.suspended === 1 ? 'suspendido' : 'suspendidos'}`);
    }
    if (counts.pendingDeletionRequests > 0) {
      attentionParts.push(`${counts.pendingDeletionRequests} ${counts.pendingDeletionRequests === 1 ? 'solicitud de eliminación' : 'solicitudes de eliminación'}`);
    }
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
            {attentionParts.length > 0 && (
              <InlineMessage
                variant="warning"
                icon="alert-circle-outline"
                text={`Atención: ${attentionParts.join(' · ')}.`}
                style={styles.attentionBox}
              />
            )}

            <Text style={styles.totalLabel}>{counts.totalBusinesses} negocios en total</Text>
            <Card style={styles.summaryCard}>
              {PLAN_STATS.map((stat, i) => (
                <View key={stat.key}>
                  {i > 0 && <View style={styles.rowDivider} />}
                  <ListRow
                    title={stat.label}
                    value={String(counts[stat.key] ?? 0)}
                    valueTone={stat.tone}
                    showChevron={false}
                  />
                </View>
              ))}
            </Card>

            <Text style={styles.sectionLabel}>COBRO</Text>
            <Card style={styles.summaryCard}>
              {BILLING_STATS.map((stat, i) => (
                <View key={stat.key}>
                  {i > 0 && <View style={styles.rowDivider} />}
                  <ListRow
                    title={stat.label}
                    value={String(counts[stat.key] ?? 0)}
                    valueTone={stat.tone}
                    showChevron={false}
                  />
                </View>
              ))}
            </Card>
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
  attentionBox: { marginBottom: theme.spacing.lg },
  totalLabel: {
    fontFamily: theme.fontFamily.bold,
    fontSize: theme.font.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  summaryCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: theme.spacing.xl,
  },
  rowDivider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginHorizontal: theme.spacing.lg,
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
