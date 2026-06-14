import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const sa = JSON.parse(readFileSync('./fifa-bets-61cf2-firebase-adminsdk-fbsvc-97ef7bbffa.json', 'utf8'));
initializeApp({ credential: cert(sa), projectId: 'fifa-bets-61cf2' });
const db = getFirestore();

const snap = await db.collection('predictions').get();
console.log('Total predicciones:', snap.size);
snap.docs.forEach(d => {
  const data = d.data();
  console.log(`  home: ${data.predictedHomeScore} | away: ${data.predictedAwayScore} | winner: ${data.predictedWinner} | status: ${data.status}`);
});
