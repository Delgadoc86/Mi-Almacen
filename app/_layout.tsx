import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider } from '@/context/AuthContext';
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/theme';

function RootGuard() {
  const { firebaseUser, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const segs = segments as string[];
    const inAuthGroup = segs[0] === '(auth)';
    const onVerifyEmail = inAuthGroup && segs[1] === 'verify-email';

    if (!firebaseUser && !inAuthGroup) {
      router.replace('/login');
    } else if (firebaseUser && !firebaseUser.emailVerified && !onVerifyEmail) {
      router.replace('/verify-email');
    } else if (firebaseUser && firebaseUser.emailVerified && inAuthGroup) {
      router.replace('/');
    }
  }, [firebaseUser, loading, segments, firebaseUser?.emailVerified]);

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
