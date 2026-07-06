import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/theme';
import { Button, IconChip } from '@/components/ui';

type Props = {
  onRetry: () => void;
  retrying?: boolean;
  title?: string;
  subtitle?: string;
  // RootGuard la usa antes de que exista cualquier navegación (pantalla
  // completa, con su propio fondo); las pantallas de tabs la insertan dentro
  // de un layout que ya tiene SafeAreaView/fondo propio (solo ocupa el
  // espacio disponible, como EmptyState).
  fullScreen?: boolean;
};

const DEFAULT_TITLE = 'No pudimos conectar con el servidor';
const DEFAULT_SUBTITLE = 'Revisá tus datos móviles o Wifi e intentá de nuevo.';

export function ConnectionErrorScreen({
  onRetry,
  retrying = false,
  title = DEFAULT_TITLE,
  subtitle = DEFAULT_SUBTITLE,
  fullScreen = false,
}: Props) {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <IconChip icon="cloud-offline-outline" size="lg" tone="warning" />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <Button
        label="Reintentar"
        icon="refresh-outline"
        variant="outline"
        onPress={onRetry}
        loading={retrying}
        style={styles.action}
      />
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
  fullScreen: {
    backgroundColor: theme.colors.background,
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
    maxWidth: 280,
  },
  action: {
    marginTop: theme.spacing.md,
  },
});
