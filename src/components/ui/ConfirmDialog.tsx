import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/theme';
import { Button } from './Button';

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  loading?: boolean;
  onConfirm: () => void;
  // Opcional: cuando se omite, el diálogo muestra un único botón (onConfirm)
  // en vez de Cancelar/Confirmar — para avisos informativos, no decisiones
  // (ver PlanRestrictionDialog, Fase 4).
  onCancel?: () => void;
};

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  const dismiss = onCancel ?? onConfirm;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss}>
      <Pressable style={styles.overlay} onPress={dismiss}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.actions}>
            {onCancel ? (
              <Button label={cancelLabel} variant="ghost" onPress={onCancel} style={styles.actionBtn} />
            ) : null}
            <Button
              label={confirmLabel}
              variant={variant === 'destructive' ? 'danger' : 'primary'}
              onPress={onConfirm}
              loading={loading}
              style={styles.actionBtn}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(22, 33, 58, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.cardLg,
    padding: theme.spacing.xxl,
    ...theme.shadow.lg,
    shadowColor: '#16213A',
  },
  title: {
    fontFamily: theme.fontFamily.extrabold,
    fontSize: theme.font.h2,
    color: theme.colors.text,
    marginBottom: 8,
  },
  message: {
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.body,
    color: theme.colors.textSecondary,
    lineHeight: 21,
    marginBottom: theme.spacing.xxl,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
  },
});
