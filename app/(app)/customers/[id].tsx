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
import { Stack, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useCustomer } from '@/hooks/useCustomer';
import { useCustomerMovements } from '@/hooks/useCustomerMovements';
import { registerMovement } from '@/services/customers';
import { MovementItem } from '@/components/MovementItem';
import { theme } from '@/theme';
import type { MovementType } from '@/models';

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userProfile } = useAuth();
  const { customer, loading: customerLoading } = useCustomer(id ?? '');
  const { movements, loading: movementsLoading } = useCustomerMovements(id ?? '');

  const [activeForm, setActiveForm] = useState<MovementType | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
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
  }

  async function handleConfirm() {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      Alert.alert('Error', 'El monto debe ser mayor a 0.');
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
        description.trim() || undefined,
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

  return (
    <>
      {/* Override header title with customer name */}
      <Stack.Screen options={{ title: customer.name }} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Balance card */}
        <View style={[styles.balanceCard, hasDebt ? styles.balanceCardDebt : styles.balanceCardOk]}>
          {customer.phone ? <Text style={styles.phone}>{customer.phone}</Text> : null}
          <Text style={[styles.balanceAmount, hasDebt ? styles.textDebt : styles.textOk]}>
            ${customer.balance.toLocaleString('es-AR')}
          </Text>
          <Text style={[styles.balanceStatus, hasDebt ? styles.textDebt : styles.textOk]}>
            {hasDebt ? 'debe' : 'al día'}
          </Text>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.fiadoBtn]}
            onPress={() => openForm('fiado')}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnText}>Registrar fiado</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.pagoBtn, !hasDebt && styles.actionBtnDisabled]}
            onPress={() => hasDebt && openForm('pago')}
            activeOpacity={hasDebt ? 0.8 : 1}
          >
            <Text style={[styles.actionBtnText, !hasDebt && styles.actionBtnTextDisabled]}>
              Registrar cobro
            </Text>
          </TouchableOpacity>
        </View>

        {/* Inline form */}
        {activeForm !== null && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>
              {activeForm === 'fiado' ? 'Nuevo fiado' : 'Registrar cobro'}
            </Text>

            {activeForm === 'pago' && hasDebt && (
              <Text style={styles.formHint}>
                Máximo: ${customer.balance.toLocaleString('es-AR')}
              </Text>
            )}

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

            <Text style={styles.fieldLabel}>Descripción (opcional)</Text>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder="Ej: Pan, leche, yerba..."
              placeholderTextColor={theme.colors.muted}
              autoCapitalize="sentences"
              returnKeyType="done"
            />

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

        {/* Movement history */}
        <Text style={styles.historyTitle}>
          Historial{movements.length > 0 ? ` (últimos ${movements.length})` : ''}
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
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1.5,
  },
  balanceCardDebt: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FECACA',
  },
  balanceCardOk: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  phone: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1,
  },
  balanceStatus: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  textDebt: {
    color: theme.colors.error,
  },
  textOk: {
    color: theme.colors.success,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  fiadoBtn: {
    borderColor: theme.colors.error,
    backgroundColor: '#FFF5F5',
  },
  pagoBtn: {
    borderColor: theme.colors.success,
    backgroundColor: '#F0FDF4',
  },
  actionBtnDisabled: {
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  actionBtnTextDisabled: {
    color: theme.colors.muted,
  },
  formCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  formHint: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
  },
  formActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  confirmBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmFiado: {
    backgroundColor: theme.colors.error,
  },
  confirmPago: {
    backgroundColor: theme.colors.success,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  movementsLoader: {
    marginTop: 20,
  },
  emptyHistory: {
    fontSize: 14,
    color: theme.colors.muted,
    marginTop: 12,
  },
});
