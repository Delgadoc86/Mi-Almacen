import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import {
  useFonts,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { AuthProvider } from '@/context/AuthContext';
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/theme';
import { ConnectionErrorScreen } from '@/components/ConnectionErrorScreen';

function RootGuard() {
  const { firebaseUser, userProfile, accountInconsistent, loading, authError, retryProfileLoad } = useAuth();
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading || authError) return;

    const segs = segments as string[];
    const inAuthGroup = segs[0] === '(auth)';
    const inOnboarding = segs[0] === 'onboarding';
    const inAccountIssue = segs[0] === 'account-issue';
    const onVerifyEmail = inAuthGroup && segs[1] === 'verify-email';
    const onboardingDone = userProfile?.onboarding?.completed === true;

    if (!firebaseUser && !inAuthGroup) {
      router.replace('/login');
    } else if (firebaseUser && !firebaseUser.emailVerified && !onVerifyEmail) {
      router.replace('/verify-email');
    } else if (firebaseUser && firebaseUser.emailVerified) {
      if (accountInconsistent) {
        // users/businesses inconsistentes para este uid: nunca se autorepara
        // creando datos nuevos (ver repairIncompleteRegistration). Se muestra
        // una pantalla de recuperación en vez de onboarding o la app.
        if (!inAccountIssue) router.replace('/account-issue');
      } else if (inAuthGroup) {
        // Leaving auth screens: go to onboarding first if not done yet
        router.replace(onboardingDone ? '/' : '/onboarding');
      } else if (!onboardingDone && !inOnboarding) {
        // Existing user who never completed onboarding (e.g. first open after update)
        router.replace('/onboarding');
      } else if (inAccountIssue) {
        // Se resolvió la inconsistencia (ej. desde otra sesión) — salir de la pantalla de recuperación
        router.replace(onboardingDone ? '/' : '/onboarding');
      }
    }
  }, [firebaseUser, userProfile, accountInconsistent, loading, authError, segments, firebaseUser?.emailVerified]);

  if (!fontsLoaded) {
    return (
      <View
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // La carga inicial (getUserProfile/resolveIsAdmin) no pudo completarse —
  // típicamente sin conexión, arrancando la app en frío sin nada en cache.
  // Pantalla real con reintento, no un spinner que nunca se resuelve.
  if (authError) {
    return <ConnectionErrorScreen onRetry={retryProfileLoad} retrying={loading} fullScreen />;
  }

  if (loading) {
    return (
      <View
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootGuard />
    </AuthProvider>
  );
}
