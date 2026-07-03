import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/hooks/useAuth';
import { useCustomer } from '@/hooks/useCustomer';
import { useCustomerMovements } from '@/hooks/useCustomerMovements';
import { updateCustomer, deleteCustomer } from '@/services/customers';
import { theme } from '@/theme';
import { AmountDisplay, Button, ConfirmDialog, InlineMessage, TextField } from '@/components/ui';

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
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);

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

  async function handleConfirmDelete() {
    if (!userProfile?.businessId || !id) return;
    setConfirmDeleteVisible(false);
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
    <KeyboardAvoidingView style={styles.flex} behavior="padding">
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.infoCard, hasDebt ? styles.infoCardDebt : styles.infoCardOk]}>
          <Text style={styles.customerName} numberOfLines={2}>
            {customer.name}
          </Text>
          <View style={styles.infoRow}>
            <View style={styles.balanceRow}>
              <AmountDisplay value={customer.balance} size="md" tone={hasDebt ? 'danger' : 'success'} />
              <Text style={[styles.balanceSuffix, hasDebt ? styles.textDebt : styles.textOk]}>
                {hasDebt ? 'debe' : 'al día'}
              </Text>
            </View>
            {!movementsLoading && (
              <Text style={styles.movementsText}>
                {movements.length === 0
                  ? 'Sin movimientos'
                  : `${movements.length} ${movements.length === 1 ? 'movimiento' : 'movimientos'}`}
              </Text>
            )}
          </View>
        </View>

        <InlineMessage
          variant="info"
          text="Los cambios se aplican únicamente al nombre y datos de contacto. El historial y los saldos no serán modificados."
          style={styles.notice}
        />

        <TextField
          label="Nombre *"
          value={name}
          onChangeText={(t) => { setName(t); setError(''); }}
          placeholder="Ej: Juan Pérez"
          autoCapitalize="words"
          returnKeyType="next"
          containerStyle={styles.field}
        />

        <TextField
          label="Teléfono (opcional)"
          value={phone}
          onChangeText={setPhone}
          placeholder="Ej: 11 2345-6789"
          keyboardType="phone-pad"
          returnKeyType="next"
          containerStyle={styles.field}
        />

        <TextField
          label="Referencia / nota (opcional)"
          value={reference}
          onChangeText={setReference}
          placeholder="Ej: Doña Pocha, vecina de la esquina"
          autoCapitalize="sentences"
          returnKeyType="done"
          onSubmitEditing={handleSave}
          containerStyle={styles.field}
        />

        {error ? <InlineMessage variant="error" text={error} style={styles.field} /> : null}

        <Button
          label="Guardar cambios"
          onPress={handleSave}
          loading={saving}
          disabled={deleting}
          style={styles.saveBtn}
        />

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
          <Button
            label="Eliminar cliente"
            variant="danger"
            icon="trash-outline"
            onPress={() => setConfirmDeleteVisible(true)}
            loading={deleting}
            disabled={saving}
          />
        ) : null}
      </ScrollView>

      <ConfirmDialog
        visible={confirmDeleteVisible}
        title="Eliminar cliente"
        message={`¿Eliminás a "${customer.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteVisible(false)}
      />
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
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.bodyLg,
    color: theme.colors.textSecondary,
  },
  content: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
    paddingBottom: 100,
  },

  infoCard: {
    borderRadius: theme.radius.cardLg,
    padding: theme.spacing.xl,
    borderWidth: 1.5,
    marginBottom: theme.spacing.md,
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
    fontFamily: theme.fontFamily.extrabold,
    fontSize: theme.font.h1,
    color: theme.colors.text,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  balanceSuffix: {
    fontFamily: theme.fontFamily.bold,
    fontSize: theme.font.body,
  },
  textDebt: { color: theme.colors.error },
  textOk: { color: theme.colors.success },
  movementsText: {
    fontFamily: theme.fontFamily.semibold,
    fontSize: theme.font.micro,
    color: theme.colors.muted,
  },

  notice: {
    marginBottom: theme.spacing.xxl,
  },

  field: {
    marginBottom: theme.spacing.lg,
  },

  saveBtn: {
    marginBottom: theme.spacing.xxxl,
  },

  sectionLabel: {
    fontFamily: theme.fontFamily.bold,
    fontSize: theme.font.micro,
    color: theme.colors.muted,
    letterSpacing: 1.5,
    marginBottom: theme.spacing.md,
  },
  movementsLoader: {
    marginVertical: theme.spacing.md,
  },
  cannotDeleteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cannotDeleteText: {
    flex: 1,
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
});
