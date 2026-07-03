import { useState } from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useCashSession } from '@/hooks/useCashSession';
import { addCashMovement } from '@/services/cash';
import { theme } from '@/theme';
import { Button, Chip, InlineMessage, TextField } from '@/components/ui';
import type { PaymentMethod } from '@/models';
import type { IconName } from '@/components/ui';

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: IconName }[] = [
  { value: 'efectivo', label: 'Efectivo', icon: 'cash-outline' },
  { value: 'mercado_pago', label: 'Mercado Pago', icon: 'qr-code-outline' },
  { value: 'transferencia', label: 'Transferencia', icon: 'swap-horizontal-outline' },
  { value: 'otro', label: 'Otro', icon: 'ellipsis-horizontal-outline' },
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
    <KeyboardAvoidingView style={styles.flex} behavior="padding">
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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

        <Text style={styles.sectionLabel}>Medio de pago</Text>
        <View style={styles.chipsGrid}>
          {PAYMENT_METHODS.map((m) => (
            <Chip
              key={m.value}
              label={m.label}
              icon={m.icon}
              active={medioPago === m.value}
              onPress={() => setMedioPago(m.value)}
              style={styles.gridChip}
            />
          ))}
        </View>

        <TextField
          label="Descripción (opcional)"
          value={description}
          onChangeText={setDescription}
          placeholder="Ej: venta del día, cobro mercadería..."
          autoCapitalize="sentences"
          returnKeyType="done"
          onSubmitEditing={handleSave}
          containerStyle={styles.field}
        />

        {error ? <InlineMessage variant="error" text={error} style={styles.field} /> : null}

        <Button label="GUARDAR INGRESO" onPress={handleSave} loading={saving} disabled={!canSave} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.background },
  content: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xxl,
    paddingBottom: 100,
  },
  sectionLabel: {
    fontFamily: theme.fontFamily.bold,
    fontSize: theme.font.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    letterSpacing: 0.2,
  },
  amountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 12,
    marginBottom: theme.spacing.xxl,
  },
  currencySign: {
    fontFamily: theme.fontFamily.extrabold,
    fontSize: theme.font.display,
    color: theme.colors.text,
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    fontFamily: theme.fontFamily.extrabold,
    fontSize: theme.font.displayLg,
    color: theme.colors.text,
    padding: 0,
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: theme.spacing.xxl,
  },
  gridChip: {
    flex: 1,
    minWidth: '45%',
    height: 48,
  },
  field: {
    marginBottom: theme.spacing.xl,
  },
});
