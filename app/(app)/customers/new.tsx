import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
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
import { createCustomer } from '@/services/customers';
import { theme } from '@/theme';

export default function NewCustomerScreen() {
  const router = useRouter();
  const { firebaseUser, userProfile } = useAuth();

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
          autoFocus
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
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Guardar cliente</Text>
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
    paddingBottom: 48,
  },
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
  saveBtn: {
    marginTop: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
    minHeight: 54,
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.5, shadowOpacity: 0, elevation: 0 },
  saveBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
