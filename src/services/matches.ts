import {
  collection, addDoc, updateDoc, deleteDoc, doc, getDoc, getDocs,
  query, where, orderBy, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Match, MatchStatus } from '@/types';

const COL = 'matches';

const MATCH_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours

function isEffectivelyLive(m: Match): boolean {
  const scheduled = m.scheduledAt.toDate();
  const now = new Date();
  return scheduled <= now && scheduled >= new Date(now.getTime() - MATCH_DURATION_MS);
}

export const getMatches = async (status?: MatchStatus): Promise<Match[]> => {
  if (status === 'live') {
    // Fetch both explicitly-live docs and upcoming docs that have already started
    const [liveSnap, upcomingSnap] = await Promise.all([
      getDocs(query(collection(db, COL), where('status', '==', 'live'), orderBy('scheduledAt'))),
      getDocs(query(collection(db, COL), where('status', '==', 'upcoming'), orderBy('scheduledAt'))),
    ]);
    const liveMatches = liveSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Match);
    const effectiveLive = upcomingSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as Match)
      .filter(isEffectivelyLive);
    const seen = new Set(liveMatches.map((m) => m.id));
    return [...liveMatches, ...effectiveLive.filter((m) => !seen.has(m.id))];
  }

  const q = status
    ? query(collection(db, COL), where('status', '==', status), orderBy('scheduledAt'))
    : query(collection(db, COL), orderBy('scheduledAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Match);
};

export const createMatch = (data: {
  sport: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  scheduledAt: Date;
  predictionDeadline: Date;
  tournament?: string;
  stage?: string;
}) =>
  addDoc(collection(db, COL), {
    ...data,
    scheduledAt: Timestamp.fromDate(data.scheduledAt),
    predictionDeadline: Timestamp.fromDate(data.predictionDeadline),
    status: 'upcoming',
    result: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

export const updateMatch = (id: string, data: Partial<Omit<Match, 'id' | 'createdAt'>>) =>
  updateDoc(doc(db, COL, id), { ...data, updatedAt: serverTimestamp() });

export const deleteMatch = (id: string) => deleteDoc(doc(db, COL, id));

export const getMatch = async (id: string): Promise<Match | null> => {
  const snap = await getDoc(doc(db, COL, id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Match) : null;
};
