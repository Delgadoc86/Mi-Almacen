import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCashSession } from '@/hooks/useCashSession';
import { useCashMovements } from '@/hooks/useCashMovements';
import { useAuth } from '@/hooks/useAuth';
import { annulCashMovement } from '@/services/cash';
import { theme } from '@/theme';
import { ConfirmDialog } from '@/components/ui';
import { EmptyState } from '@/components/EmptyState';
import type { CashMovement } from '@/models';

const PAYMENT_LABEL: Record<string, string> = {
  efectivo: 'Efectivo',
  mercado_pago: 'Mercado Pago',
  transferencia: 'Transferencia',
  otro: 'Otro',
};

function getMovHour(mov: CashMovement): string {
  if (!mov.createdAt?.toDate) return '--:--';
  return mov.createdAt.toDate().toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getMovSubtitle(mov: CashMovement): string {
  if (mov.isReversal) return 'Anulación de movimiento';
  if (mov.type === 'ingreso') {
    const method = mov.medioPago ? (PAYMENT_LABEL[mov.medioPago] ?? 'Otro') : 'Efectivo';
    return `Ingreso · ${method}`;
  }
  return mov.description ? `Gasto · ${mov.description}` : 'Gasto';
}

function MovementRow({
  movement,
  onAnnul,
}: {
  movement: CashMovement;
  onAnnul?: () => void;
}) {
  const [confirmVisible, setConfirmVisible] = useState(false);
  const isIngreso = movement.type === 'ingreso';
  const isAnnulled = !!movement.annulled;
  const isReversal = !!movement.isReversal;
  const canAnnul = !isAnnulled && !isReversal && !!onAnnul;

  const color =
    isAnnulled || isReversal
      ? theme.colors.muted
      : isIngreso
        ? theme.colors.success
        : theme.colors.error;

  const amountStr = isReversal
    ? '$' + Math.round(movement.amount).toLocaleString('es-AR')
    : (isIngreso ? '+' : '-') + '$' + Math.round(movement.amount).toLocaleString('es-AR');

  function handleConfirmAnnul() {
    setConfirmVisible(false);
    onAnnul?.();
  }

  return (
    <View style={[styles.movRow, isAnnulled && styles.movRowAnnulled]}>
      {isAnnulled && <Text style={styles.annulledBadge}>ANULADO</Text>}
      <View style={styles.movRowContent}>
        <View style={styles.movRowLeft}>
          <Text style={styles.movHour}>{getMovHour(movement)}</Text>
          <Text style={[styles.movSubtitle, { color }]} numberOfLines={1}>
            {getMovSubtitle(movement)}
          </Text>
          <Text style={[styles.movAmount, { color }]}>{amountStr}</Text>
        </View>
        {canAnnul && (
          <TouchableOpacity
            style={styles.movMenuBtn}
            onPress={() => setConfirmVisible(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={theme.colors.muted} />
          </TouchableOpacity>
        )}
      </View>
      <ConfirmDialog
        visible={confirmVisible}
        title="Anular movimiento"
        message="¿Anulás este movimiento? Se creará un movimiento inverso. Esta acción no se puede deshacer."
        confirmLabel="Anular"
        variant="destructive"
        onConfirm={handleConfirmAnnul}
        onCancel={() => setConfirmVisible(false)}
      />
    </View>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

export default function CashMovementsScreen() {
  const { session } = useCashSession();
  const { movements, loading } = useCashMovements(session?.id ?? null, 100);
  const { userProfile } = useAuth();

  async function handleAnnulMovement(movementId: string) {
    if (!userProfile?.businessId || !session?.id) return;
    try {
      await annulCashMovement(userProfile.businessId, session.id, movementId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo anular el movimiento.';
      Alert.alert('Error', msg);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  if (movements.length === 0) {
    return (
      <View style={styles.center}>
        <EmptyState
          icon="receipt-outline"
          title="Sin movimientos"
          subtitle="Registrá un ingreso o gasto para verlo acá."
        />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      data={movements}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <MovementRow
          movement={item}
          onAnnul={() => handleAnnulMovement(item.id)}
        />
      )}
      ItemSeparatorComponent={Separator}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        <Text style={styles.listCount}>
          {movements.length} {movements.length === 1 ? 'movimiento' : 'movimientos'}
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
  list: { flex: 1, backgroundColor: theme.colors.background },
  listContent: { paddingHorizontal: theme.spacing.xl, paddingBottom: 40 },
  listCount: {
    fontFamily: theme.fontFamily.bold,
    fontSize: theme.font.micro,
    color: theme.colors.muted,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    paddingVertical: theme.spacing.md,
  },
  movRow: {
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  movRowAnnulled: {
    opacity: 0.55,
  },
  annulledBadge: {
    fontFamily: theme.fontFamily.extrabold,
    fontSize: 10,
    color: theme.colors.muted,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  movRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  movRowLeft: {
    flex: 1,
  },
  movHour: { fontFamily: theme.fontFamily.medium, fontSize: theme.font.micro, color: theme.colors.muted, marginBottom: 4 },
  movSubtitle: { fontFamily: theme.fontFamily.semibold, fontSize: theme.font.bodyLg, marginBottom: 5 },
  movAmount: { fontFamily: theme.fontFamily.extrabold, fontSize: theme.font.h2, letterSpacing: -0.5 },
  movMenuBtn: {
    paddingLeft: 12,
    alignSelf: 'center',
  },
  separator: { height: 1, backgroundColor: theme.colors.divider },
});
