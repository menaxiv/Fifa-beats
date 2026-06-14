import { useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '@/services/firebase';
import { useAuthStore } from '@/store/authStore';

export function useAuthListener() {
  const setUser = useAuthStore((s) => s.setUser);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const token = await user.getIdTokenResult();
        setUser(user, !!token.claims.admin);
      } else {
        setUser(null, false);
      }
    });
    return unsubscribe;
  }, [setUser]);
}

export function useAuth() {
  const signIn = (email: string, password: string) =>
    signInWithEmailAndPassword(auth, email, password);

  const signUp = async (email: string, password: string) => {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(user);
  };

  const logOut = () => signOut(auth);

  const resetPassword = (email: string) => sendPasswordResetEmail(auth, email);

  return { signIn, signUp, logOut, resetPassword };
}
