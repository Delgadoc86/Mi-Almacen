import { createContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { type User as FirebaseUser } from 'firebase/auth';
import * as SecureStore from 'expo-secure-store';
import {
  subscribeToAuthChanges,
  registerWithEmail,
  loginWithEmail,
  logout as authLogout,
  sendPasswordReset,
  reloadUser,
} from '@/services/auth';
import {
  createUserAndBusiness,
  getUserProfile,
  getBusiness,
  repairIncompleteRegistration,
  updateLastLogin,
  completeOnboarding,
} from '@/services/userProfile';
import { auth } from '@/services/firebase';
import type { UserProfile, Business } from '@/models';

const BIOMETRIC_EMAIL_KEY = 'biometric_user_email';

type AuthState = {
  firebaseUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  business: Business | null;
  loading: boolean;
};

type AuthContextType = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, businessName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshBusiness: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  recheckEmailVerified: () => Promise<boolean>;
  refreshSession: () => Promise<boolean>;
  resendVerificationEmail: () => Promise<void>;
  markOnboardingComplete: (skipped?: boolean) => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    firebaseUser: null,
    userProfile: null,
    business: null,
    loading: true,
  });

  // Prevents onAuthStateChanged from racing with the register() flow
  const isRegistering = useRef(false);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (fbUser) => {
      if (isRegistering.current) return;

      if (!fbUser) {
        setState({ firebaseUser: null, userProfile: null, business: null, loading: false });
        return;
      }

      const [profile, biz] = await Promise.all([
        getUserProfile(fbUser.uid),
        getBusiness(fbUser.uid),
      ]);

      setState({ firebaseUser: fbUser, userProfile: profile, business: biz, loading: false });
    });

    return unsubscribe;
  }, []);

  async function login(email: string, password: string): Promise<void> {
    const fbUser = await loginWithEmail(email, password);
    await repairIncompleteRegistration(fbUser.uid, fbUser.email ?? email);
    // Non-critical: update lastLoginAt and save email for biometric future use
    Promise.all([
      updateLastLogin(fbUser.uid),
      SecureStore.setItemAsync(BIOMETRIC_EMAIL_KEY, email),
    ]).catch(() => {});
    // onAuthStateChanged handles state update
  }

  async function register(
    email: string,
    password: string,
    businessName: string,
  ): Promise<void> {
    isRegistering.current = true;
    try {
      const fbUser = await registerWithEmail(email, password);
      await createUserAndBusiness(fbUser.uid, fbUser.email ?? email, businessName);

      const [profile, biz] = await Promise.all([
        getUserProfile(fbUser.uid),
        getBusiness(fbUser.uid),
      ]);

      setState({ firebaseUser: fbUser, userProfile: profile, business: biz, loading: false });
    } finally {
      isRegistering.current = false;
    }
  }

  async function logout(): Promise<void> {
    await authLogout();
    await SecureStore.deleteItemAsync(BIOMETRIC_EMAIL_KEY).catch(() => {});
    // onAuthStateChanged fires and clears state
  }

  async function refreshBusiness(): Promise<void> {
    if (!state.firebaseUser) return;
    const biz = await getBusiness(state.firebaseUser.uid);
    setState((prev) => ({ ...prev, business: biz }));
  }

  async function forgotPassword(email: string): Promise<void> {
    await sendPasswordReset(email);
  }

  async function recheckEmailVerified(): Promise<boolean> {
    const freshUser = await reloadUser();
    if (!freshUser?.emailVerified) return false;
    setState((prev) => ({ ...prev, firebaseUser: freshUser }));
    return true;
  }

  // Used by biometric login: confirms session is still active without re-entering credentials
  async function refreshSession(): Promise<boolean> {
    const currentUser = auth.currentUser;
    if (!currentUser) return false;
    const [profile, biz] = await Promise.all([
      getUserProfile(currentUser.uid),
      getBusiness(currentUser.uid),
    ]);
    setState({ firebaseUser: currentUser, userProfile: profile, business: biz, loading: false });
    return true;
  }

  async function resendVerificationEmail(): Promise<void> {
    if (!auth.currentUser) throw new Error('No hay sesión activa.');
    const { sendEmailVerification } = await import('firebase/auth');
    await sendEmailVerification(auth.currentUser);
  }

  async function markOnboardingComplete(skipped = false): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    // Optimistic update so the guard doesn't redirect back to onboarding
    setState((prev) => ({
      ...prev,
      userProfile: prev.userProfile
        ? { ...prev.userProfile, onboarding: { completed: true, skipped } }
        : prev.userProfile,
    }));
    // Write to Firestore — rethrow so caller can show an alert
    await completeOnboarding(uid, skipped);
  }

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        refreshBusiness,
        forgotPassword,
        recheckEmailVerified,
        refreshSession,
        resendVerificationEmail,
        markOnboardingComplete,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
