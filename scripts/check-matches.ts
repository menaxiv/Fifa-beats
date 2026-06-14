import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const sa = JSON.parse(readFileSync('./fifa-bets-61cf2-firebase-adminsdk-fbsvc-97ef7bbffa.json', 'utf8'));
initializeApp({ credential: cert(sa), projectId: 'fifa-bets-61cf2' });
const db = getFirestore();

const finished = await db.collection('matches').where('status', '==', 'finished').get();
console.log('Partidos finalizados:', finished.size);
finished.docs.forEach(d => {
  const m = d.data();
  console.log(`  ${m.homeTeamName} ${m.result?.homeScore ?? '?'} – ${m.result?.awayScore ?? '?'} ${m.awayTeamName} | stage: ${m.stage}`);
});

const upcoming = await db.collection('matches').where('status', '==', 'upcoming').orderBy('scheduledAt').limit(5).get();
console.log('\nPróximos (primeros 5):');
upcoming.docs.forEach(d => {
  const m = d.data();
  console.log(`  ${m.homeTeamName} vs ${m.awayTeamName} — ${m.scheduledAt?.toDate()} | stage: ${m.stage}`);
});
