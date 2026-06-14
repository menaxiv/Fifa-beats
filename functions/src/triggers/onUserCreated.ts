import { user } from 'firebase-functions/v1/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';

export const onUserCreated = user().onCreate(async (userRecord) => {
  logger.info('New user created', { uid: userRecord.uid, email: userRecord.email });
  const db = getFirestore();
  await db.collection('users').doc(userRecord.uid).set({
    uid: userRecord.uid,
    displayName: userRecord.displayName ?? userRecord.email?.split('@')[0] ?? 'Usuario',
    email: userRecord.email ?? '',
    avatarUrl: userRecord.photoURL ?? null,
    points: 50,
    totalPredictions: 0,
    correctPredictions: 0,
    exactPredictions: 0,
    emailVerified: userRecord.emailVerified,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
});
