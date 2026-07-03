import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/theme';
import { Button, Card, IconChip } from '@/components/ui';

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
    title: 'Controlá tu lista de precios',
    desc: 'Generá tu catálogo en PDF agrupado por categoría. Tu herramienta para tener los precios siempre al día.',
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
        <IconChip icon="storefront" size="lg" tone="primary" filled style={styles.iconWrap} />

        <Text style={styles.title}>Empezá con Mi Almacén</Text>
        <Text style={styles.subtitle}>
          Configurá lo básico y empezá a usar tu negocio en minutos.
        </Text>

        <Card style={styles.card}>
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
        </Card>

        {isManual ? (
          <Button label="Volver" onPress={() => router.back()} style={styles.stretch} />
        ) : (
          <>
            <Button
              label="Empezar"
              onPress={() => handleComplete(false)}
              loading={saving}
              style={styles.stretch}
            />
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
    paddingHorizontal: theme.spacing.xxl,
    paddingTop: 48,
    paddingBottom: 48,
    alignItems: 'center',
  },
  iconWrap: {
    marginBottom: theme.spacing.xxl,
  },
  title: {
    fontFamily: theme.fontFamily.extrabold,
    fontSize: theme.font.h2,
    color: theme.colors.text,
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.xxxl,
    paddingHorizontal: 8,
  },
  card: {
    alignSelf: 'stretch',
    marginBottom: theme.spacing.xxxl,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginHorizontal: theme.spacing.lg,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
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
    fontFamily: theme.fontFamily.extrabold,
    fontSize: theme.font.body,
    color: theme.colors.primary,
  },
  stepBody: {
    flex: 1,
    gap: 2,
  },
  stepTitle: {
    fontFamily: theme.fontFamily.bold,
    fontSize: theme.font.body,
    color: theme.colors.text,
  },
  stepDesc: {
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.micro,
    color: theme.colors.muted,
    lineHeight: 17,
  },
  stretch: {
    alignSelf: 'stretch',
    marginBottom: 14,
  },
  skipBtn: {
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.lg,
  },
  skipBtnText: {
    fontFamily: theme.fontFamily.semibold,
    fontSize: theme.font.caption,
    color: theme.colors.muted,
  },
});
