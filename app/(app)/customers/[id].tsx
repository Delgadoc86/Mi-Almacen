import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/hooks/useAuth';
import { useCustomer } from '@/hooks/useCustomer';
import { useCustomerMovements } from '@/hooks/useCustomerMovements';
import { useCashSession } from '@/hooks/useCashSession';
import { useWriteGuard } from '@/hooks/useWriteGuard';
import { registerMovement, annulMovement } from '@/services/customers';
import { MovementItem } from '@/components/MovementItem';
import { PlanRestrictionDialog } from '@/components/PlanRestrictionDialog';
import { theme } from '@/theme';
import { AmountDisplay, Chip, IconChip, TextField } from '@/components/ui';
import type { MovementType, PaymentMethod } from '@/models';

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'mercado_pago', label: 'Mercado Pago / QR' },
  { value: 'otro', label: 'Otro' },
];

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { userProfile } = useAuth();
  const { customer, loading: customerLoading } = useCustomer(id ?? '');
  const { movements, loading: movementsLoading } = useCustomerMovements(id ?? '');
  const { session } = useCashSession();
  const cajaAbierta = session?.status === 'open';
  const { requireWrite, restrictionMessage, dismissRestriction } = useWriteGuard();

  const [activeForm, setActiveForm] = useState<MovementType | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');
  const [saving, setSaving] = useState(false);

  function openForm(type: MovementType) {
    setActiveForm(type);
    setAmount('');
    setDescription('');
  }

  function closeForm() {
    setActiveForm(null);
    setAmount('');
    setDescription('');
    setPaymentMethod('efectivo');
  }

  async function handleAnnul(movementId: string) {
    if (!userProfile?.businessId || !id) return;
    try {
      await annulMovement(userProfile.businessId, id, movementId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo anular el movimiento.';
      Alert.alert('Error', msg);
    }
  }

  async function handleConfirm() {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      Alert.alert('Error', 'El monto debe ser mayor a 0.');
      return;
    }
    if (activeForm === 'pago' && customer && amountNum > customer.balance) {
      Alert.alert('Error', 'El pago no puede superar la deuda actual.');
      return;
    }
    if (!userProfile?.businessId || !id || !activeForm) return;

    setSaving(true);
    try {
      await registerMovement(
        userProfile.businessId,
        id,
        activeForm,
        amountNum,
        activeForm === 'fiado' ? (description.trim() || undefined) : undefined,
        activeForm === 'pago' ? paymentMethod : undefined,
        activeForm === 'pago' && cajaAbierta ? session!.id : undefined,
        activeForm === 'pago' ? customer?.name : undefined,
      );
      closeForm();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo registrar el movimiento.';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  }

  if (customerLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (!customer) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Cliente no encontrado.</Text>
      </View>
    );
  }

  const hasDebt = customer.balance > 0;
  const hasContact = !!(customer.phone || customer.reference);

  return (
    <>
      <Stack.Screen
        options={{
          title: customer.name,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push(`/customers/${id}/edit` as never)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ paddingRight: 4 }}
            >
              <Ionicons name="create-outline" size={22} color={theme.colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <KeyboardAvoidingView style={styles.flex} behavior="padding">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.balanceCard, hasDebt ? styles.balanceCardDebt : styles.balanceCardOk]}>
          <AmountDisplay value={customer.balance} size="hero" tone={hasDebt ? 'danger' : 'success'} />
          <Text style={[styles.balanceStatus, hasDebt ? styles.textDebt : styles.textOk]}>
            {hasDebt ? 'debe' : 'al día'}
          </Text>
          {hasContact && <View style={styles.contactDivider} />}
          {customer.phone ? (
            <Text style={styles.contactLine}>{customer.phone}</Text>
          ) : null}
          {customer.reference ? (
            <Text style={styles.contactRef}>{customer.reference}</Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.fiadoBtn]}
            onPress={() => requireWrite(() => openForm('fiado'))}
            activeOpacity={0.8}
          >
            <Text style={[styles.actionBtnText, styles.fiadoBtnText]}>+ Fiado</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.pagoBtn, !hasDebt && styles.actionBtnDisabled]}
            onPress={() => hasDebt && requireWrite(() => openForm('pago'))}
            activeOpacity={hasDebt ? 0.8 : 1}
          >
            <Text style={[styles.actionBtnText, styles.pagoBtnText, !hasDebt && styles.actionBtnTextDisabled]}>
              Cobrar
            </Text>
          </TouchableOpacity>
        </View>

        {activeForm !== null && (
          <View style={styles.formCard}>
            <TextField
              label="Monto *"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0"
              autoFocus
              containerStyle={styles.formField}
            />

            {activeForm === 'fiado' && (
              <TextField
                label="Descripción (opcional)"
                value={description}
                onChangeText={setDescription}
                placeholder="Ej: pan, bebidas, mercadería"
                autoCapitalize="sentences"
                returnKeyType="done"
                containerStyle={styles.formField}
              />
            )}

            {activeForm === 'pago' && (
              <>
                <Text style={styles.fieldLabel}>Método de cobro</Text>
                <View style={styles.paymentMethodRow}>
                  {PAYMENT_METHODS.map((m) => (
                    <Chip
                      key={m.value}
                      label={m.label}
                      active={paymentMethod === m.value}
                      onPress={() => setPaymentMethod(m.value)}
                    />
                  ))}
                </View>

                <View style={[styles.cashNotice, cajaAbierta ? styles.cashNoticeOpen : styles.cashNoticeWarn]}>
                  <Ionicons
                    name={cajaAbierta ? 'checkmark-circle-outline' : 'alert-circle-outline'}
                    size={14}
                    color={cajaAbierta ? theme.colors.success : theme.colors.muted}
                  />
                  <Text style={[styles.cashNoticeText, { color: cajaAbierta ? theme.colors.success : theme.colors.muted }]}>
                    {cajaAbierta
                      ? 'Se sumará a la caja abierta'
                      : 'No hay caja abierta · no se registrará en caja'}
                  </Text>
                </View>
              </>
            )}

            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={closeForm}
                disabled={saving}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  activeForm === 'fiado' ? styles.confirmFiado : styles.confirmPago,
                  saving && styles.btnDisabled,
                ]}
                onPress={() => requireWrite(handleConfirm)}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.confirmBtnText}>
                    {activeForm === 'fiado' ? 'Confirmar fiado' : 'Confirmar cobro'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Text style={styles.historyTitle}>
          Historial{movements.length > 0 ? ` · ${movements.length} movimientos` : ''}
        </Text>

        {movementsLoading ? (
          <ActivityIndicator color={theme.colors.primary} style={styles.movementsLoader} />
        ) : movements.length === 0 ? (
          <View style={styles.emptyHistory}>
            <IconChip icon="receipt-outline" size="sm" tone="muted" />
            <Text style={styles.emptyHistoryText}>Sin movimientos registrados.</Text>
          </View>
        ) : (
          movements.map((m) => (
            <MovementItem
              key={m.id}
              movement={m}
              onAnnul={() => handleAnnul(m.id)}
              requireWrite={requireWrite}
            />
          ))
        )}
      </ScrollView>
      </KeyboardAvoidingView>
      <PlanRestrictionDialog message={restrictionMessage} onDismiss={dismissRestriction} />
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  notFound: {
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.bodyLg,
    color: theme.colors.textSecondary,
  },
  flex: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.xl,
    paddingBottom: 120,
  },
  balanceCard: {
    borderRadius: theme.radius.cardLg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    borderWidth: 1.5,
  },
  balanceCardDebt: {
    backgroundColor: theme.colors.dangerLight,
    borderColor: theme.colors.dangerMid,
  },
  balanceCardOk: {
    backgroundColor: theme.colors.successLight,
    borderColor: theme.colors.successMid,
  },
  balanceStatus: {
    fontFamily: theme.fontFamily.bold,
    fontSize: theme.font.caption,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  textDebt: { color: theme.colors.error },
  textOk: { color: theme.colors.success },
  contactDivider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    alignSelf: 'stretch',
    marginTop: 14,
    marginBottom: 10,
  },
  contactLine: {
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.body,
    color: theme.colors.textSecondary,
  },
  contactRef: {
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.caption,
    color: theme.colors.muted,
    fontStyle: 'italic',
    marginTop: 2,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: theme.spacing.lg,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.radius.button,
    alignItems: 'center',
  },
  fiadoBtn: {
    backgroundColor: theme.colors.dangerMid,
  },
  pagoBtn: {
    backgroundColor: theme.colors.successMid,
  },
  actionBtnDisabled: {
    backgroundColor: theme.colors.divider,
  },
  actionBtnText: {
    fontFamily: theme.fontFamily.extrabold,
    fontSize: theme.font.body,
    letterSpacing: -0.2,
  },
  fiadoBtnText: {
    color: theme.colors.error,
  },
  pagoBtnText: {
    color: theme.colors.success,
  },
  actionBtnTextDisabled: {
    color: theme.colors.muted,
  },
  formCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
    ...theme.shadow.sm,
  },
  formField: {
    marginBottom: theme.spacing.md,
  },
  fieldLabel: {
    fontFamily: theme.fontFamily.semibold,
    fontSize: theme.font.caption,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  formActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: theme.spacing.md,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  cancelBtnText: {
    fontFamily: theme.fontFamily.semibold,
    fontSize: theme.font.caption,
    color: theme.colors.textSecondary,
  },
  confirmBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  confirmFiado: { backgroundColor: theme.colors.error },
  confirmPago: { backgroundColor: theme.colors.success },
  btnDisabled: { opacity: 0.6 },
  confirmBtnText: {
    fontFamily: theme.fontFamily.bold,
    fontSize: theme.font.caption,
    color: '#fff',
  },
  paymentMethodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    marginBottom: theme.spacing.md,
  },
  cashNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: theme.radius.sm,
  },
  cashNoticeOpen: {
    backgroundColor: theme.colors.successLight,
  },
  cashNoticeWarn: {
    backgroundColor: theme.colors.divider,
  },
  cashNoticeText: {
    fontFamily: theme.fontFamily.semibold,
    fontSize: theme.font.micro,
    flex: 1,
  },
  historyTitle: {
    fontFamily: theme.fontFamily.bold,
    fontSize: theme.font.body,
    color: theme.colors.text,
    marginBottom: 4,
  },
  movementsLoader: { marginTop: 20 },
  emptyHistory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: theme.spacing.md,
  },
  emptyHistoryText: {
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.body,
    color: theme.colors.muted,
  },
});
