import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/theme';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!businessName.trim() || !email.trim() || !password) {
      Alert.alert('Campos requeridos', 'Completá todos los campos.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Contraseña corta', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setLoading(true);
    try {
      await register(email.trim(), password, businessName.trim());
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      Alert.alert('Error al registrarse', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Mi Almacén</Text>
      <Text style={styles.subtitle}>Creá tu cuenta de comercio</Text>

      <TextInput
        style={styles.input}
        placeholder="Nombre del comercio"
        placeholderTextColor={theme.colors.muted}
        value={businessName}
        onChangeText={setBusinessName}
        autoCapitalize="words"
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={theme.colors.muted}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña (mín. 6 caracteres)"
        placeholderTextColor={theme.colors.muted}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Creando cuenta...' : 'Crear cuenta'}</Text>
      </TouchableOpacity>

      <Link href="/login" style={styles.link}>
        ¿Ya tenés cuenta? Iniciá sesión
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.large,
    justifyContent: 'center',
    paddingVertical: 48,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 17,
    color: theme.colors.textSecondary,
    marginBottom: 36,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: theme.spacing.medium,
    paddingVertical: 14,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: theme.spacing.medium,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  link: {
    marginTop: 28,
    textAlign: 'center',
    color: theme.colors.primary,
    fontSize: 15,
  },
});
