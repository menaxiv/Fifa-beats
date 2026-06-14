import { useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/services/firebase';
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

  const signUp = async (email: string, password: string, displayName: string) => {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await Promise.all([
      updateProfile(user, { displayName }),
      setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        displayName,
        email,
        points: 50,
        totalPredictions: 0,
        correctPredictions: 0,
        exactPredictions: 0,
        createdAt: serverTimestamp(),
      }),
      sendEmailVerification(user),
    ]);
  };

  const logOut = () => signOut(auth);

  const resetPassword = (email: string) => sendPasswordResetEmail(auth, email);

  return { signIn, signUp, logOut, resetPassword };
}
