import {
  collection, addDoc, updateDoc, deleteDoc, doc, getDocs,
  query, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Sport } from '@/types';

const COL = 'sports';

export const getSports = async (): Promise<Sport[]> => {
  const snap = await getDocs(query(collection(db, COL), orderBy('name')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Sport);
};

export const createSport = (data: Pick<Sport, 'name' | 'active' | 'icon'>) =>
  addDoc(collection(db, COL), { ...data, createdAt: serverTimestamp() });

export const updateSport = (id: string, data: Partial<Pick<Sport, 'name' | 'active' | 'icon'>>) =>
  updateDoc(doc(db, COL, id), data);

export const deleteSport = (id: string) => deleteDoc(doc(db, COL, id));
