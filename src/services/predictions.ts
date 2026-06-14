import {
  collection, doc, setDoc, updateDoc, getDocs, getDoc,
  query, where, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { getMatch } from './matches';
import type { Match, Prediction, Winner } from '@/types';

const COL = 'predictions';

export const getPrediction = async (uid: string, matchId: string): Promise<Prediction | null> => {
  const snap = await getDoc(doc(db, COL, `${uid}_${matchId}`));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Prediction) : null;
};

export const savePrediction = async (
  uid: string,
  matchId: string,
  sport: string,
  predictedHomeScore: number,
  predictedAwayScore: number,
  isUpdate: boolean,
): Promise<void> => {
  const predictedWinner: Winner =
    predictedHomeScore > predictedAwayScore ? 'home' :
    predictedHomeScore < predictedAwayScore ? 'away' : 'draw';

  const id = `${uid}_${matchId}`;
  const ref = doc(db, COL, id);

  if (isUpdate) {
    await updateDoc(ref, {
      predictedHomeScore,
      predictedAwayScore,
      predictedWinner,
      updatedAt: serverTimestamp(),
    });
  } else {
    await setDoc(ref, {
      id,
      uid,
      matchId,
      sport,
      predictedHomeScore,
      predictedAwayScore,
      predictedWinner,
      pointsAwarded: null,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
};

export const getMyPredictions = async (uid: string): Promise<Prediction[]> => {
  const q = query(collection(db, COL), where('uid', '==', uid), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Prediction);
};

export const getMyPredictionsWithMatches = async (
  uid: string,
): Promise<Array<{ prediction: Prediction; match: Match | null }>> => {
  const predictions = await getMyPredictions(uid);
  if (predictions.length === 0) return [];

  const matchIds = [...new Set(predictions.map((p) => p.matchId))];
  const matches = await Promise.all(matchIds.map(getMatch));
  const matchMap: Record<string, Match> = {};
  matches.forEach((m) => { if (m) matchMap[m.id] = m; });

  return predictions.map((prediction) => ({
    prediction,
    match: matchMap[prediction.matchId] ?? null,
  }));
};
