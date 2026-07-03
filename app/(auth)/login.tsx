import { useEffect, useRef, useState } from 'react';
import {
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
import { Button, IconChip, InlineMessage, TextField } from '@/components/ui';

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
        <View style={styles.brandSection}>
          <IconChip icon="storefront" size="lg" tone="primary" />
          <Text style={styles.title}>Mi Almacén</Text>
          <Text style={styles.subtitle}>Controlá precios y fiados de tu comercio</Text>
        </View>

        {!showForgot ? (
          <View style={styles.form}>
            <TextField
              label="Email"
              value={email}
              onChangeText={(t) => { setEmail(t); setGeneralError(''); }}
              placeholder="tucorreo@ejemplo.com"
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              containerStyle={styles.field}
            />

            <View style={styles.passwordLabelRow}>
              <Text style={styles.fieldLabel}>Contraseña</Text>
              <TouchableOpacity onPress={openForgot} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.forgotLink}>Olvidé mi contraseña</Text>
              </TouchableOpacity>
            </View>
            <TextField
              ref={passwordRef}
              value={password}
              onChangeText={(t) => { setPassword(t); setGeneralError(''); }}
              placeholder="••••••••"
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              containerStyle={styles.field}
            />

            {generalError ? (
              <InlineMessage variant="error" text={generalError} style={styles.field} />
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

            <Button
              label="Entrar"
              onPress={handleLogin}
              loading={loading}
              style={styles.field}
            />

            {biometricAvailable && (
              <Button
                label="Entrar con huella"
                variant="outline"
                icon="finger-print-outline"
                onPress={handleBiometric}
                loading={biometricLoading}
              />
            )}
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.forgotTitle}>Recuperar contraseña</Text>
            <Text style={styles.forgotSubtitle}>
              Ingresá tu email y te enviamos un correo para restablecer la contraseña.
            </Text>

            <TextField
              label="Email"
              value={forgotEmail}
              onChangeText={(t) => { setForgotEmail(t); setForgotError(''); setForgotSuccess(false); }}
              placeholder="tucorreo@ejemplo.com"
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleForgotPassword}
              autoFocus
              containerStyle={styles.field}
            />

            {forgotError ? (
              <InlineMessage variant="error" text={forgotError} style={styles.field} />
            ) : null}

            {forgotSuccess ? (
              <InlineMessage
                variant="success"
                text="Correo enviado. Revisá tu bandeja de entrada (y la carpeta de spam)."
                style={styles.field}
              />
            ) : null}

            <Button
              label="Enviar correo de recuperación"
              onPress={handleForgotPassword}
              loading={forgotLoading}
              disabled={forgotSuccess}
              style={styles.field}
            />

            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => { setShowForgot(false); setForgotSuccess(false); setForgotError(''); }}
            >
              <Ionicons name="arrow-back-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.backBtnText}>Volver al inicio de sesión</Text>
            </TouchableOpacity>
          </View>
        )}

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
    paddingHorizontal: theme.spacing.xxl,
    paddingTop: 60,
    paddingBottom: theme.spacing.huge,
    justifyContent: 'center',
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.huge,
    gap: theme.spacing.md,
  },
  title: {
    fontFamily: theme.fontFamily.extrabold,
    fontSize: 32,
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  field: {
    marginBottom: theme.spacing.lg,
  },
  fieldLabel: {
    fontFamily: theme.fontFamily.bold,
    fontSize: theme.font.caption,
    color: theme.colors.textSecondary,
    letterSpacing: 0.2,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  forgotLink: {
    fontFamily: theme.fontFamily.semibold,
    fontSize: theme.font.caption,
    color: theme.colors.primary,
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    backgroundColor: theme.colors.warningLight,
    borderWidth: 1,
    borderColor: theme.colors.warningBorder,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: theme.spacing.lg,
  },
  hintText: {
    flex: 1,
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.caption,
    color: theme.colors.warning,
    lineHeight: 18,
  },
  hintLink: {
    color: theme.colors.primary,
    fontFamily: theme.fontFamily.bold,
    textDecorationLine: 'underline',
  },
  forgotTitle: {
    fontFamily: theme.fontFamily.extrabold,
    fontSize: theme.font.h2,
    color: theme.colors.text,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  forgotSubtitle: {
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.body,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.xxl,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: theme.spacing.lg,
  },
  backBtnText: {
    color: theme.colors.primary,
    fontFamily: theme.fontFamily.semibold,
    fontSize: theme.font.body,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.xxxl,
  },
  footerText: {
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.body,
    color: theme.colors.muted,
  },
  footerLink: {
    fontFamily: theme.fontFamily.bold,
    fontSize: theme.font.body,
    color: theme.colors.primary,
  },
});
