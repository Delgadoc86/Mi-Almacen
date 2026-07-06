import { useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useWriteGuard } from '@/hooks/useWriteGuard';
import { createCustomer } from '@/services/customers';
import { theme } from '@/theme';
import { Button, InlineMessage, TextField } from '@/components/ui';
import { PlanRestrictionDialog } from '@/components/PlanRestrictionDialog';

export default function NewCustomerScreen() {
  const router = useRouter();
  const { firebaseUser, userProfile } = useAuth();
  const { requireWrite, restrictionMessage, dismissRestriction } = useWriteGuard();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('El nombre es obligatorio.');
      return;
    }
    if (!firebaseUser || !userProfile?.businessId) {
      Alert.alert('Sin sesión', 'No hay sesión activa. Cerrá sesión e ingresá nuevamente.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await createCustomer(userProfile.businessId, {
        name: trimmedName,
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(reference.trim() ? { reference: reference.trim() } : {}),
      });
      router.back();
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      if (code.includes('permission-denied')) {
        setError('Sin permisos para guardar. Verificá tu conexión.');
      } else if (code.includes('unauthenticated')) {
        setError('Tu sesión venció. Iniciá sesión nuevamente.');
      } else {
        setError('No se pudo guardar el cliente. Intentá de nuevo.');
      }
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
        <TextField
          label="Nombre *"
          value={name}
          onChangeText={(t) => { setName(t); setError(''); }}
          placeholder="Ej: Juan Pérez"
          autoCapitalize="words"
          returnKeyType="next"
          autoFocus
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
          onSubmitEditing={() => requireWrite(handleSave)}
          containerStyle={styles.field}
        />

        {error ? <InlineMessage variant="error" text={error} style={styles.field} /> : null}

        <Button label="Guardar cliente" onPress={() => requireWrite(handleSave)} loading={saving} style={styles.saveBtn} />
      </ScrollView>
      <PlanRestrictionDialog message={restrictionMessage} onDismiss={dismissRestriction} />
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
  field: {
    marginBottom: theme.spacing.lg,
  },
  saveBtn: {
    marginTop: 8,
  },
});
