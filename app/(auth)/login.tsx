import { useEffect, useRef, useState } from 'react';
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
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/theme';

const BIOMETRIC_EMAIL_KEY = 'biometric_user_email';

const ERROR_MAP: Record<string, string> = {
  'auth/invalid-credential': 'Email o contraseña incorrectos.',
  'auth/too-many-requests': 'Demasiados intentos. Intentá más tarde.',
  'auth/user-not-found': 'No existe una cuenta con ese email.',
  'auth/wrong-password': 'Contraseña incorrecta.',
  'auth/invalid-email': 'Email inválido.',
  'auth/network-request-failed': 'Sin conexión. Verificá tu internet.',
  'auth/user-disabled': 'Esta cuenta fue desactivada.',
};

function mapAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  return ERROR_MAP[code] ?? 'Ocurrió un error. Intentá de nuevo.';
}

export default function LoginScreen() {
  const router = useRouter();
  const { login, forgotPassword, refreshSession } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);

  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  const passwordRef = useRef<TextInput>(null);

  useEffect(() => {
    async function checkBiometrics() {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const savedEmail = await SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY);
      if (hasHardware && isEnrolled && savedEmail) {
        setBiometricAvailable(true);
        setEmail(savedEmail);
      }
    }
    checkBiometrics();
  }, []);

  async function handleLogin() {
    if (!email.trim() || !password) {
      setGeneralError('Ingresá tu email y contraseña.');
      return;
    }
    setGeneralError('');
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (e) {
      const msg = mapAuthError(e);
      setGeneralError(msg);
      setFailedAttempts((n) => n + 1);
    } finally {
      setLoading(false);
    }
  }

  async function handleBiometric() {
    setBiometricLoading(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Verificá tu identidad para ingresar',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
      });
      if (!result.success) return;
      const ok = await refreshSession();
      if (!ok) {
        setGeneralError('La sesión venció. Ingresá con tu contraseña.');
        setBiometricAvailable(false);
      }
    } catch {
      setGeneralError('No se pudo verificar la identidad.');
    } finally {
      setBiometricLoading(false);
    }
  }

  async function handleForgotPassword() {
    const trimmed = forgotEmail.trim().toLowerCase();
    if (!trimmed) {
      setForgotError('Ingresá tu email.');
      return;
    }
    setForgotError('');
    setForgotLoading(true);
    try {
      await forgotPassword(trimmed);
      setForgotSuccess(true);
    } catch (e) {
      const code = (e as { code?: string })?.code ?? '';
      if (code === 'auth/user-not-found') {
        setForgotError('No existe una cuenta con ese email.');
      } else if (code === 'auth/invalid-email') {
        setForgotError('Email inválido.');
      } else {
        setForgotError('No se pudo enviar el correo. Intentá de nuevo.');
      }
    } finally {
      setForgotLoading(false);
    }
  }

  function openForgot() {
    setForgotEmail(email);
    setForgotError('');
    setForgotSuccess(false);
    setShowForgot(true);
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
          <Text style={styles.title}>Mi Almacén</Text>
          <Text style={styles.subtitle}>Controlá precios y fiados de tu comercio</Text>
        </View>

        {!showForgot ? (
          /* ── LOGIN FORM ── */
          <View style={styles.form}>
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
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

            <View style={styles.passwordLabelRow}>
              <Text style={styles.fieldLabel}>Contraseña</Text>
              <TouchableOpacity onPress={openForgot} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.forgotLink}>Olvidé mi contraseña</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputWrap}>
              <TextInput
                ref={passwordRef}
                style={styles.inputInner}
                value={password}
                onChangeText={(t) => { setPassword(t); setGeneralError(''); }}
                placeholder="••••••••"
                placeholderTextColor={theme.colors.muted}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
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

            {failedAttempts >= 3 && (
              <View style={styles.hintBox}>
                <Ionicons name="key-outline" size={14} color={theme.colors.warning} />
                <Text style={styles.hintText}>
                  ¿Olvidaste tu contraseña?{' '}
                  <Text style={styles.hintLink} onPress={openForgot}>
                    Podés recuperarla aquí.
                  </Text>
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>Entrar</Text>
              )}
            </TouchableOpacity>

            {biometricAvailable && (
              <TouchableOpacity
                style={[styles.biometricBtn, biometricLoading && styles.btnDisabled]}
                onPress={handleBiometric}
                disabled={biometricLoading}
                activeOpacity={0.85}
              >
                {biometricLoading ? (
                  <ActivityIndicator color={theme.colors.primary} size="small" />
                ) : (
                  <>
                    <Ionicons name="finger-print-outline" size={20} color={theme.colors.primary} />
                    <Text style={styles.biometricBtnText}>Entrar con huella</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        ) : (
          /* ── FORGOT PASSWORD FORM ── */
          <View style={styles.form}>
            <Text style={styles.forgotTitle}>Recuperar contraseña</Text>
            <Text style={styles.forgotSubtitle}>
              Ingresá tu email y te enviamos un correo para restablecer la contraseña.
            </Text>

            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={forgotEmail}
              onChangeText={(t) => { setForgotEmail(t); setForgotError(''); setForgotSuccess(false); }}
              placeholder="tucorreo@ejemplo.com"
              placeholderTextColor={theme.colors.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleForgotPassword}
              autoFocus
            />

            {forgotError ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={15} color={theme.colors.error} />
                <Text style={styles.errorText}>{forgotError}</Text>
              </View>
            ) : null}

            {forgotSuccess ? (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle-outline" size={15} color={theme.colors.success} />
                <Text style={styles.successText}>
                  Correo enviado. Revisá tu bandeja de entrada (y la carpeta de spam).
                </Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.primaryBtn, (forgotLoading || forgotSuccess) && styles.btnDisabled]}
              onPress={handleForgotPassword}
              disabled={forgotLoading || forgotSuccess}
              activeOpacity={0.85}
            >
              {forgotLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>Enviar correo de recuperación</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => { setShowForgot(false); setForgotSuccess(false); setForgotError(''); }}
            >
              <Ionicons name="arrow-back-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.backBtnText}>Volver al inicio de sesión</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── FOOTER ── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>¿No tenés cuenta? </Text>
          <TouchableOpacity onPress={() => router.push('/register')}>
            <Text style={styles.footerLink}>Registrate</Text>
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
    marginBottom: 40,
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
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.muted,
    textAlign: 'center',
    fontWeight: '500',
  },
  form: {
    width: '100%',
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
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
  },
  forgotLink: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '600',
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
  successBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    backgroundColor: theme.colors.successLight,
    borderWidth: 1,
    borderColor: theme.colors.successMid,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  successText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.success,
    fontWeight: '500',
    lineHeight: 18,
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    backgroundColor: theme.colors.warningLight,
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  hintText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    fontWeight: '500',
    lineHeight: 18,
  },
  hintLink: {
    color: theme.colors.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
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
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 15,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
    marginBottom: 12,
    minHeight: 52,
  },
  biometricBtnText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  forgotTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  forgotSubtitle: {
    fontSize: 14,
    color: theme.colors.muted,
    lineHeight: 20,
    marginBottom: 24,
    fontWeight: '500',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
  },
  backBtnText: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
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
