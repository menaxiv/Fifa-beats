import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuthStore } from '@/store/authStore';
import type { User as UserProfile } from '@/types';

export function useUserProfile() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!user) { setProfile(null); return; }
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        setProfile(snap.data() as UserProfile);
      } else {
        // Crear documento si no existe (usuarios registrados antes de esta versión)
        setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          displayName: user.displayName ?? user.email?.split('@')[0] ?? 'Usuario',
          email: user.email ?? '',
          points: 50,
          totalPredictions: 0,
          correctPredictions: 0,
          exactPredictions: 0,
          createdAt: serverTimestamp(),
        });
      }
    });
    return unsub;
  }, [user]);

  return profile;
}
