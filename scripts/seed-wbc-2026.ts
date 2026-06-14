/**
 * World Baseball Classic 2026 — Seed Script
 * Fuente: ESPN Site API (sin API key)
 * Liga: world-baseball-classic
 */

import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const isProd = process.env.PROD === 'true';
if (!isProd) process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
initializeApp({ projectId: isProd ? 'fifa-bets-61cf2' : 'demo-beats' });
const db = getFirestore();

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/baseball/world-baseball-classic';

interface ESPNTeam { displayName: string; abbreviation: string; logo?: string; }
interface ESPNEvent {
  name: string;
  date: string;
  status: { type: { name: string } };
  competitions: Array<{
    competitors: Array<{ homeAway: string; team: ESPNTeam; score: string }>;
    venue?: { fullName?: string };
    notes?: Array<{ headline?: string }>;
  }>;
}

async function fetchWBCEvents(): Promise<ESPNEvent[]> {
  const url = `${ESPN_BASE}/scoreboard?dates=20260101-20260630&limit=200`;
  console.log('📡  Fetching WBC 2026 from ESPN...');
  const r = await fetch(url, {
    headers: { 'User-Agent': 'BeatsApp/1.0 seed script' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!r.ok) throw new Error(`ESPN HTTP ${r.status}`);
  const j = await r.json();
  return j.events ?? [];
}

// Country ISO codes for flag CDN
const NATION_FLAG: Record<string, string> = {
  USA: 'us', JPN: 'jp', KOR: 'kr', DOM: 'do', VEN: 've', MEX: 'mx',
  CUB: 'cu', PUR: 'pr', CAN: 'ca', ITA: 'it', NED: 'nl', PAN: 'pa',
  COL: 'co', AUS: 'au', TPO: 'tw', CZE: 'cz', ISR: 'il', NCA: 'ni',
  BRA: 'br', GBR: 'gb', ARG: 'ar', CHI: 'cl',
};
const FLAG_CDN = (abbr: string) => {
  const code = NATION_FLAG[abbr];
  return code ? `https://flagcdn.com/w40/${code}.png` : '';
};

// Stage label from date
function inferStage(date: Date, events: ESPNEvent[]): string {
  const d = date.getTime();
  const first = new Date(events[0].date).getTime();
  const last = new Date(events[events.length - 1].date).getTime();
  const pct = (d - first) / (last - first);
  if (pct < 0.6) return 'Fase de grupos';
  if (pct < 0.8) return 'Cuartos de final';
  if (pct < 0.95) return 'Semifinal';
  return 'Final';
}

async function main() {
  console.log('\n⚾  World Baseball Classic 2026 — Seed Script');
  console.log('────────────────────────────────────────────\n');

  const events = await fetchWBCEvents();
  console.log(`   ${events.length} partidos encontrados\n`);
  if (events.length === 0) { console.error('❌ Sin datos'); process.exit(1); }

  // ── Sport ──────────────────────────────────────────────────────────────
  await db.collection('sports').doc('baseball').set({
    name: 'Béisbol', icon: '⚾', active: true, createdAt: Timestamp.now(),
  }, { merge: true });
  console.log('✅  Sport: Béisbol');

  // ── Teams ─────────────────────────────────────────────────────────────
  const teamMap = new Map<string, { name: string; abbr: string; logo: string }>();
  for (const ev of events) {
    for (const c of ev.competitions[0]?.competitors ?? []) {
      if (!teamMap.has(c.team.abbreviation)) {
        teamMap.set(c.team.abbreviation, {
          name: c.team.displayName,
          abbr: c.team.abbreviation,
          logo: c.team.logo ?? FLAG_CDN(c.team.abbreviation),
        });
      }
    }
  }

  const existingBB = await db.collection('teams').where('sport', '==', 'baseball').get();
  if (!existingBB.empty) {
    const b = db.batch(); existingBB.docs.forEach((d) => b.delete(d.ref)); await b.commit();
  }

  const nameToId = new Map<string, string>();
  const nameToLogo = new Map<string, string>();
  const CHUNK = 25;
  const teamsArr = [...teamMap.values()];
  for (let i = 0; i < teamsArr.length; i += CHUNK) {
    const batch = db.batch();
    for (const t of teamsArr.slice(i, i + CHUNK)) {
      const ref = db.collection('teams').doc();
      nameToId.set(t.name, ref.id);
      nameToId.set(t.abbr, ref.id);
      nameToLogo.set(t.name, t.logo);
      nameToLogo.set(t.abbr, t.logo);
      batch.set(ref, { sport: 'baseball', name: t.name, shortName: t.abbr, flagUrl: t.logo, active: true });
    }
    await batch.commit();
  }
  console.log(`✅  Selecciones: ${teamMap.size}`);

  // ── Remove existing baseball matches ─────────────────────────────────
  const existingM = await db.collection('matches').where('sport', '==', 'baseball').limit(300).get();
  if (!existingM.empty) {
    const b = db.batch(); existingM.docs.forEach((d) => b.delete(d.ref)); await b.commit();
    console.log(`   🗑  ${existingM.size} partidos béisbol borrados`);
  }

  // ── Matches ───────────────────────────────────────────────────────────
  let created = 0;
  const now = new Date();

  for (let i = 0; i < events.length; i += CHUNK) {
    const batch = db.batch();
    for (const ev of events.slice(i, i + CHUNK)) {
      const comp = ev.competitions[0];
      const homeC = comp?.competitors?.find((c) => c.homeAway === 'home');
      const awayC = comp?.competitors?.find((c) => c.homeAway === 'away');
      if (!homeC || !awayC) continue;

      // Look up by name first, then abbreviation
      const homeId = nameToId.get(homeC.team.displayName) ?? nameToId.get(homeC.team.abbreviation);
      const awayId = nameToId.get(awayC.team.displayName) ?? nameToId.get(awayC.team.abbreviation);
      if (!homeId || !awayId) continue;

      const scheduledAt = new Date(ev.date);
      const predDeadline = new Date(scheduledAt.getTime() - 60 * 60 * 1000);
      const isFinished = ev.status?.type?.name === 'STATUS_FINAL';
      const homeScore = isFinished ? parseInt(homeC.score) || 0 : null;
      const awayScore = isFinished ? parseInt(awayC.score) || 0 : null;
      const isLive = !isFinished && scheduledAt <= now && scheduledAt > new Date(now.getTime() - 4 * 60 * 60 * 1000);

      const winner = isFinished && homeScore !== null && awayScore !== null
        ? homeScore > awayScore ? 'home' : homeScore < awayScore ? 'away' : 'draw'
        : null;

      const stage = inferStage(scheduledAt, events);

      const ref = db.collection('matches').doc();
      batch.set(ref, {
        sport: 'baseball',
        homeTeamId: homeId,
        awayTeamId: awayId,
        homeTeamName: homeC.team.displayName,
        awayTeamName: awayC.team.displayName,
        homeTeamFlagUrl: nameToLogo.get(homeC.team.displayName) ?? nameToLogo.get(homeC.team.abbreviation) ?? '',
        awayTeamFlagUrl: nameToLogo.get(awayC.team.displayName) ?? nameToLogo.get(awayC.team.abbreviation) ?? '',
        scheduledAt: Timestamp.fromDate(scheduledAt),
        predictionDeadline: Timestamp.fromDate(predDeadline),
        tournament: 'World Baseball Classic 2026',
        stage,
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

  // Summary
  const finished = events.filter((e) => e.status?.type?.name === 'STATUS_FINAL').length;
  const upcoming = events.length - finished;
  console.log(`   Finalizados: ${finished}  |  Próximos: ${upcoming}`);
  const firestoreUrl = isProd
    ? 'https://console.firebase.google.com/project/fifa-bets-61cf2/firestore'
    : 'http://localhost:4000/firestore';
  console.log(`\n🎉  WBC 2026 listo — ${firestoreUrl}\n`);
}

main().catch((e) => { console.error('❌', e); process.exit(1); });
