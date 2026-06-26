import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/hooks/useAuth';
import { useCustomer } from '@/hooks/useCustomer';
import { useCustomerMovements } from '@/hooks/useCustomerMovements';
import { useCashSession } from '@/hooks/useCashSession';
import { registerMovement } from '@/services/customers';
import { MovementItem } from '@/components/MovementItem';
import { theme } from '@/theme';
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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── BALANCE CARD ── */}
        <View style={[styles.balanceCard, hasDebt ? styles.balanceCardDebt : styles.balanceCardOk]}>
          <Text style={[styles.balanceAmount, hasDebt ? styles.textDebt : styles.textOk]}>
            ${customer.balance.toLocaleString('es-AR')}
          </Text>
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

        {/* ── ACCIONES ── */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.fiadoBtn]}
            onPress={() => openForm('fiado')}
            activeOpacity={0.8}
          >
            <Text style={[styles.actionBtnText, styles.fiadoBtnText]}>+ Fiado</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.pagoBtn, !hasDebt && styles.actionBtnDisabled]}
            onPress={() => hasDebt && openForm('pago')}
            activeOpacity={hasDebt ? 0.8 : 1}
          >
            <Text style={[styles.actionBtnText, styles.pagoBtnText, !hasDebt && styles.actionBtnTextDisabled]}>
              Cobrar
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── FORMULARIO INLINE ── */}
        {activeForm !== null && (
          <View style={styles.formCard}>
            <Text style={styles.fieldLabel}>Monto *</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={theme.colors.muted}
              autoFocus
            />

            {activeForm === 'fiado' && (
              <>
                <Text style={styles.fieldLabel}>Descripción (opcional)</Text>
                <TextInput
                  style={styles.input}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Ej: pan, bebidas, mercadería"
                  placeholderTextColor={theme.colors.muted}
                  autoCapitalize="sentences"
                  returnKeyType="done"
                />
              </>
            )}

            {activeForm === 'pago' && (
              <>
                <Text style={styles.fieldLabel}>Método de cobro</Text>
                <View style={styles.paymentMethodRow}>
                  {PAYMENT_METHODS.map((m) => (
                    <TouchableOpacity
                      key={m.value}
                      style={[
                        styles.methodChip,
                        paymentMethod === m.value && styles.methodChipSelected,
                      ]}
                      onPress={() => setPaymentMethod(m.value)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.methodChipText,
                          paymentMethod === m.value && styles.methodChipTextSelected,
                        ]}
                      >
                        {m.label}
                      </Text>
                    </TouchableOpacity>
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
                onPress={handleConfirm}
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

        {/* ── HISTORIAL ── */}
        <Text style={styles.historyTitle}>
          Historial{movements.length > 0 ? ` · ${movements.length} movimientos` : ''}
        </Text>

        {movementsLoading ? (
          <ActivityIndicator color={theme.colors.primary} style={styles.movementsLoader} />
        ) : movements.length === 0 ? (
          <Text style={styles.emptyHistory}>Sin movimientos registrados.</Text>
        ) : (
          movements.map((m) => <MovementItem key={m.id} movement={m} />)
        )}
      </ScrollView>
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
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  scroll: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  balanceCard: {
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
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
  balanceAmount: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1.5,
    lineHeight: 54,
  },
  balanceStatus: {
    fontSize: 13,
    fontWeight: '700',
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
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  contactRef: {
    fontSize: 13,
    color: theme.colors.muted,
    fontStyle: 'italic',
    marginTop: 2,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
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
    fontSize: 15,
    fontWeight: '800',
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
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 13,
    fontSize: 17,
    color: theme.colors.text,
    fontWeight: '600',
  },
  formActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  confirmBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmFiado: { backgroundColor: theme.colors.error },
  confirmPago: { backgroundColor: theme.colors.success },
  btnDisabled: { opacity: 0.6 },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  paymentMethodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  cashNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cashNoticeOpen: {
    backgroundColor: theme.colors.successLight,
  },
  cashNoticeWarn: {
    backgroundColor: theme.colors.divider,
  },
  cashNoticeText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  methodChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  methodChipSelected: {
    borderColor: theme.colors.success,
    backgroundColor: theme.colors.successMid,
  },
  methodChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  methodChipTextSelected: {
    color: theme.colors.success,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  movementsLoader: { marginTop: 20 },
  emptyHistory: {
    fontSize: 14,
    color: theme.colors.muted,
    marginTop: 12,
  },
});
