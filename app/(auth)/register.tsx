import { useRef, useState } from 'react';
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
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/theme';

const ERROR_MAP: Record<string, string> = {
  'auth/email-already-in-use': 'Ya existe una cuenta con ese email.',
  'auth/invalid-email': 'Email inválido.',
  'auth/weak-password': 'La contraseña es muy débil. Usá al menos 6 caracteres.',
  'auth/network-request-failed': 'Sin conexión. Verificá tu internet.',
  'auth/operation-not-allowed': 'El registro está deshabilitado momentáneamente.',
};

function mapAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  return ERROR_MAP[code] ?? 'Ocurrió un error al crear la cuenta. Intentá de nuevo.';
}

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  async function handleRegister() {
    if (!businessName.trim() || !email.trim() || !password) {
      setGeneralError('Completá todos los campos.');
      return;
    }
    if (password.length < 6) {
      setGeneralError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setGeneralError('');
    setLoading(true);
    try {
      await register(email.trim().toLowerCase(), password, businessName.trim());
      // RootGuard detects emailVerified === false and redirects to /verify-email
    } catch (e) {
      setGeneralError(mapAuthError(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── BRANDING ── */}
        <View style={styles.brandSection}>
          <View style={styles.logoWrap}>
            <Ionicons name="storefront" size={30} color={theme.colors.primary} />
          </View>
          <Text style={styles.title}>Crear cuenta</Text>
          <Text style={styles.subtitle}>Tu comercio listo en un minuto</Text>
        </View>

        {/* ── FORM ── */}
        <View style={styles.form}>
          <Text style={styles.fieldLabel}>Nombre del comercio</Text>
          <TextInput
            style={styles.input}
            value={businessName}
            onChangeText={(t) => { setBusinessName(t); setGeneralError(''); }}
            placeholder="Ej: Almacén Don Pepe"
            placeholderTextColor={theme.colors.muted}
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
          />

          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput
            ref={emailRef}
            style={styles.input}
            value={email}
            onChangeText={(t) => { setEmail(t); setGeneralError(''); }}
            placeholder="tucorreo@ejemplo.com"
            placeholderTextColor={theme.colors.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />

          <Text style={styles.fieldLabel}>Contraseña</Text>
          <View style={styles.inputWrap}>
            <TextInput
              ref={passwordRef}
              style={styles.inputInner}
              value={password}
              onChangeText={(t) => { setPassword(t); setGeneralError(''); }}
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor={theme.colors.muted}
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleRegister}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword((p) => !p)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={theme.colors.muted}
              />
            </TouchableOpacity>
          </View>

          {generalError ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={15} color={theme.colors.error} />
              <Text style={styles.errorText}>{generalError}</Text>
            </View>
          ) : null}

          <View style={styles.verificationHint}>
            <Ionicons name="mail-outline" size={14} color={theme.colors.muted} />
            <Text style={styles.verificationHintText}>
              Te enviaremos un correo para activar tu cuenta.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryBtnText}>Crear cuenta</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── FOOTER ── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>¿Ya tenés cuenta? </Text>
          <TouchableOpacity onPress={() => router.push('/login')}>
            <Text style={styles.footerLink}>Iniciá sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.background },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.muted,
    fontWeight: '500',
  },
  form: { width: '100%' },
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
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 14,
    marginBottom: 16,
  },
  inputInner: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: theme.colors.text,
  },
  eyeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 14,
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
  verificationHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  verificationHintText: {
    fontSize: 12,
    color: theme.colors.muted,
    fontWeight: '500',
  },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
    minHeight: 54,
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.5, shadowOpacity: 0, elevation: 0 },
  primaryBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
  },
  footerText: {
    fontSize: 15,
    color: theme.colors.muted,
    fontWeight: '500',
  },
  footerLink: {
    fontSize: 15,
    color: theme.colors.primary,
    fontWeight: '700',
  },
});
