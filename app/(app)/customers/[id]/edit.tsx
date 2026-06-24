import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/hooks/useAuth';
import { useCustomer } from '@/hooks/useCustomer';
import { useCustomerMovements } from '@/hooks/useCustomerMovements';
import { updateCustomer, deleteCustomer } from '@/services/customers';
import { theme } from '@/theme';

export default function EditCustomerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { userProfile } = useAuth();
  const { customer, loading: customerLoading } = useCustomer(id ?? '');
  const { movements, loading: movementsLoading } = useCustomerMovements(id ?? '');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (customer) {
      setName(customer.name);
      setPhone(customer.phone ?? '');
      setReference(customer.reference ?? '');
    }
  }, [customer]);

  async function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('El nombre es obligatorio.');
      return;
    }
    if (!userProfile?.businessId || !id) return;
    setError('');
    setSaving(true);
    try {
      await updateCustomer(userProfile.businessId, id, {
        name: trimmedName,
        phone: phone.trim() || undefined,
        reference: reference.trim() || undefined,
      });
      router.back();
    } catch {
      setError('No se pudo guardar. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!userProfile?.businessId || !id) return;
    setDeleting(true);
    try {
      await deleteCustomer(userProfile.businessId, id);
      router.navigate('/customers');
    } catch {
      setError('No se pudo eliminar el cliente. Intentá de nuevo.');
      setDeleting(false);
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
  const canDelete = !movementsLoading && movements.length === 0;
  const hasMovements = !movementsLoading && movements.length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── INFO CARD ── */}
        <View style={[styles.infoCard, hasDebt ? styles.infoCardDebt : styles.infoCardOk]}>
          <Text style={styles.customerName} numberOfLines={2}>
            {customer.name}
          </Text>
          <View style={styles.infoRow}>
            <Text style={[styles.balanceText, hasDebt ? styles.textDebt : styles.textOk]}>
              ${customer.balance.toLocaleString('es-AR')} {hasDebt ? 'debe' : 'al día'}
            </Text>
            {!movementsLoading && (
              <Text style={styles.movementsText}>
                {movements.length === 0
                  ? 'Sin movimientos'
                  : `${movements.length} ${movements.length === 1 ? 'movimiento' : 'movimientos'}`}
              </Text>
            )}
          </View>
        </View>

        {/* ── NOTICE ── */}
        <View style={styles.noticeBox}>
          <Ionicons name="information-circle-outline" size={15} color={theme.colors.primary} />
          <Text style={styles.noticeText}>
            Los cambios se aplican únicamente al nombre y datos de contacto. El historial y los saldos no serán modificados.
          </Text>
        </View>

        {/* ── FORM ── */}
        <Text style={styles.fieldLabel}>Nombre *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={(t) => { setName(t); setError(''); }}
          placeholder="Ej: Juan Pérez"
          placeholderTextColor={theme.colors.muted}
          maxLength={60}
          autoCapitalize="words"
          returnKeyType="next"
        />

        <Text style={styles.fieldLabel}>Teléfono (opcional)</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="Ej: 11 2345-6789"
          placeholderTextColor={theme.colors.muted}
          keyboardType="phone-pad"
          maxLength={20}
          returnKeyType="next"
        />

        <Text style={styles.fieldLabel}>Referencia / nota (opcional)</Text>
        <TextInput
          style={styles.input}
          value={reference}
          onChangeText={setReference}
          placeholder="Ej: Doña Pocha, vecina de la esquina"
          placeholderTextColor={theme.colors.muted}
          maxLength={80}
          autoCapitalize="sentences"
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
          style={[styles.saveBtn, saving && styles.btnDisabled]}
          onPress={handleSave}
          disabled={saving || deleting}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Guardar cambios</Text>
          )}
        </TouchableOpacity>

        {/* ── ELIMINAR ── */}
        <Text style={styles.sectionLabel}>ELIMINAR CLIENTE</Text>

        {movementsLoading ? (
          <ActivityIndicator color={theme.colors.muted} style={styles.movementsLoader} />
        ) : hasMovements ? (
          <View style={styles.cannotDeleteBox}>
            <Ionicons name="lock-closed-outline" size={15} color={theme.colors.textSecondary} />
            <Text style={styles.cannotDeleteText}>
              Este cliente tiene {movements.length}{' '}
              {movements.length === 1 ? 'movimiento registrado' : 'movimientos registrados'} y no puede eliminarse.
            </Text>
          </View>
        ) : canDelete ? (
          <TouchableOpacity
            style={[styles.deleteBtn, deleting && styles.btnDisabled]}
            onPress={handleDelete}
            disabled={saving || deleting}
            activeOpacity={0.85}
          >
            {deleting ? (
              <ActivityIndicator color={theme.colors.error} size="small" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                <Text style={styles.deleteBtnText}>Eliminar cliente</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.background },
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
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 48,
  },

  // Info card
  infoCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    marginBottom: 14,
  },
  infoCardDebt: {
    backgroundColor: theme.colors.dangerLight,
    borderColor: theme.colors.dangerMid,
  },
  infoCardOk: {
    backgroundColor: theme.colors.successLight,
    borderColor: theme.colors.successMid,
  },
  customerName: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.5,
    marginBottom: 8,
    lineHeight: 34,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  balanceText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  textDebt: { color: theme.colors.error },
  textOk: { color: theme.colors.success },
  movementsText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.muted,
  },

  // Notice
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    backgroundColor: theme.colors.primaryMid,
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 24,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '500',
    lineHeight: 18,
  },

  // Form
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 7,
    letterSpacing: 0.2,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 16,
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

  // Save button
  saveBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
    minHeight: 54,
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  btnDisabled: { opacity: 0.5, shadowOpacity: 0, elevation: 0 },

  // Delete section
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.muted,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  movementsLoader: {
    marginVertical: 12,
  },
  cannotDeleteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cannotDeleteText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    lineHeight: 18,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: theme.colors.dangerMid,
    backgroundColor: theme.colors.dangerLight,
    minHeight: 54,
  },
  deleteBtnText: {
    color: theme.colors.error,
    fontSize: 16,
    fontWeight: '700',
  },
});
