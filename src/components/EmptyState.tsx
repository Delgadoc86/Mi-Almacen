import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '@/theme';
import { Button, IconChip } from '@/components/ui';

type Props = {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ icon, title, subtitle, actionLabel, onAction }: Props) {
  return (
    <View style={styles.container}>
      <IconChip icon={icon} size="lg" tone="primary" />
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xxxl,
    paddingVertical: theme.spacing.huge + 8,
    gap: theme.spacing.sm,
  },
  title: {
    marginTop: theme.spacing.sm,
    fontFamily: theme.fontFamily.bold,
    fontSize: theme.font.h3,
    color: theme.colors.text,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  action: {
    marginTop: theme.spacing.md,
  },
});
