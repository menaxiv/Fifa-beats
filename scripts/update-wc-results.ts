/**
 * FIFA World Cup 2026 — Update Match Results
 *
 * Fetches live/finished match data from ESPN public API and updates
 * existing Firestore match documents. Does NOT delete any data or
 * touch predictions — only updates status and result fields.
 *
 * Usage:
 *   cd scripts
 *   npm run update:wc:prod
 */

import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const isProd = process.env.PROD === 'true';
if (!isProd) process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
initializeApp({ projectId: isProd ? 'fifa-bets-61cf2' : 'demo-beats' });
const db = getFirestore();

// Normalize team names to a common form for fuzzy matching.
// Strips "men's"/"women's" suffix, lowercases, removes diacritics.
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\bmen's\b/g, '')
    .replace(/\bwomen's\b/g, '')
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõöø]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[ñ]/g, 'n')
    .replace(/\s+/g, ' ')
    .trim();
}

// Extra ESPN-specific aliases to try after normalization fails
const ESPN_ALIASES: Record<string, string[]> = {
  'czechia':            ['czech republic'],
  'bosnia-herzegovina': ['bosnia and herzegovina', 'bosnia & herzegovina'],
  'congo dr':           ['dr congo', 'congo'],
  'cape verde':         ['cabo verde'],
  'ivory coast':        ['cote d\'ivoire', 'coted\'ivoire'],
  'korea republic':     ['south korea'],
  'korea dpr':          ['north korea'],
  'usa':                ['united states'],
  'turkiye':            ['turkey', 'türkiye'],
  'turkey':             ['turkiye'],
};

// ESPN scoreboard endpoint — accepts date range like 20260611-20260620
async function fetchEspnMatches(dateFrom: string, dateTo: string): Promise<EspnEvent[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/FIFA.World/scoreboard?dates=${dateFrom}-${dateTo}&limit=200`;
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'BeatsApp/1.0' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!resp.ok) throw new Error(`ESPN HTTP ${resp.status}`);
  const data = await resp.json() as { events?: EspnEvent[] };
  return data.events ?? [];
}

interface EspnEvent {
  date: string;
  status: { type: { name: string; completed: boolean } };
  competitions: Array<{
    competitors: Array<{
      homeAway: 'home' | 'away';
      score: string;
      team: { displayName: string };
    }>;
  }>;
}

interface FirestoreMatch {
  id: string;
  homeTeamName: string;
  awayTeamName: string;
  status: string;
  tournament: string;
}

async function loadFirestoreMatches(): Promise<FirestoreMatch[]> {
  const snap = await db.collection('matches')
    .where('tournament', '==', 'FIFA World Cup 2026')
    .get();
  return snap.docs.map(d => ({
    id: d.id,
    homeTeamName: d.data().homeTeamName as string,
    awayTeamName: d.data().awayTeamName as string,
    status: d.data().status as string,
    tournament: d.data().tournament as string,
  }));
}

// Build a key for matching using normalized names
function matchKey(home: string, away: string): string {
  return `${normalizeName(home)}:${normalizeName(away)}`;
}

// Generate all alias combinations for an ESPN name
function espnAliases(name: string): string[] {
  const norm = normalizeName(name);
  const extras = ESPN_ALIASES[norm] ?? [];
  return [norm, ...extras];
}

async function main() {
  console.log('\n⚽  FIFA World Cup 2026 — Update Results from ESPN');
  console.log('──────────────────────────────────────────────────\n');

  // Date range: 10 days back to 2 days ahead to catch live + very recent matches
  const now = new Date();
  const from = new Date(now);
  from.setUTCDate(from.getUTCDate() - 10);
  const to = new Date(now);
  to.setUTCDate(to.getUTCDate() + 2);

  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;

  console.log(`📡  Fetching ESPN data from ${fmt(from)} to ${fmt(to)}...`);
  const espnEvents = await fetchEspnMatches(fmt(from), fmt(to));
  console.log(`    ${espnEvents.length} partidos encontrados en ESPN\n`);

  console.log(`📂  Cargando partidos de Firestore...`);
  const fsMatches = await loadFirestoreMatches();
  console.log(`    ${fsMatches.length} partidos en Firestore\n`);

  // Build lookup: normalizedKey → Firestore doc
  const keyToDoc = new Map<string, FirestoreMatch>();
  for (const m of fsMatches) {
    keyToDoc.set(matchKey(m.homeTeamName, m.awayTeamName), m);
  }

  // Try all alias combinations to find a Firestore doc for an ESPN match
  function findFirestoreDoc(espnHome: string, espnAway: string): { doc: FirestoreMatch; reversed: boolean } | null {
    const homeAliases = espnAliases(espnHome);
    const awayAliases = espnAliases(espnAway);
    for (const h of homeAliases) {
      for (const a of awayAliases) {
        const found = keyToDoc.get(`${h}:${a}`);
        if (found) return { doc: found, reversed: false };
        const foundRev = keyToDoc.get(`${a}:${h}`);
        if (foundRev) return { doc: foundRev, reversed: true };
      }
    }
    return null;
  }

  let updated = 0;
  let alreadyDone = 0;
  let notFound = 0;
  let pending = 0;

  const batch = db.batch();
  let batchCount = 0;

  for (const ev of espnEvents) {
    const comp = ev.competitions[0];
    if (!comp) continue;

    const homeComp = comp.competitors.find(c => c.homeAway === 'home');
    const awayComp = comp.competitors.find(c => c.homeAway === 'away');
    if (!homeComp || !awayComp) continue;

    const statusName = ev.status.type.name;
    const isFinished = ev.status.type.completed || statusName === 'STATUS_FULL_TIME' || statusName === 'STATUS_FINAL';
    const isLive = statusName === 'STATUS_IN_PROGRESS' || statusName === 'STATUS_HALFTIME';

    if (!isFinished && !isLive) {
      pending++;
      continue;
    }

    const espnHome = homeComp.team.displayName;
    const espnAway = awayComp.team.displayName;

    const match = findFirestoreDoc(espnHome, espnAway);
    const fsDoc = match?.doc;
    const isReversed = match?.reversed ?? false;

    if (!fsDoc) {
      console.log(`   ⚠  No encontrado en Firestore: ESPN "${espnHome}" vs "${espnAway}"`);
      notFound++;
      continue;
    }

    if (fsDoc.status === 'finished' && isFinished) {
      alreadyDone++;
      continue;
    }

    // Parse scores
    const rawHomeScore = isReversed ? awayComp.score : homeComp.score;
    const rawAwayScore = isReversed ? homeComp.score : awayComp.score;
    const homeScore = parseInt(rawHomeScore) || 0;
    const awayScore = parseInt(rawAwayScore) || 0;

    const winner = homeScore > awayScore ? 'home' : homeScore < awayScore ? 'away' : 'draw';
    const newStatus = isFinished ? 'finished' : 'live';

    const ref = db.collection('matches').doc(fsDoc.id);

    if (isFinished) {
      batch.update(ref, {
        status: newStatus,
        result: {
          homeScore,
          awayScore,
          winner,
          processedAt: Timestamp.now(),
        },
        updatedAt: Timestamp.now(),
      });
    } else {
      // Live: update status only (no final result yet)
      batch.update(ref, {
        status: newStatus,
        updatedAt: Timestamp.now(),
      });
    }

    batchCount++;
    console.log(`   ✅  ${newStatus.toUpperCase()}: ${fsDoc.homeTeamName} ${homeScore}–${awayScore} ${fsDoc.awayTeamName}`);
    updated++;

    // Commit in chunks to avoid 500-op limit
    if (batchCount >= 400) {
      await batch.commit();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log('\n📋  Resumen:');
  console.log(`   ✅  Actualizados:      ${updated}`);
  console.log(`   ⏭   Ya estaban listos: ${alreadyDone}`);
  console.log(`   ⏳  Sin resultado aún: ${pending}`);
  if (notFound > 0) console.log(`   ⚠   No encontrados:   ${notFound}`);

  const firestoreUrl = isProd
    ? 'https://console.firebase.google.com/project/fifa-bets-61cf2/firestore'
    : 'http://localhost:4000/firestore';
  console.log(`\n🎉  Listo — ${firestoreUrl}\n`);
}

main().catch((e) => {
  console.error('\n❌  Error fatal:', e);
  process.exit(1);
});
