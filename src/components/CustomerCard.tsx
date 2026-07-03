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
    borderRadius: theme.radius.card,
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: theme.iconChipSize.md,
    height: theme.iconChipSize.md,
    borderRadius: theme.iconChipSize.md / 2,
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
    fontFamily: theme.fontFamily.bold,
    fontSize: theme.font.bodyLg,
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
    fontFamily: theme.fontFamily.bold,
    fontSize: theme.font.bodyLg,
    color: theme.colors.text,
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  sub: {
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.micro,
    color: theme.colors.muted,
  },
  balanceBlock: {
    alignItems: 'flex-end',
    gap: 4,
  },
  balance: {
    fontFamily: theme.fontFamily.extrabold,
    fontSize: theme.font.h3,
    letterSpacing: -0.5,
  },
  balanceDebt: {
    color: theme.colors.error,
  },
  balanceOk: {
    color: theme.colors.success,
  },
  statusPill: {
    borderRadius: theme.radius.sm,
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
    fontFamily: theme.fontFamily.bold,
    fontSize: theme.font.micro,
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
