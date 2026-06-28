import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/hooks/useAuth';
import { useCashSession } from '@/hooks/useCashSession';
import { addCashMovement } from '@/services/cash';
import { theme } from '@/theme';
import type { PaymentMethod } from '@/models';

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'efectivo',      label: 'Efectivo',      icon: 'cash-outline' },
  { value: 'mercado_pago',  label: 'Mercado Pago',  icon: 'qr-code-outline' },
  { value: 'transferencia', label: 'Transferencia', icon: 'swap-horizontal-outline' },
  { value: 'otro',          label: 'Otro',          icon: 'ellipsis-horizontal-outline' },
];

export default function NewIncomeScreen() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const { session } = useCashSession();

  const [amount, setAmount] = useState('');
  const [medioPago, setMedioPago] = useState<PaymentMethod>('efectivo');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const parsedAmount = parseInt(amount.replace(/\D/g, '') || '0', 10);
  const canSave = parsedAmount > 0 && !saving;

  async function handleSave() {
    if (!canSave) { setError('Ingresá un monto mayor a $0.'); return; }
    if (!userProfile?.businessId || !session?.id) {
      setError('No hay una caja abierta.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await addCashMovement(userProfile.businessId, session.id, {
        type: 'ingreso',
        amount: parsedAmount,
        medioPago,
        description: description.trim() || undefined,
      });
      router.back();
    } catch {
      setError('No se pudo guardar. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior="padding"
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Monto */}
        <Text style={styles.sectionLabel}>Monto *</Text>
        <View style={styles.amountCard}>
          <Text style={styles.currencySign}>$</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={(t) => { setAmount(t.replace(/\D/g, '')); setError(''); }}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={theme.colors.muted}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />
        </View>

        {/* Medio de pago */}
        <Text style={styles.sectionLabel}>Medio de pago</Text>
        <View style={styles.chipsGrid}>
          {PAYMENT_METHODS.map((m) => {
            const active = medioPago === m.value;
            return (
              <TouchableOpacity
                key={m.value}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setMedioPago(m.value)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={m.icon as never}
                  size={20}
                  color={active ? '#fff' : theme.colors.textSecondary}
                />
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Descripción */}
        <Text style={styles.sectionLabel}>Descripción (opcional)</Text>
        <TextInput
          style={styles.descInput}
          value={description}
          onChangeText={setDescription}
          placeholder="Ej: venta del día, cobro mercadería..."
          placeholderTextColor={theme.colors.muted}
          autoCapitalize="sentences"
          maxLength={80}
          returnKeyType="done"
          onSubmitEditing={handleSave}
        />

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={15} color={theme.colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.saveBtn, !canSave && styles.btnDisabled]}
          onPress={handleSave}
          disabled={!canSave}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>GUARDAR INGRESO</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.background },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 100,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  amountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
  },
  currencySign: {
    fontSize: 36,
    fontWeight: '800',
    color: theme.colors.text,
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    fontSize: 48,
    fontWeight: '800',
    color: theme.colors.text,
    padding: 0,
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
    flex: 1,
    minWidth: '45%',
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  chipTextActive: { color: '#fff' },
  descInput: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: theme.colors.text,
    marginBottom: 20,
    minHeight: 52,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    backgroundColor: theme.colors.dangerLight,
    borderWidth: 1,
    borderColor: theme.colors.dangerMid,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.error,
    fontWeight: '500',
    lineHeight: 18,
  },
  saveBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  btnDisabled: { opacity: 0.4, shadowOpacity: 0, elevation: 0 },
});
