import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useCashHistory } from '@/hooks/useCashHistory';
import { theme } from '@/theme';
import { AmountDisplay, Card } from '@/components/ui';
import { EmptyState } from '@/components/EmptyState';
import type { CashSession } from '@/models';

function formatARS(amount: number): string {
  return '$' + Math.round(amount).toLocaleString('es-AR');
}

function formatDateTime(date: Date): string {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const h = date.getHours().toString().padStart(2, '0');
  const min = date.getMinutes().toString().padStart(2, '0');
  return `${d}/${m} · ${h}:${min}`;
}

function formatDuration(from: Date, to: Date): string {
  const diffMs = Math.max(0, to.getTime() - from.getTime());
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}

function getSaldoFinal(s: CashSession): number {
  return s.openingBalance + s.summary.totalIngresos - s.summary.totalEgresos;
}

function SessionCard({ session, number }: { session: CashSession; number: number }) {
  const isOpen = session.status === 'open';
  const openedAt = session.createdAt?.toDate?.();
  const closedAt = session.closedAt?.toDate?.();
  const saldoFinal = getSaldoFinal(session);

  return (
    <Card style={[styles.card, isOpen && styles.cardOpen]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardNumber}>Caja #{number}</Text>
        <View style={[styles.badge, isOpen ? styles.badgeOpen : styles.badgeClosed]}>
          <Text style={[styles.badgeText, isOpen ? styles.badgeTextOpen : styles.badgeTextClosed]}>
            {isOpen ? 'Abierta' : 'Cerrada'}
          </Text>
        </View>
      </View>

      <View style={styles.infoBlock}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Inicio</Text>
          <Text style={styles.infoValue}>{openedAt ? formatDateTime(openedAt) : '—'}</Text>
        </View>
        {closedAt && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Cierre</Text>
            <Text style={styles.infoValue}>{formatDateTime(closedAt)}</Text>
          </View>
        )}
        {openedAt && closedAt && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Duración</Text>
            <Text style={styles.infoValue}>{formatDuration(openedAt, closedAt)}</Text>
          </View>
        )}
        {isOpen && openedAt && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tiempo abierta</Text>
            <Text style={[styles.infoValue, { color: theme.colors.success }]}>
              {formatDuration(openedAt, new Date())}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.divider} />

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Saldo inicial</Text>
          <Text style={styles.statValue}>{formatARS(session.openingBalance)}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Movimientos</Text>
          <Text style={styles.statValue}>{session.summary.movementsCount}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>{isOpen ? 'Saldo actual' : 'Saldo final'}</Text>
          <AmountDisplay value={saldoFinal} size="md" tone={saldoFinal < 0 ? 'danger' : 'default'} style={styles.statValueFinal} />
        </View>
      </View>
    </Card>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

export default function CashHistoryScreen() {
  const { sessions, loading } = useCashHistory(100);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  if (sessions.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <EmptyState
          icon="time-outline"
          title="Sin historial"
          subtitle="Las cajas cerradas van a aparecer acá."
        />
      </View>
    );
  }

  const total = sessions.length;

  return (
    <FlatList
      style={styles.list}
      data={sessions}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) => (
        <SessionCard session={item} number={total - index} />
      )}
      ItemSeparatorComponent={Separator}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        <Text style={styles.listCount}>
          {total} {total === 1 ? 'caja' : 'cajas'} en el historial
        </Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  emptyWrap: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  list: { flex: 1, backgroundColor: theme.colors.background },
  listContent: { paddingHorizontal: theme.spacing.xl, paddingBottom: 40 },
  listCount: {
    fontFamily: theme.fontFamily.bold,
    fontSize: theme.font.micro,
    color: theme.colors.muted,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    paddingVertical: theme.spacing.lg,
  },

  card: {
    padding: theme.spacing.lg + 2,
  },
  cardOpen: {
    borderColor: theme.colors.successMid,
    backgroundColor: theme.colors.successLight,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  cardNumber: {
    fontFamily: theme.fontFamily.extrabold,
    fontSize: theme.font.bodyLg,
    color: theme.colors.text,
    letterSpacing: -0.3,
  },
  badge: {
    borderRadius: theme.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeOpen: { backgroundColor: theme.colors.successMid },
  badgeClosed: { backgroundColor: theme.colors.divider },
  badgeText: { fontFamily: theme.fontFamily.bold, fontSize: theme.font.caption },
  badgeTextOpen: { color: theme.colors.success },
  badgeTextClosed: { color: theme.colors.textSecondary },

  infoBlock: { gap: 6, marginBottom: theme.spacing.md },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: { fontFamily: theme.fontFamily.medium, fontSize: theme.font.caption, color: theme.colors.muted },
  infoValue: { fontFamily: theme.fontFamily.semibold, fontSize: theme.font.caption, color: theme.colors.text },

  divider: { height: 1, backgroundColor: theme.colors.divider, marginBottom: theme.spacing.md },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: { alignItems: 'flex-start', flex: 1 },
  statLabel: {
    fontFamily: theme.fontFamily.semibold,
    fontSize: theme.font.micro,
    color: theme.colors.muted,
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statValue: { fontFamily: theme.fontFamily.bold, fontSize: theme.font.body, color: theme.colors.text },
  statValueFinal: { fontSize: theme.font.h3 },

  separator: { height: theme.spacing.md },
});
