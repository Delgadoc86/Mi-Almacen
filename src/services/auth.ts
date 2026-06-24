import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  reload,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from './firebase';

export async function registerWithEmail(email: string, password: string): Promise<FirebaseUser> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(credential.user);
  return credential.user;
}

export async function loginWithEmail(email: string, password: string): Promise<FirebaseUser> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

export async function reloadUser(): Promise<FirebaseUser | null> {
  if (!auth.currentUser) return null;
  await reload(auth.currentUser);
  return auth.currentUser;
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export function subscribeToAuthChanges(
  callback: (user: FirebaseUser | null) => void,
): () => void {
  return onAuthStateChanged(auth, callback);
}
