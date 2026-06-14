import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/services/firebase';

export interface Sport { id: string; name: string; icon: string; }

export function useSports() {
  const [sports, setSports] = useState<Sport[]>([]);

  useEffect(() => {
    getDocs(query(collection(db, 'sports'), where('active', '==', true))).then((snap) => {
      setSports(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Sport, 'id'>) })));
    });
  }, []);

  return sports;
}
