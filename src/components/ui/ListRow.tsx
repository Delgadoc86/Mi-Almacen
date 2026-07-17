import type { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '@/theme';
import { IconChip } from './IconChip';
import type { IconName, Tone } from './types';

type Badge = { label: string; tone: 'success' | 'warning' | 'danger' | 'muted' };

type Props = {
  icon?: IconName;
  iconTone?: Tone;
  iconLoading?: boolean;
  title: string;
  subtitle?: string;
  value?: string;
  valueTone?: Tone;
  badge?: Badge;
  onPress?: () => void;
  showChevron?: boolean;
  rightElement?: ReactNode;
};

const BADGE_COLORS: Record<Badge['tone'], { bg: string; text: string }> = {
  success: { bg: theme.colors.successMid, text: theme.colors.success },
  warning: { bg: theme.colors.warningLight, text: theme.colors.warning },
  danger: { bg: theme.colors.dangerMid, text: theme.colors.error },
  muted: { bg: theme.colors.divider, text: theme.colors.textSecondary },
};

const VALUE_COLOR: Record<Tone, string> = {
  primary: theme.colors.primary,
  success: theme.colors.success,
  danger: theme.colors.error,
  warning: theme.colors.warning,
  accent: theme.colors.accent,
  muted: theme.colors.muted,
};

export function ListRow({
  icon,
  iconTone = 'primary',
  iconLoading = false,
  title,
  subtitle,
  value,
  valueTone,
  badge,
  onPress,
  showChevron = true,
  rightElement,
}: Props) {
  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      style={styles.row}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {icon ? <IconChip icon={icon} tone={iconTone} size="md" loading={iconLoading} /> : null}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightElement ? (
        rightElement
      ) : (
        <View style={styles.right}>
          {badge ? (
            <View style={[styles.badge, { backgroundColor: BADGE_COLORS[badge.tone].bg }]}>
              <Text style={[styles.badgeText, { color: BADGE_COLORS[badge.tone].text }]}>
                {badge.label}
              </Text>
            </View>
          ) : null}
          {value ? (
            <Text
              style={[
                styles.value,
                { color: valueTone ? VALUE_COLOR[valueTone] : theme.colors.text },
              ]}
            >
              {value}
            </Text>
          ) : null}
        </View>
      )}
      {onPress && showChevron ? (
        <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
      ) : null}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.lg,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: theme.fontFamily.bold,
    fontSize: theme.font.bodyLg,
    color: theme.colors.text,
  },
  subtitle: {
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.caption,
    color: theme.colors.textSecondary,
  },
  right: {
    alignItems: 'flex-end',
    gap: 4,
  },
  value: {
    fontFamily: theme.fontFamily.extrabold,
    fontSize: theme.font.h3,
    letterSpacing: -0.3,
  },
  badge: {
    borderRadius: theme.radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: theme.fontFamily.extrabold,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
