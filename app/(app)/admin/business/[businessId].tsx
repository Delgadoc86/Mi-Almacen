import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Chip, InlineMessage, TextField, Toast } from '@/components/ui';
import { theme } from '@/theme';
import { getAdminBusinessDetail, changeAdminPlan } from '@/services/admin';
import type { AdminBusinessDetail, AdminChangePlanAction, AdminPlanKind } from '@/models';

const KIND_LABEL: Record<AdminPlanKind, string> = {
  'trial-active': 'Trial activo',
  'trial-expired': 'Trial vencido',
  pro: 'Pro',
  readonly: 'Solo lectura',
  suspended: 'Suspendido',
  'no-plan': 'Sin plan',
};

const KIND_COLOR: Record<AdminPlanKind, string> = {
  'trial-active': theme.colors.primary,
  'trial-expired': theme.colors.warning,
  pro: theme.colors.success,
  readonly: theme.colors.error,
  suspended: theme.colors.error,
  'no-plan': theme.colors.error,
};

const ACTION_LABEL: Record<AdminChangePlanAction, string> = {
  activate_pro: 'Activar Pro',
  extend_trial: 'Extender trial',
  set_readonly: 'Pasar a solo lectura',
  suspend: 'Suspender',
  reactivate: 'Reactivar',
};

const REASON_REQUIRED: Record<AdminChangePlanAction, boolean> = {
  activate_pro: false,
  extend_trial: true,
  set_readonly: true,
  suspend: true,
  reactivate: false,
};

const EXTEND_DAYS_OPTIONS = [1, 3, 7, 14, 30] as const;

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`;
}

export default function AdminBusinessDetailScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>();
  const [detail, setDetail] = useState<AdminBusinessDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pendingAction, setPendingAction] = useState<AdminChangePlanAction | null>(null);
  const [reason, setReason] = useState('');
  const [extendDays, setExtendDays] = useState<number>(7);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  const load = useCallback(async () => {
    if (!businessId) return;
    setError(null);
    try {
      const data = await getAdminBusinessDetail(businessId);
      setDetail(data);
    } catch {
      setError('No se pudo cargar el detalle de este negocio.');
    }
  }, [businessId]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  function openAction(action: AdminChangePlanAction) {
    setPendingAction(action);
    setReason('');
    setExtendDays(7);
    setFormError(null);
  }

  function closeAction() {
    if (submitting) return;
    setPendingAction(null);
  }

  async function handleConfirmAction() {
    if (!pendingAction || !businessId) return;
    const trimmedReason = reason.trim();
    if (REASON_REQUIRED[pendingAction] && !trimmedReason) {
      setFormError('Este motivo es obligatorio.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await changeAdminPlan({
        businessId,
        action: pendingAction,
        days: pendingAction === 'extend_trial' ? extendDays : undefined,
        reason: trimmedReason || undefined,
      });
      setPendingAction(null);
      setToastMessage(`${ACTION_LABEL[pendingAction]}: hecho.`);
      setToastVisible(true);
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo completar la acción.';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
        <ActivityIndicator style={styles.loader} color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  if (error || !detail) {
    return (
      <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
        <View style={styles.content}>
          <InlineMessage variant="error" text={error ?? 'Negocio no encontrado.'} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.name}>{detail.name}</Text>
        <Text style={[styles.kindBadge, { color: KIND_COLOR[detail.kind] }]}>{KIND_LABEL[detail.kind]}</Text>

        <Text style={styles.sectionLabel}>DATOS</Text>
        <Card style={styles.card}>
          <InfoRow label="Dueño / email" value={detail.ownerEmail || '—'} />
          <InfoRow label="UID" value={detail.businessId} mono />
          <InfoRow label="Fecha de alta" value={formatDate(detail.createdAt)} />
          <InfoRow label="Plan" value={detail.plan?.type === 'pro' ? 'Pro' : detail.plan?.type === 'trial' ? 'Trial' : '—'} />
          <InfoRow label="Estado" value={detail.plan?.status ?? '—'} />
          <InfoRow label="Trial vence" value={formatDate(detail.plan?.trialEndsAt ?? null)} />
          <InfoRow label="Pro activado" value={formatDate(detail.plan?.proActivatedAt ?? null)} />
        </Card>

        {detail.deletionRequestedAt ? (
          <InlineMessage
            variant="warning"
            icon="alert-circle-outline"
            text={`Solicitó eliminar su cuenta el ${formatDateTime(detail.deletionRequestedAt)}.`}
            style={styles.deletionNotice}
          />
        ) : null}

        <Text style={styles.sectionLabel}>ACCIONES</Text>
        <View style={styles.actionsGrid}>
          <Button label="Activar Pro" variant="outline" onPress={() => openAction('activate_pro')} style={styles.actionBtn} />
          <Button label="Extender trial" variant="outline" onPress={() => openAction('extend_trial')} style={styles.actionBtn} />
          <Button label="Solo lectura" variant="outline" onPress={() => openAction('set_readonly')} style={styles.actionBtn} />
          <Button label="Suspender" variant="danger" onPress={() => openAction('suspend')} style={styles.actionBtn} />
          <Button label="Reactivar" variant="outline" onPress={() => openAction('reactivate')} style={styles.actionBtn} />
        </View>

        <Text style={styles.sectionLabel}>HISTORIAL DE ACCIONES ADMIN</Text>
        {detail.auditLog.length === 0 ? (
          <Text style={styles.emptyHistory}>Todavía no hay acciones registradas para este negocio.</Text>
        ) : (
          <Card style={styles.card}>
            {detail.auditLog.map((entry, i) => (
              <View key={entry.id} style={[styles.historyRow, i > 0 && styles.historyRowBorder]}>
                <Text style={styles.historyAction}>{ACTION_LABEL[entry.action] ?? entry.action}</Text>
                {entry.reason ? <Text style={styles.historyReason}>{entry.reason}</Text> : null}
                <Text style={styles.historyDate}>{formatDateTime(entry.createdAt)}</Text>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>

      <Modal visible={pendingAction !== null} transparent animationType="fade" onRequestClose={closeAction}>
        <Pressable style={modalStyles.overlay} onPress={closeAction}>
          <Pressable style={modalStyles.card} onPress={(e) => e.stopPropagation()}>
            <Text style={modalStyles.title}>{pendingAction ? ACTION_LABEL[pendingAction] : ''}</Text>
            <Text style={modalStyles.message}>
              Se va a aplicar sobre &quot;{detail.name}&quot; y va a quedar registrado en el historial.
            </Text>

            {pendingAction === 'extend_trial' ? (
              <View style={modalStyles.daysRow}>
                {EXTEND_DAYS_OPTIONS.map((d) => (
                  <Chip key={d} label={`${d}d`} active={extendDays === d} onPress={() => setExtendDays(d)} />
                ))}
              </View>
            ) : null}

            {pendingAction && REASON_REQUIRED[pendingAction] ? (
              <TextField
                label="Motivo"
                value={reason}
                onChangeText={setReason}
                placeholder="Explicá el motivo..."
                multiline
                containerStyle={modalStyles.reasonField}
              />
            ) : null}

            {formError ? <Text style={modalStyles.error}>{formError}</Text> : null}

            <View style={modalStyles.actions}>
              <Button label="Cancelar" variant="ghost" onPress={closeAction} style={modalStyles.actionBtn} disabled={submitting} />
              <Button
                label="Confirmar"
                variant={pendingAction === 'suspend' ? 'danger' : 'primary'}
                onPress={handleConfirmAction}
                loading={submitting}
                style={modalStyles.actionBtn}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Toast visible={toastVisible} message={toastMessage} onHide={() => setToastVisible(false)} />
    </SafeAreaView>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, mono && styles.infoValueMono]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.xl, paddingBottom: 60 },
  loader: { marginTop: 60 },
  name: { fontFamily: theme.fontFamily.extrabold, fontSize: theme.font.h1, color: theme.colors.text, letterSpacing: -0.5 },
  kindBadge: { fontFamily: theme.fontFamily.bold, fontSize: theme.font.body, marginTop: 4, marginBottom: theme.spacing.xl },
  sectionLabel: {
    fontFamily: theme.fontFamily.bold, fontSize: theme.font.micro, color: theme.colors.muted,
    letterSpacing: 1.5, marginBottom: theme.spacing.md, marginTop: theme.spacing.lg,
  },
  card: { padding: theme.spacing.lg },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 8 },
  infoLabel: { fontFamily: theme.fontFamily.semibold, fontSize: theme.font.caption, color: theme.colors.textSecondary },
  infoValue: { flex: 1, textAlign: 'right', fontFamily: theme.fontFamily.bold, fontSize: theme.font.caption, color: theme.colors.text },
  infoValueMono: { fontFamily: theme.fontFamily.medium },
  deletionNotice: { marginTop: theme.spacing.lg },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: { flexGrow: 1 },
  emptyHistory: { fontFamily: theme.fontFamily.medium, fontSize: theme.font.caption, color: theme.colors.muted },
  historyRow: { paddingVertical: 10, gap: 3 },
  historyRowBorder: { borderTopWidth: 1, borderTopColor: theme.colors.divider },
  historyAction: { fontFamily: theme.fontFamily.bold, fontSize: theme.font.body, color: theme.colors.text },
  historyReason: { fontFamily: theme.fontFamily.medium, fontSize: theme.font.caption, color: theme.colors.textSecondary },
  historyDate: { fontFamily: theme.fontFamily.semibold, fontSize: theme.font.micro, color: theme.colors.muted },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(22, 33, 58, 0.45)', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%', maxWidth: 380, backgroundColor: theme.colors.surface, borderRadius: theme.radius.cardLg,
    padding: theme.spacing.xxl, ...theme.shadow.lg, shadowColor: '#16213A',
  },
  title: { fontFamily: theme.fontFamily.extrabold, fontSize: theme.font.h2, color: theme.colors.text, marginBottom: 8 },
  message: { fontFamily: theme.fontFamily.medium, fontSize: theme.font.body, color: theme.colors.textSecondary, lineHeight: 21, marginBottom: theme.spacing.lg },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: theme.spacing.lg },
  reasonField: { marginBottom: theme.spacing.md },
  error: { fontFamily: theme.fontFamily.medium, fontSize: theme.font.caption, color: theme.colors.error, marginBottom: theme.spacing.md },
  actions: { flexDirection: 'row', gap: 12, marginTop: theme.spacing.sm },
  actionBtn: { flex: 1 },
});
