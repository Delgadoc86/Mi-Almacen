import { createContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { type User as FirebaseUser } from 'firebase/auth';
import {
  subscribeToAuthChanges,
  registerWithEmail,
  loginWithEmail,
  logout as authLogout,
} from '@/services/auth';
import {
  createUserAndBusiness,
  getUserProfile,
  getBusiness,
  repairIncompleteRegistration,
} from '@/services/userProfile';
import type { UserProfile, Business } from '@/models';

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
    // Repair incomplete registration if Firestore docs are missing
    await repairIncompleteRegistration(fbUser.uid, fbUser.email ?? email);
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
    // onAuthStateChanged fires and clears state
  }

  async function refreshBusiness(): Promise<void> {
    if (!state.firebaseUser) return;
    const biz = await getBusiness(state.firebaseUser.uid);
    setState((prev) => ({ ...prev, business: biz }));
  }

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, refreshBusiness }}>
      {children}
    </AuthContext.Provider>
  );
}
