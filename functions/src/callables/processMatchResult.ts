import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { logger } from 'firebase-functions';

const db = getFirestore();

const POINTS_EXACT = 10;
const POINTS_WINNER = 5;
const POINTS_INCORRECT = -2;

export const processMatchResult = onCall(async (request) => {
  // Admin only
  if (!request.auth) throw new HttpsError('unauthenticated', 'Not authenticated');

  const tokenResult = await getAuth().verifyIdToken(request.auth.token.uid ? request.auth.token.uid : '');
  void tokenResult;

  const claims = request.auth.token;
  if (!claims['admin']) throw new HttpsError('permission-denied', 'Admins only');

  const { matchId, homeScore, awayScore } = request.data as {
    matchId: string;
    homeScore: number;
    awayScore: number;
  };

  if (!matchId || homeScore == null || awayScore == null) {
    throw new HttpsError('invalid-argument', 'matchId, homeScore and awayScore required');
  }

  const matchRef = db.collection('matches').doc(matchId);
  const matchSnap = await matchRef.get();
  if (!matchSnap.exists) throw new HttpsError('not-found', 'Match not found');

  const match = matchSnap.data()!;
  if (match.status === 'finished') throw new HttpsError('already-exists', 'Already processed');

  const actualWinner =
    homeScore > awayScore ? 'home' :
    homeScore < awayScore ? 'away' : 'draw';

  // Update match
  await matchRef.update({
    status: 'finished',
    result: {
      homeScore,
      awayScore,
      winner: actualWinner,
      processedAt: Timestamp.now(),
    },
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Process predictions
  const predsSnap = await db.collection('predictions')
    .where('matchId', '==', matchId)
    .where('status', '==', 'pending')
    .get();

  if (predsSnap.empty) return { processed: 0 };

  const batch = db.batch();
  const userDeltas: Record<string, number> = {};

  predsSnap.docs.forEach((predDoc) => {
    const pred = predDoc.data();
    const isExact = pred.predictedHomeScore === homeScore && pred.predictedAwayScore === awayScore;
    const isWinner = pred.predictedWinner === actualWinner;

    let points: number;
    let status: string;

    if (isExact) {
      points = POINTS_EXACT;
      status = 'correct_exact';
    } else if (isWinner) {
      points = POINTS_WINNER;
      status = 'correct_winner';
    } else {
      points = POINTS_INCORRECT;
      status = 'incorrect';
    }

    batch.update(predDoc.ref, {
      status,
      pointsAwarded: points,
      updatedAt: FieldValue.serverTimestamp(),
    });

    userDeltas[pred.uid] = (userDeltas[pred.uid] ?? 0) + points;
  });

  // Update user points + stats and create transactions
  const userIds = Object.keys(userDeltas);
  const userSnaps = await Promise.all(userIds.map((uid) => db.collection('users').doc(uid).get()));

  userSnaps.forEach((userSnap) => {
    if (!userSnap.exists) return;
    const uid = userSnap.id;
    const delta = userDeltas[uid];
    const user = userSnap.data()!;
    const balanceAfter = (user.points ?? 0) + delta;
    const predForUser = predsSnap.docs.find((d) => d.data().uid === uid);

    batch.update(userSnap.ref, {
      points: FieldValue.increment(delta),
      totalPredictions: FieldValue.increment(1),
      correctPredictions: FieldValue.increment(delta > 0 ? 1 : 0),
      exactPredictions: FieldValue.increment(predForUser?.data().predictedHomeScore === homeScore && predForUser?.data().predictedAwayScore === awayScore ? 1 : 0),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const txRef = db.collection('point_transactions').doc();
    batch.set(txRef, {
      uid,
      delta,
      balanceAfter,
      reason: delta >= POINTS_EXACT ? 'correct_exact' : delta > 0 ? 'correct_winner' : 'incorrect',
      matchId,
      predictionId: predForUser?.id ?? null,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
  logger.info('processMatchResult completed', { matchId, processed: predsSnap.size });
  return { processed: predsSnap.size };
});
