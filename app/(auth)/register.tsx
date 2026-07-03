import { useRef, useState } from 'react';
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
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/theme';
import { Button, IconChip, InlineMessage, TextField } from '@/components/ui';

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
        <View style={styles.brandSection}>
          <IconChip icon="storefront" size="lg" tone="primary" />
          <Text style={styles.title}>Crear cuenta</Text>
          <Text style={styles.subtitle}>Tu comercio listo en un minuto</Text>
        </View>

        <View style={styles.form}>
          <TextField
            label="Nombre del comercio"
            value={businessName}
            onChangeText={(t) => { setBusinessName(t); setGeneralError(''); }}
            placeholder="Ej: Almacén Don Pepe"
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            containerStyle={styles.field}
          />

          <TextField
            ref={emailRef}
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

          <TextField
            ref={passwordRef}
            label="Contraseña"
            value={password}
            onChangeText={(t) => { setPassword(t); setGeneralError(''); }}
            placeholder="Mínimo 6 caracteres"
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleRegister}
            containerStyle={styles.field}
          />

          {generalError ? (
            <InlineMessage variant="error" text={generalError} style={styles.field} />
          ) : null}

          <View style={styles.verificationHint}>
            <Ionicons name="mail-outline" size={14} color={theme.colors.muted} />
            <Text style={styles.verificationHintText}>
              Te enviaremos un correo para activar tu cuenta.
            </Text>
          </View>

          <Button label="Crear cuenta" onPress={handleRegister} loading={loading} />
        </View>

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
    paddingHorizontal: theme.spacing.xxl,
    paddingTop: 60,
    paddingBottom: theme.spacing.huge,
    justifyContent: 'center',
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxxl,
    gap: theme.spacing.md,
  },
  title: {
    fontFamily: theme.fontFamily.extrabold,
    fontSize: theme.font.h2,
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.body,
    color: theme.colors.textSecondary,
  },
  form: { width: '100%' },
  field: {
    marginBottom: theme.spacing.lg,
  },
  verificationHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: theme.spacing.xl,
  },
  verificationHintText: {
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.micro,
    color: theme.colors.muted,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.xxl,
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
