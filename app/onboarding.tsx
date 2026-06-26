import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/theme';

type Step = {
  title: string;
  desc: string;
  icon: 'cash-outline' | 'people-outline' | 'cube-outline' | 'pricetag-outline';
};

const STEPS: Step[] = [
  {
    title: 'Abrí tu primera caja',
    desc: 'Registrá el efectivo con el que arrancás el día.',
    icon: 'cash-outline',
  },
  {
    title: 'Creá tu primer cliente fiado',
    desc: 'Guardá quién te debe y cuánto.',
    icon: 'people-outline',
  },
  {
    title: 'Agregá tu primer producto',
    desc: 'Armá tu catálogo con precios actualizados.',
    icon: 'cube-outline',
  },
  {
    title: 'Generá tu lista de precios',
    desc: 'Compartí el PDF con tus clientes cuando lo necesiten.',
    icon: 'pricetag-outline',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { markOnboardingComplete } = useAuth();
  const [saving, setSaving] = useState(false);

  // True when opened manually from Configuración — no state changes needed
  const isManual = from === 'settings';

  async function handleComplete(skipped: boolean) {
    setSaving(true);
    try {
      await markOnboardingComplete(skipped);
    } catch {
      Alert.alert('Aviso', 'No pudimos guardar la preferencia. Intentá de nuevo.');
      // Non-blocking: optimistic update already ran, continue to home
    } finally {
      setSaving(false);
    }
    router.replace('/');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Icon */}
        <View style={styles.iconWrap}>
          <Ionicons name="storefront" size={38} color="#fff" />
        </View>

        {/* Header */}
        <Text style={styles.title}>Empezá con Mi Almacén</Text>
        <Text style={styles.subtitle}>
          Configurá lo básico y empezá a usar tu negocio en minutos.
        </Text>

        {/* Checklist */}
        <View style={styles.card}>
          {STEPS.map((step, index) => (
            <View key={index}>
              {index > 0 && <View style={styles.divider} />}
              <View style={styles.stepRow}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepNum}>{index + 1}</Text>
                </View>
                <View style={styles.stepBody}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDesc}>{step.desc}</Text>
                </View>
                <Ionicons name={step.icon} size={22} color={theme.colors.muted} />
              </View>
            </View>
          ))}
        </View>

        {/* Buttons */}
        {isManual ? (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Volver</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.primaryBtn, saving && styles.btnDisabled]}
              onPress={() => handleComplete(false)}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>Empezar</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipBtn}
              onPress={() => handleComplete(true)}
              disabled={saving}
              activeOpacity={0.7}
            >
              <Text style={styles.skipBtnText}>No mostrar más</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 48,
    alignItems: 'center',
  },

  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 8,
  },

  // ── Checklist card ──
  card: {
    alignSelf: 'stretch',
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 32,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginHorizontal: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNum: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  stepBody: {
    flex: 1,
    gap: 2,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  stepDesc: {
    fontSize: 12,
    color: theme.colors.muted,
    fontWeight: '500',
    lineHeight: 17,
  },

  // ── Buttons ──
  primaryBtn: {
    alignSelf: 'stretch',
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 14,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  btnDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },

  skipBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  skipBtnText: {
    fontSize: 14,
    color: theme.colors.muted,
    fontWeight: '600',
  },
});
