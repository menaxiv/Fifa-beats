import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuthStore } from '@/store/authStore';
import type { User as UserProfile } from '@/types';

export function useUserProfile() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!user) { setProfile(null); return; }
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) setProfile(snap.data() as UserProfile);
    });
    return unsub;
  }, [user]);

  return profile;
}
