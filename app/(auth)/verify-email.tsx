import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/theme';

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmailScreen() {
  const { firebaseUser, recheckEmailVerified, resendVerificationEmail, logout } = useAuth();

  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState('');
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  function startCooldown() {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    cooldownRef.current = setInterval(() => {
      setCooldown((n) => {
        if (n <= 1) {
          clearInterval(cooldownRef.current!);
          cooldownRef.current = null;
          return 0;
        }
        return n - 1;
      });
    }, 1000);
  }

  async function handleCheckVerified() {
    setChecking(true);
    setCheckError('');
    try {
      const verified = await recheckEmailVerified();
      if (!verified) {
        setCheckError('Todavía no verificaste el email. Revisá tu bandeja de entrada.');
      }
      // If verified, RootGuard automatically redirects to /
    } catch {
      setCheckError('No se pudo verificar. Intentá de nuevo.');
    } finally {
      setChecking(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0) return;
    setResending(true);
    setResendError('');
    setResendSuccess(false);
    try {
      await resendVerificationEmail();
      setResendSuccess(true);
      startCooldown();
    } catch {
      setResendError('No se pudo reenviar. Intentá de nuevo.');
    } finally {
      setResending(false);
    }
  }

  const email = firebaseUser?.email ?? '';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.container}>
        {/* ── ICON ── */}
        <View style={styles.iconWrap}>
          <Ionicons name="mail" size={36} color={theme.colors.primary} />
        </View>

        <Text style={styles.title}>Revisá tu correo</Text>
        <Text style={styles.subtitle}>
          Te enviamos un correo de verificación a:
        </Text>
        <Text style={styles.emailText}>{email}</Text>
        <Text style={styles.instruction}>
          Abrí el link del correo para activar tu cuenta. Si no lo encontrás, revisá la carpeta de spam.
        </Text>

        {/* ── VERIFY BUTTON ── */}
        <TouchableOpacity
          style={[styles.primaryBtn, checking && styles.btnDisabled]}
          onPress={handleCheckVerified}
          disabled={checking}
          activeOpacity={0.85}
        >
          {checking ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.primaryBtnText}>Ya verifiqué mi correo</Text>
          )}
        </TouchableOpacity>

        {checkError ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={15} color={theme.colors.error} />
            <Text style={styles.errorText}>{checkError}</Text>
          </View>
        ) : null}

        {/* ── RESEND ── */}
        {resendSuccess ? (
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle-outline" size={15} color={theme.colors.success} />
            <Text style={styles.successText}>
              Correo reenviado.{cooldown > 0 ? ` Podés volver a intentarlo en ${cooldown}s.` : ''}
            </Text>
          </View>
        ) : null}

        {resendError ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={15} color={theme.colors.error} />
            <Text style={styles.errorText}>{resendError}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.resendBtn, (cooldown > 0 || resending) && styles.resendBtnDisabled]}
          onPress={handleResend}
          disabled={cooldown > 0 || resending}
          activeOpacity={0.7}
        >
          {resending ? (
            <ActivityIndicator color={theme.colors.primary} size="small" />
          ) : (
            <Text style={[styles.resendBtnText, cooldown > 0 && styles.resendBtnTextDisabled]}>
              {cooldown > 0 ? `Reenviar correo (${cooldown}s)` : 'Reenviar correo de verificación'}
            </Text>
          )}
        </TouchableOpacity>

        {/* ── LOGOUT ── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.7}>
          <Text style={styles.logoutText}>Usar otra cuenta</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.4,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.muted,
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 4,
  },
  emailText: {
    fontSize: 15,
    color: theme.colors.primary,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  instruction: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
    fontWeight: '500',
  },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    alignSelf: 'stretch',
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
    marginBottom: 12,
    alignSelf: 'stretch',
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
    marginBottom: 12,
    alignSelf: 'stretch',
  },
  successText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.success,
    fontWeight: '500',
    lineHeight: 18,
  },
  resendBtn: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
    marginBottom: 24,
    minHeight: 50,
    justifyContent: 'center',
  },
  resendBtnDisabled: {
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  resendBtnText: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  resendBtnTextDisabled: {
    color: theme.colors.muted,
  },
  logoutBtn: {
    paddingVertical: 10,
  },
  logoutText: {
    color: theme.colors.muted,
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
