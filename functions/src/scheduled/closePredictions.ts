import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

export const closePredictions = onSchedule('every 15 minutes', async () => {
  const db = getFirestore();
  const now = Timestamp.now();

  const snap = await db
    .collection('matches')
    .where('status', '==', 'upcoming')
    .where('predictionDeadline', '<=', now)
    .get();

  if (snap.empty) return;

  const batch = db.batch();
  snap.docs.forEach((doc) => {
    batch.update(doc.ref, {
      status: 'live',
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
});
