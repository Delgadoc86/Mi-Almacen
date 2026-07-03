import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '@/theme';
import { ConfirmDialog } from '@/components/ui';
import type { Movement } from '@/models';

const PAYMENT_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transf.',
  mercado_pago: 'MP / QR',
  otro: 'Otro',
};

type Props = {
  movement: Movement;
  onAnnul?: () => void;
};

function formatDate(ts: Movement['createdAt']): string {
  if (!ts || typeof ts.toDate !== 'function') return '—';
  const d = ts.toDate();
  return (
    d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) +
    ' ' +
    d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  );
}

export function MovementItem({ movement, onAnnul }: Props) {
  const [confirmVisible, setConfirmVisible] = useState(false);
  const isReversal = movement.type === 'reversal';
  const isFiado = movement.type === 'fiado';
  const isAnnulled = !!movement.annulled;
  const canAnnul = !isAnnulled && !isReversal && !!onAnnul;

  const typeLabel = isReversal
    ? 'Anulación'
    : isFiado
      ? 'Fiado'
      : movement.paymentMethod
        ? `Pago · ${PAYMENT_LABELS[movement.paymentMethod] ?? movement.paymentMethod}`
        : 'Pago';

  const tagStyle = isReversal ? styles.tagReversal : isFiado ? styles.tagFiado : styles.tagPago;

  const amountStyle = isAnnulled || isReversal ? styles.amountNeutral : isFiado ? styles.amountFiado : styles.amountPago;

  const amountPrefix = isReversal ? '' : isFiado ? '+' : '-';

  const descriptionText = isReversal
    ? (movement.description ?? 'Anulación de movimiento')
    : isFiado && movement.description
      ? movement.description
      : null;

  function handleConfirmAnnul() {
    setConfirmVisible(false);
    onAnnul?.();
  }

  return (
    <View style={[styles.item, isAnnulled && styles.itemAnnulled]}>
      {isAnnulled && (
        <Text style={styles.annulledBadge}>ANULADO</Text>
      )}
      <View style={styles.mainRow}>
        <View style={styles.left}>
          <Text style={[styles.typeTag, tagStyle]}>{typeLabel}</Text>
          <View style={styles.textBlock}>
            {descriptionText ? (
              <Text style={[styles.description, (isAnnulled || isReversal) && styles.textMuted]} numberOfLines={1}>
                {descriptionText}
              </Text>
            ) : null}
            <Text style={styles.date}>{formatDate(movement.createdAt)}</Text>
          </View>
        </View>
        <View style={styles.right}>
          <Text style={[styles.amount, amountStyle]}>
            {amountPrefix}${movement.amount.toLocaleString('es-AR')}
          </Text>
          <Text style={styles.balanceAfter}>
            Saldo: ${movement.balanceAfter.toLocaleString('es-AR')}
          </Text>
        </View>
        {canAnnul && (
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => setConfirmVisible(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="ellipsis-vertical" size={16} color={theme.colors.muted} />
          </TouchableOpacity>
        )}
      </View>
      <ConfirmDialog
        visible={confirmVisible}
        title="Anular movimiento"
        message="¿Anulás este movimiento? Se creará un movimiento inverso para corregir el saldo. Esta acción no se puede deshacer."
        confirmLabel="Anular"
        variant="destructive"
        onConfirm={handleConfirmAnnul}
        onCancel={() => setConfirmVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  itemAnnulled: {
    opacity: 0.55,
  },
  annulledBadge: {
    fontFamily: theme.fontFamily.extrabold,
    fontSize: 10,
    color: theme.colors.muted,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  mainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
    marginRight: 8,
  },
  typeTag: {
    fontFamily: theme.fontFamily.bold,
    fontSize: theme.font.micro,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
  },
  tagFiado: {
    backgroundColor: theme.colors.dangerMid,
    color: theme.colors.error,
  },
  tagPago: {
    backgroundColor: theme.colors.successMid,
    color: theme.colors.success,
  },
  tagReversal: {
    backgroundColor: theme.colors.divider,
    color: theme.colors.muted,
  },
  textBlock: {
    flex: 1,
  },
  description: {
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.body,
    color: theme.colors.text,
    marginBottom: 2,
  },
  textMuted: {
    color: theme.colors.muted,
  },
  date: {
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.micro,
    color: theme.colors.muted,
  },
  right: {
    alignItems: 'flex-end',
  },
  amount: {
    fontFamily: theme.fontFamily.extrabold,
    fontSize: theme.font.bodyLg,
    letterSpacing: -0.3,
  },
  amountFiado: {
    color: theme.colors.error,
  },
  amountPago: {
    color: theme.colors.success,
  },
  amountNeutral: {
    color: theme.colors.muted,
  },
  balanceAfter: {
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.micro,
    color: theme.colors.muted,
    marginTop: 2,
  },
  menuBtn: {
    paddingLeft: 10,
    alignSelf: 'center',
  },
});
