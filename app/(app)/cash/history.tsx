import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCashHistory } from '@/hooks/useCashHistory';
import { theme } from '@/theme';
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
    <View style={[styles.card, isOpen && styles.cardOpen]}>
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
          <Text style={[styles.statValue, styles.statValueFinal, saldoFinal < 0 && styles.textDanger]}>
            {formatARS(saldoFinal)}
          </Text>
        </View>
      </View>
    </View>
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
      <View style={styles.center}>
        <Ionicons name="time-outline" size={52} color={theme.colors.muted} />
        <Text style={styles.emptyTitle}>Sin historial</Text>
        <Text style={styles.emptySubtitle}>
          Las cajas cerradas van a aparecer acá.
        </Text>
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
    gap: 10,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  list: { flex: 1, backgroundColor: theme.colors.background },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  listCount: {
    fontSize: 12,
    color: theme.colors.muted,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    paddingVertical: 16,
  },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 18,
  },
  cardOpen: {
    borderColor: theme.colors.successMid,
    backgroundColor: theme.colors.successLight,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.3,
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeOpen: { backgroundColor: theme.colors.successMid },
  badgeClosed: { backgroundColor: theme.colors.divider },
  badgeText: { fontSize: 12, fontWeight: '700' },
  badgeTextOpen: { color: theme.colors.success },
  badgeTextClosed: { color: theme.colors.textSecondary },

  infoBlock: { gap: 6, marginBottom: 14 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: { fontSize: 13, color: theme.colors.muted, fontWeight: '500' },
  infoValue: { fontSize: 13, color: theme.colors.text, fontWeight: '600' },

  divider: { height: 1, backgroundColor: theme.colors.divider, marginBottom: 14 },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: { alignItems: 'flex-start', flex: 1 },
  statLabel: {
    fontSize: 11,
    color: theme.colors.muted,
    fontWeight: '600',
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statValue: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  statValueFinal: { fontSize: 16, fontWeight: '800', color: theme.colors.text },

  separator: { height: 12 },
  textDanger: { color: theme.colors.error },
});
