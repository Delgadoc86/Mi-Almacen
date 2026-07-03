import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '@/theme';
import type { IconName } from './types';

type Variant = 'error' | 'success' | 'warning' | 'info';

type Props = {
  variant: Variant;
  text: string;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
};

const VARIANT_STYLE: Record<Variant, { bg: string; border: string; text: string; icon: IconName }> = {
  error: {
    bg: theme.colors.dangerLight,
    border: theme.colors.dangerMid,
    text: theme.colors.error,
    icon: 'alert-circle',
  },
  success: {
    bg: theme.colors.successLight,
    border: theme.colors.successMid,
    text: theme.colors.success,
    icon: 'checkmark-circle',
  },
  warning: {
    bg: theme.colors.warningLight,
    border: theme.colors.warningBorder,
    text: theme.colors.warning,
    icon: 'warning',
  },
  info: {
    bg: theme.colors.primaryLight,
    border: theme.colors.primaryMid,
    text: theme.colors.primary,
    icon: 'information-circle',
  },
};

export function InlineMessage({ variant, text, icon, style }: Props) {
  const v = VARIANT_STYLE[variant];
  return (
    <View style={[styles.base, { backgroundColor: v.bg, borderColor: v.border }, style]}>
      <Ionicons name={icon ?? v.icon} size={18} color={v.text} />
      <Text style={[styles.text, { color: v.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 12,
  },
  text: {
    flex: 1,
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.caption,
    lineHeight: 18,
  },
});
