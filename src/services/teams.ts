import {
  collection, addDoc, updateDoc, deleteDoc, doc, getDocs,
  query, where, orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Team } from '@/types';

const COL = 'teams';

export const getTeams = async (sport?: string): Promise<Team[]> => {
  const q = sport
    ? query(collection(db, COL), where('sport', '==', sport), orderBy('name'))
    : query(collection(db, COL), orderBy('name'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Team);
};

export const createTeam = (data: Omit<Team, 'id'>) =>
  addDoc(collection(db, COL), data);

export const updateTeam = (id: string, data: Partial<Omit<Team, 'id'>>) =>
  updateDoc(doc(db, COL, id), data);

export const deleteTeam = (id: string) => deleteDoc(doc(db, COL, id));
