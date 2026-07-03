import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/theme';
import { Button, IconChip, InlineMessage } from '@/components/ui';

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
        <IconChip icon="mail" size="lg" tone="primary" style={styles.iconWrap} />

        <Text style={styles.title}>Revisá tu correo</Text>
        <Text style={styles.subtitle}>
          Te enviamos un correo de verificación a:
        </Text>
        <Text style={styles.emailText}>{email}</Text>
        <Text style={styles.instruction}>
          Abrí el link del correo para activar tu cuenta. Si no lo encontrás, revisá la carpeta de spam.
        </Text>

        <Button
          label="Ya verifiqué mi correo"
          onPress={handleCheckVerified}
          loading={checking}
          style={styles.stretchField}
        />

        {checkError ? (
          <InlineMessage variant="error" text={checkError} style={styles.stretchField} />
        ) : null}

        {resendSuccess ? (
          <InlineMessage
            variant="success"
            text={`Correo reenviado.${cooldown > 0 ? ` Podés volver a intentarlo en ${cooldown}s.` : ''}`}
            style={styles.stretchField}
          />
        ) : null}

        {resendError ? (
          <InlineMessage variant="error" text={resendError} style={styles.stretchField} />
        ) : null}

        <Button
          label={cooldown > 0 ? `Reenviar correo (${cooldown}s)` : 'Reenviar correo de verificación'}
          variant="outline"
          onPress={handleResend}
          loading={resending}
          disabled={cooldown > 0}
          style={styles.resendBtn}
        />

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
    marginBottom: theme.spacing.xxl,
  },
  title: {
    fontFamily: theme.fontFamily.extrabold,
    fontSize: theme.font.h1,
    color: theme.colors.text,
    letterSpacing: -0.4,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  emailText: {
    fontFamily: theme.fontFamily.bold,
    fontSize: theme.font.body,
    color: theme.colors.primary,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  instruction: {
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: theme.spacing.xxxl,
  },
  stretchField: {
    alignSelf: 'stretch',
    marginBottom: theme.spacing.md,
  },
  resendBtn: {
    alignSelf: 'stretch',
    marginBottom: theme.spacing.xxl,
  },
  logoutBtn: {
    paddingVertical: 10,
  },
  logoutText: {
    color: theme.colors.muted,
    fontFamily: theme.fontFamily.semibold,
    fontSize: theme.font.caption,
    textDecorationLine: 'underline',
  },
});
