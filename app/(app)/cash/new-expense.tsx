import { useRef, useState } from 'react';
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
import { useAuth } from '@/hooks/useAuth';
import { useCashSession } from '@/hooks/useCashSession';
import { addCashMovement } from '@/services/cash';
import { theme } from '@/theme';
import { InlineMessage, TextField } from '@/components/ui';

export default function NewExpenseScreen() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const { session } = useCashSession();
  const descriptionRef = useRef<TextInput>(null);

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const parsedAmount = parseInt(amount.replace(/\D/g, '') || '0', 10);
  const canSave = parsedAmount > 0 && !saving;

  async function handleSave() {
    if (parsedAmount <= 0) {
      setError('Ingresá un monto mayor a $0.');
      return;
    }
    if (!description.trim()) {
      setError('Ingresá una descripción del gasto.');
      descriptionRef.current?.focus();
      return;
    }
    if (!userProfile?.businessId || !session?.id) {
      setError('No hay una caja abierta.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await addCashMovement(userProfile.businessId, session.id, {
        type: 'egreso',
        amount: parsedAmount,
        description: description.trim(),
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
            returnKeyType="next"
            onSubmitEditing={() => descriptionRef.current?.focus()}
          />
        </View>

        <TextField
          ref={descriptionRef}
          label="¿En qué se gastó? *"
          value={description}
          onChangeText={(t) => { setDescription(t); setError(''); }}
          placeholder="Ej: proveedor, flete, limpieza, reposición..."
          autoCapitalize="sentences"
          returnKeyType="done"
          onSubmitEditing={handleSave}
          containerStyle={styles.field}
        />

        {error ? <InlineMessage variant="error" text={error} style={styles.field} /> : null}

        <TouchableOpacity
          style={[styles.saveBtn, !canSave && styles.btnDisabled]}
          onPress={handleSave}
          disabled={!canSave}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>GUARDAR GASTO</Text>
          )}
        </TouchableOpacity>
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
    backgroundColor: theme.colors.dangerLight,
    borderWidth: 1.5,
    borderColor: theme.colors.dangerMid,
    borderRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 12,
    marginBottom: theme.spacing.xxl,
  },
  currencySign: {
    fontFamily: theme.fontFamily.extrabold,
    fontSize: theme.font.display,
    color: theme.colors.error,
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    fontFamily: theme.fontFamily.extrabold,
    fontSize: theme.font.displayLg,
    color: theme.colors.error,
    padding: 0,
  },
  field: {
    marginBottom: theme.spacing.xl,
  },
  saveBtn: {
    backgroundColor: theme.colors.error,
    borderRadius: theme.radius.button,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    ...theme.shadow.lg,
    shadowColor: theme.colors.error,
  },
  saveBtnText: {
    color: '#fff',
    fontFamily: theme.fontFamily.extrabold,
    fontSize: theme.font.bodyLg,
    letterSpacing: 0.5,
  },
  btnDisabled: { opacity: 0.4, shadowOpacity: 0, elevation: 0 },
});
