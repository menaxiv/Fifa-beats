/**
 * Deletes predictions whose matchId no longer exists in the matches collection.
 * Run this after re-seeding matches with new IDs.
 *
 *   cd scripts
 *   PROD=true tsx cleanup-orphaned-predictions.ts
 */

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const isProd = process.env.PROD === 'true';
if (!isProd) process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
initializeApp({ projectId: isProd ? 'fifa-bets-61cf2' : 'demo-beats' });
const db = getFirestore();

async function main() {
  console.log('\n🧹  Cleanup: orphaned predictions');
  console.log('──────────────────────────────────\n');

  // Load all existing match IDs
  const matchSnap = await db.collection('matches').select().get();
  const validMatchIds = new Set(matchSnap.docs.map(d => d.id));
  console.log(`📂  Matches válidos: ${validMatchIds.size}`);

  // Load all predictions
  const predSnap = await db.collection('predictions').get();
  console.log(`📂  Predicciones totales: ${predSnap.size}`);

  const orphaned = predSnap.docs.filter(d => !validMatchIds.has(d.data().matchId as string));
  console.log(`⚠   Predicciones huérfanas: ${orphaned.length}\n`);

  if (orphaned.length === 0) {
    console.log('✅  Nada que limpiar.\n');
    return;
  }

  // Delete in batches of 400
  const CHUNK = 400;
  for (let i = 0; i < orphaned.length; i += CHUNK) {
    const batch = db.batch();
    orphaned.slice(i, i + CHUNK).forEach(d => {
      console.log(`   🗑  Borrando predicción: ${d.id} (matchId: ${d.data().matchId})`);
      batch.delete(d.ref);
    });
    await batch.commit();
  }

  console.log(`\n✅  ${orphaned.length} predicciones huérfanas eliminadas.\n`);
}

main().catch(e => {
  console.error('\n❌  Error:', e);
  process.exit(1);
});
