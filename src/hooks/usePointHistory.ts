import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuthStore } from '@/store/authStore';
import type { PointTransaction } from '@/types';

export function usePointHistory(maxItems = 20) {
  const { user } = useAuthStore();
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) { setIsLoading(false); return; }
    const q = query(
      collection(db, 'point_transactions'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(maxItems),
    );
    getDocs(q)
      .then((snap) => setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PointTransaction)))
      .catch(() => setTransactions([]))
      .finally(() => setIsLoading(false));
  }, [user, maxItems]);

  return { transactions, isLoading };
}
