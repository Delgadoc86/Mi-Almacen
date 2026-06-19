import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/theme';
import type { Movement } from '@/models';

type Props = {
  movement: Movement;
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

export function MovementItem({ movement }: Props) {
  const isFiado = movement.type === 'fiado';
  return (
    <View style={styles.item}>
      <View style={styles.left}>
        <Text style={[styles.typeTag, isFiado ? styles.tagFiado : styles.tagPago]}>
          {isFiado ? 'Fiado' : 'Pago'}
        </Text>
        <View style={styles.textBlock}>
          {movement.description ? (
            <Text style={styles.description} numberOfLines={1}>
              {movement.description}
            </Text>
          ) : null}
          <Text style={styles.date}>{formatDate(movement.createdAt)}</Text>
        </View>
      </View>
      <View style={styles.right}>
        <Text style={[styles.amount, isFiado ? styles.amountFiado : styles.amountPago]}>
          {isFiado ? '+' : '-'}${movement.amount.toLocaleString('es-AR')}
        </Text>
        <Text style={styles.balanceAfter}>
          Saldo: ${movement.balanceAfter.toLocaleString('es-AR')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
    marginRight: 12,
  },
  typeTag: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  tagFiado: {
    backgroundColor: '#FEE2E2',
    color: theme.colors.error,
  },
  tagPago: {
    backgroundColor: '#DCFCE7',
    color: theme.colors.success,
  },
  textBlock: {
    flex: 1,
  },
  description: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
    color: theme.colors.muted,
  },
  right: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
  },
  amountFiado: {
    color: theme.colors.error,
  },
  amountPago: {
    color: theme.colors.success,
  },
  balanceAfter: {
    fontSize: 11,
    color: theme.colors.muted,
    marginTop: 2,
  },
});
