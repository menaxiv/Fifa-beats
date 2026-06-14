/**
 * NFL Preseason 2026 — Seed Script
 * Fuente: ESPN Site API (sin API key)
 */

import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const isProd = process.env.PROD === 'true';
if (!isProd) process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
initializeApp({ projectId: isProd ? 'fifa-bets-61cf2' : 'demo-beats' });
const db = getFirestore();

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';

interface ESPNTeam { displayName: string; abbreviation: string; logo: string; }
interface ESPNEvent {
  id: string;
  name: string;
  date: string;
  status: { type: { name: string } };
  competitions: Array<{
    competitors: Array<{ homeAway: string; team: ESPNTeam; score: string }>;
    venue: { fullName: string; address?: { city: string; state: string } };
  }>;
}

async function fetchAllPreseasonGames(): Promise<ESPNEvent[]> {
  const url = `${ESPN_BASE}/scoreboard?seasontype=1&dates=20260801-20260901&limit=100`;
  console.log('📡  Fetching NFL Preseason from ESPN...');
  const r = await fetch(url, {
    headers: { 'User-Agent': 'BeatsApp/1.0 seed script' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!r.ok) throw new Error(`ESPN HTTP ${r.status}`);
  const j = await r.json();
  return j.events ?? [];
}

async function clearCollection(col: string) {
  const snap = await db.collection(col).where('sport', '==', 'nfl').limit(300).get();
  if (snap.empty) return;
  const b = db.batch();
  snap.docs.forEach((d) => b.delete(d.ref));
  await b.commit();
  console.log(`   🗑  ${snap.size} docs NFL borrados de '${col}'`);
}

async function main() {
  console.log('\n🏈  NFL Preseason 2026 — Seed Script');
  console.log('────────────────────────────────────────\n');

  const events = await fetchAllPreseasonGames();
  console.log(`   ${events.length} partidos encontrados\n`);

  if (events.length === 0) { console.error('❌ Sin datos'); process.exit(1); }

  // ── Upsert sport ────────────────────────────────────────────────────────
  await db.collection('sports').doc('nfl').set({
    name: 'Fútbol Americano', icon: '🏈', active: true, createdAt: Timestamp.now(),
  }, { merge: true });
  console.log('✅  Sport: Fútbol Americano (NFL)');

  // ── Collect unique teams from events ────────────────────────────────────
  const teamMap = new Map<string, { name: string; short: string; logo: string }>();
  for (const ev of events) {
    const comp = ev.competitions[0];
    for (const c of comp?.competitors ?? []) {
      if (!teamMap.has(c.team.displayName)) {
        teamMap.set(c.team.displayName, {
          name: c.team.displayName,
          short: c.team.abbreviation,
          logo: c.team.logo ?? '',
        });
      }
    }
  }

  // Remove existing NFL teams and recreate
  const existingNFLTeams = await db.collection('teams').where('sport', '==', 'nfl').get();
  if (!existingNFLTeams.empty) {
    const b = db.batch();
    existingNFLTeams.docs.forEach((d) => b.delete(d.ref));
    await b.commit();
  }

  const nameToId = new Map<string, string>();
  const nameToLogo = new Map<string, string>();
  const CHUNK = 25;
  const teamsArr = [...teamMap.values()];
  for (let i = 0; i < teamsArr.length; i += CHUNK) {
    const batch = db.batch();
    for (const team of teamsArr.slice(i, i + CHUNK)) {
      const ref = db.collection('teams').doc();
      nameToId.set(team.name, ref.id);
      nameToLogo.set(team.name, team.logo);
      batch.set(ref, { sport: 'nfl', name: team.name, shortName: team.short, flagUrl: team.logo, active: true });
    }
    await batch.commit();
  }
  console.log(`✅  Equipos: ${teamMap.size}`);

  // ── Remove existing NFL matches ──────────────────────────────────────────
  await clearCollection('matches');

  // ── Seed matches ─────────────────────────────────────────────────────────
  let created = 0;
  const now = new Date();

  for (let i = 0; i < events.length; i += CHUNK) {
    const batch = db.batch();
    for (const ev of events.slice(i, i + CHUNK)) {
      const comp = ev.competitions[0];
      const homeC = comp?.competitors?.find((c) => c.homeAway === 'home');
      const awayC = comp?.competitors?.find((c) => c.homeAway === 'away');
      if (!homeC || !awayC) continue;

      const homeId = nameToId.get(homeC.team.displayName);
      const awayId = nameToId.get(awayC.team.displayName);
      if (!homeId || !awayId) continue;

      const scheduledAt = new Date(ev.date);
      const predDeadline = new Date(scheduledAt.getTime() - 60 * 60 * 1000);

      const isFinished = ev.status?.type?.name === 'STATUS_FINAL';
      const homeScore = isFinished ? parseInt(homeC.score) : null;
      const awayScore = isFinished ? parseInt(awayC.score) : null;
      const isLive = !isFinished && scheduledAt <= now && scheduledAt > new Date(now.getTime() - 4 * 60 * 60 * 1000);

      const winner = isFinished && homeScore !== null && awayScore !== null
        ? homeScore > awayScore ? 'home' : homeScore < awayScore ? 'away' : 'draw'
        : null;

      const ref = db.collection('matches').doc();
      batch.set(ref, {
        sport: 'nfl',
        homeTeamId: homeId,
        awayTeamId: awayId,
        homeTeamName: homeC.team.displayName,
        awayTeamName: awayC.team.displayName,
        homeTeamFlagUrl: nameToLogo.get(homeC.team.displayName) ?? '',
        awayTeamFlagUrl: nameToLogo.get(awayC.team.displayName) ?? '',
        scheduledAt: Timestamp.fromDate(scheduledAt),
        predictionDeadline: Timestamp.fromDate(predDeadline),
        tournament: 'NFL Preseason 2026',
        stage: 'Pretemporada',
        venue: comp?.venue?.fullName ?? 'TBD',
        status: isFinished ? 'finished' : isLive ? 'live' : 'upcoming',
        result: isFinished && homeScore !== null && awayScore !== null
          ? { homeScore, awayScore, winner, processedAt: Timestamp.now() }
          : null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      created++;
    }
    await batch.commit();
  }

  console.log(`✅  Partidos: ${created}`);
  const firestoreUrl = isProd
    ? 'https://console.firebase.google.com/project/fifa-bets-61cf2/firestore'
    : 'http://localhost:4000/firestore';
  console.log(`\n🎉  NFL Preseason 2026 listo — ${firestoreUrl}\n`);
}

main().catch((e) => { console.error('❌', e); process.exit(1); });
