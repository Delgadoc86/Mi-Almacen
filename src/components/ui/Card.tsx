import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { theme } from '@/theme';

type Props = {
  children: ReactNode;
  variant?: 'default' | 'elevated';
  style?: StyleProp<ViewStyle>;
};

export function Card({ children, variant = 'default', style }: Props) {
  return <View style={[styles.base, variant === 'elevated' && styles.elevated, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.sm,
  },
  elevated: {
    borderRadius: theme.radius.cardLg,
    ...theme.shadow.md,
  },
});
