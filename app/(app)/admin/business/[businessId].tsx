import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AmountDisplay, Button, Card, Chip, InlineMessage, TextField, Toast } from '@/components/ui';
import { theme } from '@/theme';
import {
  getAdminBusinessDetail,
  changeAdminPlan,
  getAdminBillingDetail,
  recordAdminPayment,
  getAdminDeletionPreview,
  deleteAdminRequestedAccount,
} from '@/services/admin';
import type {
  AdminBusinessDetail,
  AdminChangePlanAction,
  AdminAuditAction,
  AdminPlanKind,
  AdminBillingDetail,
  AdminBillingMethod,
  AdminBillingStatus,
  AdminDeletionPreview,
} from '@/models';

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
  // Ámbar, no rojo: readonly es un estado esperable (trial vencido sin pago,
  // no una decisión punitiva) — rojo queda reservado para suspended, la
  // única acción realmente excepcional.
  readonly: theme.colors.warning,
  suspended: theme.colors.error,
  'no-plan': theme.colors.error,
};

const TRIAL_WARNING_DAYS = 5;

// Trial activo con pocos días restantes se pinta ámbar, igual que ya vencido
// — no es un `kind` nuevo (`classifyPlan` en functions/ sigue sin cambios,
// canWrite no se toca), es puramente una decisión de color en esta pantalla.
function getKindColor(kind: AdminPlanKind, trialEndsAtIso: string | null | undefined): string {
  if (kind === 'trial-active' && trialEndsAtIso) {
    const daysRemaining = Math.ceil((new Date(trialEndsAtIso).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    if (daysRemaining <= TRIAL_WARNING_DAYS) return theme.colors.warning;
  }
  return KIND_COLOR[kind];
}

// Cubre tanto acciones de plan como de billing — reusado en el historial de
// auditoría, que mezcla ambas (mismo `adminAuditLogs`, ver adminAuditAction).
const ACTION_LABEL: Record<AdminAuditAction, string> = {
  activate_pro: 'Activar Pro',
  extend_trial: 'Extender trial',
  set_readonly: 'Pasar a solo lectura',
  suspend: 'Suspender',
  reactivate: 'Reactivar',
  record_payment: 'Registrar pago',
  update_billing_notes: 'Actualizar nota de cobro',
  delete_account_requested_execute: 'Eliminación de cuenta: inicio',
  delete_account_completed: 'Cuenta eliminada definitivamente',
  delete_account_failed: 'Eliminación de cuenta: falló',
};

const DELETION_COUNT_ROWS: { key: keyof AdminDeletionPreview['counts']; label: string }[] = [
  { key: 'products', label: 'Productos' },
  { key: 'categories', label: 'Categorías' },
  { key: 'customers', label: 'Clientes' },
  { key: 'movements', label: 'Movimientos de fiado' },
  { key: 'cashSessions', label: 'Sesiones de caja' },
  { key: 'cashMovements', label: 'Movimientos de caja' },
  { key: 'billingPayments', label: 'Pagos registrados (billing)' },
];

const REASON_REQUIRED: Record<AdminChangePlanAction, boolean> = {
  activate_pro: false,
  extend_trial: true,
  set_readonly: true,
  suspend: true,
  reactivate: false,
};

const EXTEND_DAYS_OPTIONS = [1, 3, 7, 14, 30] as const;

// ── Libreta de cobros (adminBilling) — administración comercial interna,
// nunca acceso. `plan` sigue siendo la única fuente de verdad para eso.
const BILLING_METHOD_LABEL: Record<AdminBillingMethod, string> = {
  transferencia: 'Transferencia',
  efectivo: 'Efectivo',
  mercado_pago_link: 'Link de Mercado Pago',
  otro: 'Otro',
};

const BILLING_METHOD_OPTIONS = (Object.entries(BILLING_METHOD_LABEL) as [AdminBillingMethod, string][])
  .map(([value, label]) => ({ value, label }));

const PERIOD_OPTIONS: { value: 30 | 90 | 365 | null; label: string }[] = [
  { value: 30, label: '30 días' },
  { value: 90, label: '90 días' },
  { value: 365, label: '1 año' },
  { value: null, label: 'Sin período' },
];

const BILLING_STATUS_LABEL: Record<AdminBillingStatus, string> = {
  'no-data': 'Sin datos de cobro',
  ok: 'Al día',
  'due-soon': 'Vence pronto',
  overdue: 'Cobro pendiente',
};

const BILLING_STATUS_COLOR: Record<AdminBillingStatus, string> = {
  'no-data': theme.colors.muted,
  ok: theme.colors.success,
  'due-soon': theme.colors.warning,
  overdue: theme.colors.error,
};

const BILLING_DUE_SOON_MS = 7 * 24 * 60 * 60 * 1000;

// nextPaymentDueAt es puramente informativo (adminBilling) — esta función
// nunca decide canWrite ni se conecta con getPlanStatus/isPlanActiveValue.
function getBillingStatus(nextPaymentDueAt: string | null | undefined): AdminBillingStatus {
  if (!nextPaymentDueAt) return 'no-data';
  const dueMs = new Date(nextPaymentDueAt).getTime();
  if (!Number.isFinite(dueMs)) return 'no-data';
  const now = Date.now();
  if (dueMs < now) return 'overdue';
  if (dueMs - now <= BILLING_DUE_SOON_MS) return 'due-soon';
  return 'ok';
}

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
  const router = useRouter();
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

  const [billingDetail, setBillingDetail] = useState<AdminBillingDetail | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [billingError, setBillingError] = useState<string | null>(null);

  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<AdminBillingMethod>('transferencia');
  const [paymentPeriod, setPaymentPeriod] = useState<30 | 90 | 365 | null>(30);
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Eliminación definitiva de cuenta — acción excepcional y destructiva,
  // deliberadamente separada del flujo de acciones de plan de arriba. Dos
  // pasos dentro del mismo modal: 'preview' (revisión + conteos) y 'confirm'
  // (escribir el email exacto del dueño).
  const [deletionStep, setDeletionStep] = useState<'closed' | 'preview' | 'confirm'>('closed');
  const [deletionPreview, setDeletionPreview] = useState<AdminDeletionPreview | null>(null);
  const [deletionPreviewLoading, setDeletionPreviewLoading] = useState(false);
  const [deletionPreviewError, setDeletionPreviewError] = useState<string | null>(null);
  const [deletionConfirmText, setDeletionConfirmText] = useState('');
  const [deletionSubmitting, setDeletionSubmitting] = useState(false);
  const [deletionError, setDeletionError] = useState<string | null>(null);

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

  const loadBilling = useCallback(async () => {
    if (!businessId) return;
    setBillingError(null);
    try {
      const data = await getAdminBillingDetail(businessId);
      setBillingDetail(data);
    } catch {
      setBillingError('No se pudo cargar el estado de cobro.');
    }
  }, [businessId]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    loadBilling().finally(() => setBillingLoading(false));
  }, [loadBilling]);

  function openPaymentModal() {
    setPaymentAmount('');
    setPaymentMethod('transferencia');
    setPaymentPeriod(30);
    setPaymentNote('');
    setPaymentError(null);
    setPaymentModalVisible(true);
  }

  function closePaymentModal() {
    if (paymentSubmitting) return;
    setPaymentModalVisible(false);
  }

  async function handleSubmitPayment() {
    if (!businessId) return;
    const amountNum = parseFloat(paymentAmount.replace(',', '.'));
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setPaymentError('Ingresá un monto válido, mayor a 0.');
      return;
    }
    setPaymentSubmitting(true);
    setPaymentError(null);
    try {
      await recordAdminPayment({
        businessId,
        amount: amountNum,
        method: paymentMethod,
        periodDays: paymentPeriod ?? undefined,
        note: paymentNote.trim() || undefined,
      });
      setPaymentModalVisible(false);
      setToastMessage('Pago registrado.');
      setToastVisible(true);
      await loadBilling();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo registrar el pago.';
      setPaymentError(msg);
    } finally {
      setPaymentSubmitting(false);
    }
  }

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

  async function openDeletionPreview() {
    if (!businessId) return;
    setDeletionStep('preview');
    setDeletionPreview(null);
    setDeletionPreviewError(null);
    setDeletionConfirmText('');
    setDeletionError(null);
    setDeletionPreviewLoading(true);
    try {
      const preview = await getAdminDeletionPreview(businessId);
      setDeletionPreview(preview);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo cargar la revisión de eliminación.';
      setDeletionPreviewError(msg);
    } finally {
      setDeletionPreviewLoading(false);
    }
  }

  function closeDeletionModal() {
    if (deletionSubmitting) return;
    setDeletionStep('closed');
  }

  async function handleConfirmDeletion() {
    if (!businessId || !deletionPreview) return;
    setDeletionSubmitting(true);
    setDeletionError(null);
    try {
      await deleteAdminRequestedAccount({ businessId, confirmation: deletionConfirmText.trim() });
      setDeletionStep('closed');
      setToastMessage('Cuenta eliminada definitivamente.');
      setToastVisible(true);
      router.replace('/admin/businesses');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo eliminar la cuenta.';
      setDeletionError(msg);
    } finally {
      setDeletionSubmitting(false);
    }
  }

  const deletionConfirmMatches =
    !!deletionPreview?.ownerEmail &&
    deletionConfirmText.trim().toLowerCase() === deletionPreview.ownerEmail.trim().toLowerCase();

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
        <Text style={[styles.kindBadge, { color: getKindColor(detail.kind, detail.plan?.trialEndsAt) }]}>
          {KIND_LABEL[detail.kind]}
        </Text>

        <Text style={styles.sectionLabel}>DATOS</Text>
        <Card style={styles.card}>
          <InfoRow label="Dueño / email" value={detail.ownerEmail || '—'} />
          <InfoRow label="Fecha de alta" value={formatDate(detail.createdAt)} />
          {detail.plan?.type === 'trial' ? (
            <InfoRow label="Trial vence" value={formatDate(detail.plan?.trialEndsAt ?? null)} />
          ) : detail.plan?.type === 'pro' ? (
            <InfoRow label="Pro activado" value={formatDate(detail.plan?.proActivatedAt ?? null)} />
          ) : null}
        </Card>
        <Text style={styles.uidCaption}>UID: {detail.businessId}</Text>

        {detail.deletionRequestedAt ? (
          <InlineMessage
            variant="warning"
            icon="alert-circle-outline"
            text={`Solicitó eliminar su cuenta el ${formatDateTime(detail.deletionRequestedAt)}.`}
            style={styles.deletionNotice}
          />
        ) : null}

        <Text style={styles.sectionLabel}>COBRO</Text>
        <Card style={styles.card}>
          {billingLoading ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : billingError ? (
            <InlineMessage variant="error" text={billingError} />
          ) : (
            <>
              {(() => {
                const status = getBillingStatus(billingDetail?.billing?.nextPaymentDueAt);
                return (
                  <Text style={[styles.billingStatus, { color: BILLING_STATUS_COLOR[status] }]}>
                    {BILLING_STATUS_LABEL[status]}
                  </Text>
                );
              })()}
              <InfoRow label="Último pago" value={formatDate(billingDetail?.billing?.lastPaymentAt ?? null)} />
              <InfoRow label="Próximo cobro esperado" value={formatDate(billingDetail?.billing?.nextPaymentDueAt ?? null)} />
              <InfoRow
                label="Método"
                value={billingDetail?.billing?.paymentMethod ? BILLING_METHOD_LABEL[billingDetail.billing.paymentMethod] : '—'}
              />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Último monto</Text>
                {billingDetail?.billing?.lastAmount != null ? (
                  <AmountDisplay value={billingDetail.billing.lastAmount} size="sm" />
                ) : (
                  <Text style={styles.infoValue}>—</Text>
                )}
              </View>
              {billingDetail?.billing?.notes ? (
                <View style={styles.notesBlock}>
                  <Text style={styles.infoLabel}>Notas internas</Text>
                  <Text style={styles.notesText}>{billingDetail.billing.notes}</Text>
                </View>
              ) : null}
            </>
          )}
          <Button label="Registrar pago" variant="outline" onPress={openPaymentModal} style={styles.registerPaymentBtn} />
        </Card>

        {billingDetail && billingDetail.payments.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>ÚLTIMOS PAGOS</Text>
            <Card style={styles.card}>
              {billingDetail.payments.map((p, i) => (
                <View key={p.id} style={[styles.historyRow, i > 0 && styles.historyRowBorder]}>
                  <View style={styles.paymentAmountRow}>
                    <AmountDisplay value={p.amount} size="sm" />
                    <Text style={styles.paymentMethodText}>{BILLING_METHOD_LABEL[p.method]}</Text>
                  </View>
                  {p.note ? <Text style={styles.historyReason}>{p.note}</Text> : null}
                  <Text style={styles.historyDate}>
                    {formatDate(p.paidAt)}
                    {p.periodDays ? ` · ${p.periodDays === 365 ? '1 año' : `${p.periodDays} días`}` : ''}
                  </Text>
                </View>
              ))}
            </Card>
          </>
        ) : null}

        <Text style={styles.sectionLabel}>ACCIONES</Text>
        <View style={styles.actionsGrid}>
          <Button label="Activar Pro" variant="outline" onPress={() => openAction('activate_pro')} style={styles.actionBtn} />
          <Button label="Extender trial" variant="outline" onPress={() => openAction('extend_trial')} style={styles.actionBtn} />
          <Button label="Solo lectura" variant="outline" onPress={() => openAction('set_readonly')} style={styles.actionBtn} />
        </View>
        <View style={styles.actionsGridSecondary}>
          <Button label="Suspender" variant="danger" onPress={() => openAction('suspend')} style={styles.actionBtn} />
          <Button label="Reactivar" variant="outline" onPress={() => openAction('reactivate')} style={styles.actionBtn} />
        </View>

        <Text style={styles.sectionLabel}>AUDITORÍA</Text>
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

        {detail.deletionRequestedAt ? (
          <>
            <Text style={styles.sectionLabel}>ZONA DE ELIMINACIÓN</Text>
            <Card style={[styles.card, styles.dangerZoneCard]}>
              <Text style={styles.dangerZoneText}>
                Este cliente solicitó eliminar su cuenta. Esta acción borra todos sus datos de forma
                permanente y no se puede deshacer.
              </Text>
              <Button
                label="Eliminar cuenta definitivamente"
                variant="danger"
                onPress={openDeletionPreview}
                style={styles.dangerZoneBtn}
              />
            </Card>
          </>
        ) : null}
      </ScrollView>

      <Modal visible={deletionStep !== 'closed'} transparent animationType="fade" onRequestClose={closeDeletionModal}>
        <Pressable style={modalStyles.overlay} onPress={closeDeletionModal}>
          <Pressable style={modalStyles.card} onPress={(e) => e.stopPropagation()}>
            {deletionStep === 'preview' ? (
              <>
                <Text style={modalStyles.title}>Revisar antes de eliminar</Text>
                {deletionPreviewLoading ? (
                  <ActivityIndicator color={theme.colors.primary} style={styles.loader} />
                ) : deletionPreviewError ? (
                  <InlineMessage variant="error" text={deletionPreviewError} />
                ) : deletionPreview ? (
                  <>
                    <ScrollView style={modalStyles.previewScroll} showsVerticalScrollIndicator={false}>
                      <InfoRow label="Negocio" value={deletionPreview.name} />
                      <InfoRow label="Email" value={deletionPreview.ownerEmail || '—'} />
                      <InfoRow label="Solicitado" value={formatDateTime(deletionPreview.requestedAt)} />
                      <InfoRow label="Cuenta Auth" value={deletionPreview.authUserExists ? 'Existe' : 'No existe'} />
                      <Text style={styles.uidCaption}>businessId: {deletionPreview.businessId}</Text>

                      <Text style={[styles.infoLabel, styles.deleteCountsLabel]}>SE VA A BORRAR</Text>
                      {DELETION_COUNT_ROWS.map((row) => (
                        <InfoRow
                          key={row.key}
                          label={row.label}
                          value={String(deletionPreview.counts[row.key])}
                        />
                      ))}
                    </ScrollView>

                    <View style={modalStyles.actions}>
                      <Button label="Cancelar" variant="ghost" onPress={closeDeletionModal} style={modalStyles.actionBtn} />
                      <Button
                        label="Continuar"
                        variant="danger"
                        onPress={() => setDeletionStep('confirm')}
                        style={modalStyles.actionBtn}
                      />
                    </View>
                  </>
                ) : null}
              </>
            ) : (
              <>
                <Text style={modalStyles.title}>Confirmar eliminación</Text>
                <Text style={modalStyles.message}>
                  Escribí exactamente el email &quot;{deletionPreview?.ownerEmail}&quot; para confirmar. Esta
                  acción es permanente y no se puede deshacer.
                </Text>
                <TextField
                  label="Email de confirmación"
                  value={deletionConfirmText}
                  onChangeText={setDeletionConfirmText}
                  placeholder={deletionPreview?.ownerEmail ?? ''}
                  autoCapitalize="none"
                  containerStyle={modalStyles.reasonField}
                />
                {deletionError ? <Text style={modalStyles.error}>{deletionError}</Text> : null}
                <View style={modalStyles.actions}>
                  <Button
                    label="Volver"
                    variant="ghost"
                    onPress={() => setDeletionStep('preview')}
                    style={modalStyles.actionBtn}
                    disabled={deletionSubmitting}
                  />
                  <Button
                    label="Eliminar definitivamente"
                    variant="danger"
                    onPress={handleConfirmDeletion}
                    loading={deletionSubmitting}
                    disabled={!deletionConfirmMatches}
                    style={modalStyles.actionBtn}
                  />
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

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

      <Modal visible={paymentModalVisible} transparent animationType="fade" onRequestClose={closePaymentModal}>
        <Pressable style={modalStyles.overlay} onPress={closePaymentModal}>
          <Pressable style={modalStyles.card} onPress={(e) => e.stopPropagation()}>
            <Text style={modalStyles.title}>Registrar pago</Text>
            <Text style={modalStyles.message}>
              Queda como administración interna — no cambia el plan de &quot;{detail.name}&quot; automáticamente.
              Si corresponde, activá Pro o pasá a solo lectura por separado.
            </Text>

            <TextField
              label="Monto (ARS)"
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              keyboardType="decimal-pad"
              placeholder="0"
              containerStyle={modalStyles.reasonField}
            />

            <Text style={styles.infoLabel}>Método</Text>
            <View style={modalStyles.daysRow}>
              {BILLING_METHOD_OPTIONS.map((m) => (
                <Chip
                  key={m.value}
                  label={m.label}
                  active={paymentMethod === m.value}
                  onPress={() => setPaymentMethod(m.value)}
                />
              ))}
            </View>

            <Text style={styles.infoLabel}>Período</Text>
            <View style={modalStyles.daysRow}>
              {PERIOD_OPTIONS.map((opt) => (
                <Chip
                  key={opt.label}
                  label={opt.label}
                  active={paymentPeriod === opt.value}
                  onPress={() => setPaymentPeriod(opt.value)}
                />
              ))}
            </View>

            <TextField
              label="Nota (opcional)"
              value={paymentNote}
              onChangeText={setPaymentNote}
              placeholder="Ej: pagó por transferencia"
              multiline
              containerStyle={modalStyles.reasonField}
            />

            {paymentError ? <Text style={modalStyles.error}>{paymentError}</Text> : null}

            <View style={modalStyles.actions}>
              <Button
                label="Cancelar"
                variant="ghost"
                onPress={closePaymentModal}
                style={modalStyles.actionBtn}
                disabled={paymentSubmitting}
              />
              <Button
                label="Guardar"
                onPress={handleSubmitPayment}
                loading={paymentSubmitting}
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
  uidCaption: {
    fontFamily: theme.fontFamily.medium, fontSize: theme.font.micro, color: theme.colors.muted,
    marginTop: theme.spacing.sm, marginBottom: theme.spacing.lg,
  },
  deletionNotice: { marginTop: theme.spacing.lg },
  billingStatus: {
    fontFamily: theme.fontFamily.bold, fontSize: theme.font.body, marginBottom: theme.spacing.sm,
  },
  notesBlock: { marginTop: theme.spacing.sm, paddingTop: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.divider },
  notesText: { fontFamily: theme.fontFamily.medium, fontSize: theme.font.caption, color: theme.colors.text, marginTop: 4, lineHeight: 18 },
  registerPaymentBtn: { marginTop: theme.spacing.lg },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  // Separada visualmente del grupo constructivo de arriba (Activar Pro,
  // Extender trial, Solo lectura) — Suspender/Reactivar son la excepción,
  // no el flujo habitual.
  actionsGridSecondary: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    marginTop: theme.spacing.md, paddingTop: theme.spacing.md,
    borderTopWidth: 1, borderTopColor: theme.colors.divider,
  },
  actionBtn: { flexGrow: 1 },
  emptyHistory: { fontFamily: theme.fontFamily.medium, fontSize: theme.font.caption, color: theme.colors.muted },
  historyRow: { paddingVertical: 10, gap: 3 },
  historyRowBorder: { borderTopWidth: 1, borderTopColor: theme.colors.divider },
  historyAction: { fontFamily: theme.fontFamily.bold, fontSize: theme.font.body, color: theme.colors.text },
  historyReason: { fontFamily: theme.fontFamily.medium, fontSize: theme.font.caption, color: theme.colors.textSecondary },
  historyDate: { fontFamily: theme.fontFamily.semibold, fontSize: theme.font.micro, color: theme.colors.muted },
  paymentAmountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  paymentMethodText: { fontFamily: theme.fontFamily.semibold, fontSize: theme.font.body, color: theme.colors.textSecondary },
  dangerZoneCard: { borderWidth: 1.5, borderColor: theme.colors.dangerMid },
  dangerZoneText: {
    fontFamily: theme.fontFamily.medium, fontSize: theme.font.caption, color: theme.colors.textSecondary,
    lineHeight: 18, marginBottom: theme.spacing.lg,
  },
  dangerZoneBtn: { marginTop: 4 },
  deleteCountsLabel: { marginTop: theme.spacing.md, marginBottom: 4 },
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
  previewScroll: { maxHeight: 380 },
});
