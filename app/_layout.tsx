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

function RootGuard() {
  const { firebaseUser, userProfile, loading } = useAuth();
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
    if (loading) return;

    const segs = segments as string[];
    const inAuthGroup = segs[0] === '(auth)';
    const inOnboarding = segs[0] === 'onboarding';
    const onVerifyEmail = inAuthGroup && segs[1] === 'verify-email';
    const onboardingDone = userProfile?.onboarding?.completed === true;

    if (!firebaseUser && !inAuthGroup) {
      router.replace('/login');
    } else if (firebaseUser && !firebaseUser.emailVerified && !onVerifyEmail) {
      router.replace('/verify-email');
    } else if (firebaseUser && firebaseUser.emailVerified) {
      if (inAuthGroup) {
        // Leaving auth screens: go to onboarding first if not done yet
        router.replace(onboardingDone ? '/' : '/onboarding');
      } else if (!onboardingDone && !inOnboarding) {
        // Existing user who never completed onboarding (e.g. first open after update)
        router.replace('/onboarding');
      }
    }
  }, [firebaseUser, userProfile, loading, segments, firebaseUser?.emailVerified]);

  if (loading || !fontsLoaded) {
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
