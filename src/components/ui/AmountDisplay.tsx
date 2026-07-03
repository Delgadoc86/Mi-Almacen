import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { theme } from '@/theme';

type Size = 'md' | 'lg' | 'hero';
type Tone = 'default' | 'primary' | 'success' | 'danger' | 'muted';

type Props = {
  value: number;
  size?: Size;
  tone?: Tone;
  showSign?: boolean;
  style?: StyleProp<TextStyle>;
};

const FONT_SIZE_BY_SIZE: Record<Size, number> = {
  md: theme.font.h1,
  lg: theme.font.display,
  hero: theme.font.displayLg,
};

const COLOR_BY_TONE: Record<Tone, string> = {
  default: theme.colors.text,
  primary: theme.colors.primary,
  success: theme.colors.success,
  danger: theme.colors.error,
  muted: theme.colors.muted,
};

export function AmountDisplay({ value, size = 'md', tone = 'default', showSign = false, style }: Props) {
  const formatted = `$${Math.round(Math.abs(value)).toLocaleString('es-AR')}`;
  const sign = showSign && value !== 0 ? (value > 0 ? '+' : '-') : '';

  return (
    <Text
      style={[
        styles.base,
        { fontSize: FONT_SIZE_BY_SIZE[size], color: COLOR_BY_TONE[tone] },
        style,
      ]}
    >
      {sign}
      {formatted}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: theme.fontFamily.extrabold,
    letterSpacing: -0.5,
  },
});
