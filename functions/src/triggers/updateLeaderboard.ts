import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const db = getFirestore();
const LEADERBOARD_DOC = 'leaderboards/global';
const TOP_N = 50;

export const updateLeaderboard = onDocumentWritten('users/{uid}', async () => {
  const snap = await db.collection('users')
    .orderBy('points', 'desc')
    .limit(TOP_N)
    .get();

  const entries = snap.docs.map((d, i) => {
    const data = d.data();
    return {
      rank: i + 1,
      uid: d.id,
      displayName: data.displayName ?? 'Usuario',
      avatarUrl: data.avatarUrl ?? null,
      points: data.points ?? 0,
    };
  });

  await db.doc(LEADERBOARD_DOC).set({
    entries,
    updatedAt: FieldValue.serverTimestamp(),
  });
});
