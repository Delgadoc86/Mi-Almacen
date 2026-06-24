import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '@/theme';
import type { Customer } from '@/models';

type Props = {
  customer: Customer;
  onPress: () => void;
};

export function CustomerCard({ customer, onPress }: Props) {
  const hasDebt = customer.balance > 0;
  const initial = customer.name.charAt(0).toUpperCase();

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.row}>
        <View style={[styles.avatar, hasDebt ? styles.avatarDebt : styles.avatarOk]}>
          <Text style={[styles.avatarText, hasDebt ? styles.avatarTextDebt : styles.avatarTextOk]}>
            {initial}
          </Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {customer.name}
          </Text>
          {customer.reference ? (
            <Text style={styles.sub} numberOfLines={1}>{customer.reference}</Text>
          ) : customer.phone ? (
            <Text style={styles.sub} numberOfLines={1}>{customer.phone}</Text>
          ) : null}
        </View>
        <View style={styles.balanceBlock}>
          <Text style={[styles.balance, hasDebt ? styles.balanceDebt : styles.balanceOk]}>
            ${customer.balance.toLocaleString('es-AR')}
          </Text>
          <View style={[styles.statusPill, hasDebt ? styles.pillDebt : styles.pillOk]}>
            <Text style={[styles.statusText, hasDebt ? styles.statusTextDebt : styles.statusTextOk]}>
              {hasDebt ? 'debe' : 'al día'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarDebt: {
    backgroundColor: theme.colors.dangerMid,
  },
  avatarOk: {
    backgroundColor: theme.colors.successMid,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  avatarTextDebt: {
    color: theme.colors.error,
  },
  avatarTextOk: {
    color: theme.colors.success,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  sub: {
    fontSize: 12,
    color: theme.colors.muted,
    fontWeight: '500',
  },
  balanceBlock: {
    alignItems: 'flex-end',
    gap: 4,
  },
  balance: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  balanceDebt: {
    color: theme.colors.error,
  },
  balanceOk: {
    color: theme.colors.success,
  },
  statusPill: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pillDebt: {
    backgroundColor: theme.colors.dangerLight,
  },
  pillOk: {
    backgroundColor: theme.colors.successLight,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statusTextDebt: {
    color: theme.colors.error,
  },
  statusTextOk: {
    color: theme.colors.success,
  },
});
