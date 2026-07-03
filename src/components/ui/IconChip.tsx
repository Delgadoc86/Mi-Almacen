import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '@/theme';
import type { IconName, Tone } from './types';

type Size = 'sm' | 'md' | 'lg' | 'xl';

type Props = {
  icon: IconName;
  tone?: Tone;
  size?: Size;
  filled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

const ICON_SIZE_BY_CHIP_SIZE: Record<Size, number> = { sm: 16, md: 22, lg: 30, xl: 40 };

const TONE_COLORS: Record<Tone, { icon: string; light: string; filled: string }> = {
  primary: { icon: theme.colors.primary, light: theme.colors.primaryLight, filled: theme.colors.primary },
  success: { icon: theme.colors.success, light: theme.colors.successLight, filled: theme.colors.success },
  danger: { icon: theme.colors.error, light: theme.colors.dangerLight, filled: theme.colors.error },
  warning: { icon: theme.colors.warning, light: theme.colors.warningLight, filled: theme.colors.warning },
  accent: { icon: theme.colors.accent, light: theme.colors.accentLight, filled: theme.colors.accent },
  muted: { icon: theme.colors.muted, light: theme.colors.divider, filled: theme.colors.muted },
};

export function IconChip({ icon, tone = 'primary', size = 'md', filled = false, loading = false, style }: Props) {
  const colors = TONE_COLORS[tone];
  const dimension = theme.iconChipSize[size];
  const iconSize = ICON_SIZE_BY_CHIP_SIZE[size];

  return (
    <View
      style={[
        styles.base,
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
          backgroundColor: filled ? colors.filled : colors.light,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={filled ? '#FFFFFF' : colors.icon} />
      ) : (
        <Ionicons name={icon} size={iconSize} color={filled ? '#FFFFFF' : colors.icon} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
