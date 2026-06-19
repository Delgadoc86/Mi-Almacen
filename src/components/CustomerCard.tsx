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
          {customer.phone ? <Text style={styles.phone}>{customer.phone}</Text> : null}
        </View>
        <View style={styles.balanceBlock}>
          <Text style={[styles.balance, hasDebt ? styles.balanceDebt : styles.balanceOk]}>
            ${customer.balance.toLocaleString('es-AR')}
          </Text>
          <Text style={[styles.statusTag, hasDebt ? styles.tagDebt : styles.tagOk]}>
            {hasDebt ? 'debe' : 'al día'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarDebt: {
    backgroundColor: theme.colors.dangerLight,
  },
  avatarOk: {
    backgroundColor: theme.colors.successLight,
  },
  avatarText: {
    fontSize: 17,
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
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  phone: {
    fontSize: 13,
    color: theme.colors.muted,
  },
  balanceBlock: {
    alignItems: 'flex-end',
    gap: 3,
  },
  balance: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  balanceDebt: {
    color: theme.colors.error,
  },
  balanceOk: {
    color: theme.colors.success,
  },
  statusTag: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tagDebt: {
    color: theme.colors.error,
  },
  tagOk: {
    color: theme.colors.success,
  },
});
