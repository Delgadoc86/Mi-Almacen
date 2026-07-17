import { createContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { type User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
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
import { auth, db } from '@/services/firebase';
import { FIRESTORE_COLLECTIONS } from '@/constants';
import type { UserProfile, Business } from '@/models';

const BIOMETRIC_EMAIL_KEY = 'biometric_user_email';
const INITIAL_LOAD_TIMEOUT_MS = 9000;
// Acciones interactivas de Firebase Auth (signIn, createUser,
// sendPasswordReset) tampoco tienen timeout propio — si el dispositivo se
// queda sin señal a mitad de la request, la promesa puede no resolver
// nunca y el botón de Login/Registro/Recuperar queda con el loading
// pegado. Mismo criterio que INITIAL_LOAD_TIMEOUT_MS, separado porque es
// una acción disparada por el usuario, no una carga de arranque.
const AUTH_ACTION_TIMEOUT_MS = 9000;

// getUserProfile()/resolveIsAdmin() son lecturas puntuales (getDoc /
// getIdTokenResult), no listeners — sin conexión y sin nada en cache, el SDK
// de Firestore puede tardar mucho en rechazar o directamente no resolver
// nunca. Sin este timeout, la promesa de abajo se queda pendiente para
// siempre y `loading` nunca pasa a `false` — la app entera queda con un
// spinner infinito antes de mostrar cualquier pantalla.
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

// El claim solo se refresca al emitirse un ID token nuevo (login, o
// refresco automático del SDK cada ~1h) — por diseño de Firebase Auth. Si
// bootstrap-admin.mjs recién le asignó `admin: true` a esta cuenta, hay que
// cerrar sesión y volver a entrar para verlo reflejado acá.
async function resolveIsAdmin(fbUser: FirebaseUser): Promise<boolean> {
  try {
    const tokenResult = await fbUser.getIdTokenResult();
    return tokenResult.claims.admin === true;
  } catch {
    return false;
  }
}

// Estado del listener en tiempo real de businesses/{uid} — Fase 4.1.
// - loading: todavía no llegó el primer snapshot (recién suscripto).
// - synced: último snapshot confirmado por el servidor.
// - stale: último snapshot vino de cache local (sin conexión al servidor
//   en este momento) — el documento puede no reflejar el estado real.
// - error: el listener falló (permisos, red). Se conserva el último
//   `business` conocido — no se borra nada visible.
// - missing: el documento no existe (ni en servidor ni en cache).
export type BusinessSyncStatus = 'loading' | 'synced' | 'stale' | 'error' | 'missing';

type AuthState = {
  firebaseUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  business: Business | null;
  businessSyncStatus: BusinessSyncStatus;
  // Custom claim `admin` del ID token (Fase 6) — asignado únicamente por
  // scripts/bootstrap-admin.mjs vía Admin SDK, nunca por el cliente. Habilita
  // el Panel Admin móvil; no tiene relación con `business.plan` (Pro/Trial),
  // que sigue controlando las funciones normales de Mi Almacén.
  isAdmin: boolean;
  loading: boolean;
  // true cuando la carga inicial del perfil (getUserProfile/resolveIsAdmin,
  // lecturas puntuales, no listeners) no pudo completarse — típicamente sin
  // conexión y sin nada en cache. Distinto de `loading`: acá ya se dejó de
  // esperar, hay que mostrar una pantalla de error real, no un spinner.
  authError: boolean;
};

type AuthContextType = AuthState & {
  // true cuando existe exactamente uno de los dos documentos (users/businesses)
  // para este uid — nunca se autorepara creando datos nuevos, ver
  // repairIncompleteRegistration en services/userProfile.ts. Derivado en cada
  // render a partir de userProfile/business/businessSyncStatus, no es un
  // valor separado que se pueda desincronizar.
  accountInconsistent: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, businessName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshBusiness: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  recheckEmailVerified: () => Promise<boolean>;
  refreshSession: () => Promise<boolean>;
  resendVerificationEmail: () => Promise<void>;
  markOnboardingComplete: (skipped?: boolean) => Promise<void>;
  retryProfileLoad: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    firebaseUser: null,
    userProfile: null,
    business: null,
    businessSyncStatus: 'loading',
    isAdmin: false,
    loading: true,
    authError: false,
  });

  // Prevents onAuthStateChanged from racing with the register() flow
  const isRegistering = useRef(false);

  // ── Auth: perfil de usuario (lectura puntual, sin cambios) ──────────────
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (fbUser) => {
      if (isRegistering.current) return;

      if (!fbUser) {
        setState({
          firebaseUser: null,
          userProfile: null,
          business: null,
          businessSyncStatus: 'loading',
          isAdmin: false,
          loading: false,
          authError: false,
        });
        return;
      }

      try {
        const [profile, isAdmin] = await withTimeout(
          Promise.all([getUserProfile(fbUser.uid), resolveIsAdmin(fbUser)]),
          INITIAL_LOAD_TIMEOUT_MS,
        );
        setState((prev) => ({ ...prev, firebaseUser: fbUser, userProfile: profile, isAdmin, loading: false, authError: false }));
      } catch (err) {
        console.warn('[AuthContext:initialLoad]', err);
        setState((prev) => ({ ...prev, firebaseUser: fbUser, loading: false, authError: true }));
      }
    });

    return unsubscribe;
  }, []);

  // Reintento manual desde la pantalla de "no pudimos conectar" (RootGuard).
  // No vuelve a suscribir onAuthStateChanged (sigue vivo) — solo repite la
  // misma carga puntual que falló, contra el usuario ya autenticado.
  async function retryProfileLoad(): Promise<void> {
    const fbUser = auth.currentUser;
    if (!fbUser) return;
    setState((prev) => ({ ...prev, loading: true, authError: false }));
    try {
      const [profile, isAdmin] = await withTimeout(
        Promise.all([getUserProfile(fbUser.uid), resolveIsAdmin(fbUser)]),
        INITIAL_LOAD_TIMEOUT_MS,
      );
      setState((prev) => ({ ...prev, firebaseUser: fbUser, userProfile: profile, isAdmin, loading: false, authError: false }));
    } catch (err) {
      console.warn('[AuthContext:retryProfileLoad]', err);
      setState((prev) => ({ ...prev, loading: false, authError: true }));
    }
  }

  // ── Negocio: ÚNICA suscripción en tiempo real a businesses/{uid} ────────
  // Vive acá (no en Home/Configuración/Productos/Caja/Fiados) para que
  // exista un solo listener en toda la app. La dependencia es el uid (un
  // string primitivo), no el objeto firebaseUser completo — así un refresh
  // de token (que entrega una nueva referencia de FirebaseUser con el mismo
  // uid) NO dispara una resuscripción. React además garantiza que el efecto
  // anterior se limpia (unsubscribe) antes de correr de nuevo o al
  // desmontar, así que no hay forma de terminar con dos listeners vivos al
  // mismo tiempo durante login, rehidratación, biometría o navegación.
  const uid = state.firebaseUser?.uid;
  useEffect(() => {
    if (!uid) return;

    setState((prev) => ({ ...prev, businessSyncStatus: 'loading' }));

    const unsubscribe = onSnapshot(
      doc(db, FIRESTORE_COLLECTIONS.BUSINESSES, uid),
      { includeMetadataChanges: true },
      (snap) => {
        if (!snap.exists()) {
          setState((prev) => ({ ...prev, business: null, businessSyncStatus: 'missing' }));
          return;
        }
        setState((prev) => ({
          ...prev,
          business: snap.data() as Business,
          businessSyncStatus: snap.metadata.fromCache ? 'stale' : 'synced',
        }));
      },
      (err) => {
        // Prefijo estable para poder filtrar esto en Crashlytics/Sentry el
        // día que se integre — por ahora solo queda en la consola local.
        console.warn('[AuthContext:businessListener]', uid, err);
        setState((prev) => ({ ...prev, businessSyncStatus: 'error' }));
      },
    );

    return unsubscribe;
  }, [uid]);

  // accountInconsistent se deriva en cada render, nunca se guarda aparte —
  // así no puede desincronizarse de userProfile/business/businessSyncStatus.
  // Solo se evalúa una vez que el listener confirmó algo real (servidor o
  // cache): mientras está en 'loading' no se sabe todavía si el negocio
  // existe, y en 'error' no se sabe si es un problema real o de red — en
  // ninguno de los dos casos corresponde mandar a la pantalla de cuenta
  // inconsistente por una lectura que ni siquiera se completó.
  const businessConfirmed =
    state.businessSyncStatus === 'synced' ||
    state.businessSyncStatus === 'stale' ||
    state.businessSyncStatus === 'missing';
  const accountInconsistent = businessConfirmed && Boolean(state.userProfile) !== Boolean(state.business);

  async function login(email: string, password: string): Promise<void> {
    const fbUser = await withTimeout(loginWithEmail(email, password), AUTH_ACTION_TIMEOUT_MS);
    await repairIncompleteRegistration(fbUser.uid, fbUser.email ?? email);
    // Non-critical: update lastLoginAt and save email for biometric future use
    Promise.all([
      updateLastLogin(fbUser.uid),
      SecureStore.setItemAsync(BIOMETRIC_EMAIL_KEY, email),
    ]).catch(() => {});
    // onAuthStateChanged handles state update; el listener de negocio arranca solo
  }

  async function register(
    email: string,
    password: string,
    businessName: string,
  ): Promise<void> {
    isRegistering.current = true;
    try {
      const fbUser = await withTimeout(registerWithEmail(email, password), AUTH_ACTION_TIMEOUT_MS);
      await createUserAndBusiness(fbUser.uid, fbUser.email ?? email, businessName);

      const [profile, isAdmin] = await Promise.all([getUserProfile(fbUser.uid), resolveIsAdmin(fbUser)]);
      setState((prev) => ({ ...prev, firebaseUser: fbUser, userProfile: profile, isAdmin, loading: false }));
      // El listener de negocio arranca solo al detectar el uid nuevo.
    } finally {
      isRegistering.current = false;
    }
  }

  async function logout(): Promise<void> {
    await authLogout();
    await SecureStore.deleteItemAsync(BIOMETRIC_EMAIL_KEY).catch(() => {});
    // onAuthStateChanged fires and clears state; el listener de negocio se limpia solo
  }

  // Refresco puntual manual — hoy es redundante con el listener en tiempo
  // real para el propio negocio (el listener ya refleja los cambios del
  // propio cliente casi al instante), pero se deja intacto por si algún
  // llamador necesita esperar a que la lectura confirme antes de continuar.
  async function refreshBusiness(): Promise<void> {
    if (!state.firebaseUser) return;
    const biz = await getBusiness(state.firebaseUser.uid);
    setState((prev) => ({ ...prev, business: biz }));
  }

  async function forgotPassword(email: string): Promise<void> {
    await withTimeout(sendPasswordReset(email), AUTH_ACTION_TIMEOUT_MS);
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
    const [profile, isAdmin] = await Promise.all([getUserProfile(currentUser.uid), resolveIsAdmin(currentUser)]);
    setState((prev) => ({ ...prev, firebaseUser: currentUser, userProfile: profile, isAdmin, loading: false }));
    // El listener de negocio arranca solo (o sigue corriendo, si el uid no cambió).
    return true;
  }

  async function resendVerificationEmail(): Promise<void> {
    if (!auth.currentUser) throw new Error('No hay sesión activa.');
    const { sendEmailVerification } = await import('firebase/auth');
    await sendEmailVerification(auth.currentUser);
  }

  async function markOnboardingComplete(skipped = false): Promise<void> {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return;
    // Optimistic update so the guard doesn't redirect back to onboarding
    setState((prev) => ({
      ...prev,
      userProfile: prev.userProfile
        ? { ...prev.userProfile, onboarding: { completed: true, skipped } }
        : prev.userProfile,
    }));
    // Write to Firestore — rethrow so caller can show an alert
    await completeOnboarding(currentUid, skipped);
  }

  return (
    <AuthContext.Provider
      value={{
        ...state,
        accountInconsistent,
        login,
        register,
        logout,
        refreshBusiness,
        forgotPassword,
        recheckEmailVerified,
        refreshSession,
        resendVerificationEmail,
        markOnboardingComplete,
        retryProfileLoad,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
