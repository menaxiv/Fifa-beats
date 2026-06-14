/**
 * FIFA World Cup 2026 — Seed Script
 *
 * Fuentes (sin API key):
 *   1. Wikipedia REST API  →  cada página de grupo (A–L)
 *      https://en.wikipedia.org/api/rest_v1/page/html/2026_FIFA_World_Cup_Group_{X}
 *
 * Ejecutar con los emuladores corriendo:
 *   cd scripts && npm install && npm run seed:wc
 */

import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';

// ── Emulator ───────────────────────────────────────────────────────────────
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
initializeApp({ projectId: 'demo-beats' });
const db = getFirestore();

// ── Types ──────────────────────────────────────────────────────────────────
interface TeamData {
  name: string;
  shortName: string;
  flagUrl: string;
  group: string;
}

interface MatchData {
  homeTeam: string;
  awayTeam: string;
  scheduledAt: Date;
  predictionDeadline: Date;
  venue: string;
  stage: string;
  homeScore: number | null;
  awayScore: number | null;
}

// ── Name normalization (Wikipedia titles → display names) ─────────────────
const NAME_MAP: Record<string, string> = {
  'United States national soccer team': 'United States',
  'United States men\'s national soccer team': 'United States',
  'Mexico national football team': 'Mexico',
  'Canada men\'s national soccer team': 'Canada',
  'England national football team': 'England',
  'Scotland national football team': 'Scotland',
  'Wales national football team': 'Wales',
  'Korea Republic national football team': 'South Korea',
  'Korea DPR national football team': 'North Korea',
  'Ivory Coast national football team': 'Ivory Coast',
  "Côte d'Ivoire national football team": 'Ivory Coast',
  'DR Congo national football team': 'DR Congo',
  'Czech Republic national football team': 'Czech Republic',
  'Türkiye national football team': 'Türkiye',
};

const SHORT: Record<string, string> = {
  'United States': 'USA', Mexico: 'MEX', Canada: 'CAN',
  England: 'ENG', Scotland: 'SCO', Wales: 'WAL',
  Germany: 'GER', France: 'FRA', Spain: 'ESP',
  Italy: 'ITA', Portugal: 'POR', Netherlands: 'NED',
  Belgium: 'BEL', Switzerland: 'SUI', Denmark: 'DEN',
  Croatia: 'CRO', Austria: 'AUT', Serbia: 'SRB',
  Poland: 'POL', Ukraine: 'UKR', Türkiye: 'TUR',
  Hungary: 'HUN', Slovakia: 'SVK', Romania: 'ROU',
  Brazil: 'BRA', Argentina: 'ARG', Colombia: 'COL',
  Uruguay: 'URU', Ecuador: 'ECU', Paraguay: 'PAR',
  Chile: 'CHI', Venezuela: 'VEN', Bolivia: 'BOL', Peru: 'PER',
  Japan: 'JPN', 'South Korea': 'KOR', Iran: 'IRN',
  'Saudi Arabia': 'KSA', Australia: 'AUS', 'New Zealand': 'NZL',
  Indonesia: 'IDN', Jordan: 'JOR', Iraq: 'IRQ', Qatar: 'QAT',
  Morocco: 'MAR', Senegal: 'SEN', Nigeria: 'NGA', Egypt: 'EGY',
  Ghana: 'GHA', Cameroon: 'CMR', Tunisia: 'TUN', Algeria: 'ALG',
  'South Africa': 'RSA', 'Ivory Coast': 'CIV', 'DR Congo': 'COD',
  'Czech Republic': 'CZE',
};

function normalizeName(raw: string): string {
  const clean = raw.trim().replace(/\s+/g, ' ');
  return NAME_MAP[clean] ?? clean;
}

function makeShort(name: string): string {
  if (SHORT[name]) return SHORT[name];
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 1) return name.slice(0, 3).toUpperCase();
  return words.map((w) => w[0]).join('').toUpperCase().slice(0, 3);
}

// ── Time parsing ───────────────────────────────────────────────────────────
// Wikipedia time format: "1:00 p.m. UTC−6" or "8:00 p.m. UTC+1"
// Note: Wikipedia uses "−" (U+2212) not "-"
function parseMatchDate(isoDate: string, timeStr: string): Date {
  const [y, mo, d] = isoDate.split('-').map(Number);

  // Parse hour/minute
  const timeParts = timeStr.match(/(\d{1,2}):(\d{2})\s*(a\.m\.|p\.m\.)/i);
  let hour = timeParts ? parseInt(timeParts[1]) : 18;
  const min = timeParts ? parseInt(timeParts[2]) : 0;
  const isPM = timeParts ? /p\.m\./i.test(timeParts[3]) : true;

  if (isPM && hour !== 12) hour += 12;
  if (!isPM && hour === 12) hour = 0;

  // Parse UTC offset (handles both − U+2212 and regular -)
  const offsetMatch = timeStr.match(/UTC[−\-](\d+)/i);
  const offset = offsetMatch ? parseInt(offsetMatch[1]) : 0;
  const utcHour = hour + offset; // UTC = local + |negative offset|

  const date = new Date(Date.UTC(y, mo - 1, d, utcHour % 24, min));
  if (utcHour >= 24) date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

// ── Wikipedia scraper ──────────────────────────────────────────────────────
const WIKI_BASE = 'https://en.wikipedia.org/api/rest_v1/page/html';
const DELAY_MS = 1200; // polite rate limit

async function fetchGroupPage(group: string): Promise<string> {
  const url = `${WIKI_BASE}/2026_FIFA_World_Cup_Group_${group}`;
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'BeatsApp/1.0 (educational seed script; contact: dev@beats.app)',
      'Accept': 'text/html',
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for Group ${group}`);
  return resp.text();
}

function flagUrlFromBox($: CheerioAPI, th: ReturnType<CheerioAPI>): string {
  const img = th.find('.flagicon img, .mw-image-border img').first();
  const src = img.attr('src') || '';
  return src.startsWith('//') ? `https:${src}` : src;
}

function parseGroupPage(
  html: string,
  group: string,
): { teams: TeamData[]; matches: MatchData[] } {
  const $ = cheerio.load(html);
  const teams: TeamData[] = [];
  const matches: MatchData[] = [];

  // ── Teams collected from football boxes (home + away of all 6 matches) ──
  const teamFlagMap = new Map<string, string>(); // name → flagUrl

  // ── Matches from football boxes ──────────────────────────────────────────
  $('.footballbox').each((_, el) => {
    const box = $(el);

    // Team names via schema.org itemprop
    const homeRaw = extractTeamName($, box.find('.fhome'));
    const awayRaw = extractTeamName($, box.find('.faway'));
    if (!homeRaw || !awayRaw) return;

    const home = normalizeName(homeRaw);
    const away = normalizeName(awayRaw);

    // Collect flags while iterating matches
    if (!teamFlagMap.has(home)) teamFlagMap.set(home, flagUrlFromBox($, box.find('.fhome')));
    if (!teamFlagMap.has(away)) teamFlagMap.set(away, flagUrlFromBox($, box.find('.faway')));

    // Score ("Match N" = upcoming, "2–1" = finished)
    const scoreText = box.find('.fscore').text().replace(/\s+/g, ' ').trim();
    const scoreMatch = scoreText.match(/(\d+)\s*[–\-]\s*(\d+)/);
    const homeScore = scoreMatch ? parseInt(scoreMatch[1]) : null;
    const awayScore = scoreMatch ? parseInt(scoreMatch[2]) : null;

    // Date & time
    const isoDate = box.find('.itvstart').text().trim();
    const timeRaw = box.find('.ftime').text().replace(/\s+/g, ' ').trim();
    if (!isoDate) return;

    const scheduledAt = parseMatchDate(isoDate, timeRaw);
    const predictionDeadline = new Date(scheduledAt.getTime() - 60 * 60 * 1000);

    // Venue from itemprop=location
    const venueEl = box.find('[itemprop="location"] [itemprop="name address"]');
    const venue = venueEl.length
      ? venueEl.text().replace(/\s+/g, ' ').trim()
      : box.find('.fright').text().replace(/Referee:.*/, '').replace(/\s+/g, ' ').trim();

    matches.push({
      homeTeam: home,
      awayTeam: away,
      scheduledAt,
      predictionDeadline,
      venue: venue || 'TBD',
      stage: `Group ${group}`,
      homeScore,
      awayScore,
    });
  });

  // Build teams list from collected map (unique, ordered)
  for (const [name, flagUrl] of teamFlagMap) {
    if (!teams.find((t) => t.name === name)) {
      teams.push({ name, shortName: makeShort(name), flagUrl, group });
    }
  }

  return { teams, matches };
}

function extractTeamName($: CheerioAPI, th: ReturnType<CheerioAPI>): string {
  // Try schema.org itemprop name → first a link → direct text
  const nameSpan = th.find('[itemprop="name"]').first();
  const link = nameSpan.find('a[rel="mw:WikiLink"]').first();
  if (link.length) {
    const title = link.attr('title') || '';
    if (title) return title.replace(/ national(?: football| soccer)? team.*/, '').trim();
    return link.text().trim();
  }
  // No link — direct text node in name span
  return nameSpan
    .clone()
    .find('.flagicon, .mw-image-border, img')
    .remove()
    .end()
    .text()
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Firestore seeding ──────────────────────────────────────────────────────
async function clearCollection(col: string) {
  const snap = await db.collection(col).limit(500).get();
  if (snap.empty) return;
  const b = db.batch();
  snap.docs.forEach((d) => b.delete(d.ref));
  await b.commit();
  console.log(`   🗑  ${snap.size} docs borrados de '${col}'`);
}

async function writeBatch<T extends object>(
  col: string,
  items: T[],
  docFn: (item: T, ref: FirebaseFirestore.DocumentReference) => Record<string, unknown>,
) {
  const CHUNK = 25;
  for (let i = 0; i < items.length; i += CHUNK) {
    const batch = db.batch();
    for (const item of items.slice(i, i + CHUNK)) {
      const ref = db.collection(col).doc();
      batch.set(ref, docFn(item, ref));
    }
    await batch.commit();
  }
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n⚽  FIFA World Cup 2026 — Seed Script');
  console.log('────────────────────────────────────────────\n');

  const GROUPS = 'ABCDEFGHIJKL'.split('');
  const allTeams: TeamData[] = [];
  const allMatches: MatchData[] = [];

  // ── Scrape all 12 group pages ──────────────────────────────────────────
  for (const group of GROUPS) {
    process.stdout.write(`  📡  Scraping Group ${group}...`);
    try {
      const html = await fetchGroupPage(group);
      const { teams, matches } = parseGroupPage(html, group);
      allTeams.push(...teams);
      allMatches.push(...matches);
      console.log(
        ` ✅  ${teams.length} equipos, ${matches.length} partidos` +
          (matches.some((m) => m.homeScore !== null) ? ' (con resultados)' : ''),
      );
    } catch (e) {
      console.log(` ⚠️  Error: ${(e as Error).message}`);
    }
    if (group !== 'L') await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  console.log(
    `\n📊  Total scrapeado: ${allTeams.length} equipos, ${allMatches.length} partidos\n`,
  );

  if (allTeams.length < 10 || allMatches.length < 10) {
    console.error('   Teams found:', allTeams.length, '  Matches found:', allMatches.length);
    console.error('❌  Datos insuficientes — verifica la conexión a internet.');
    process.exit(1);
  }

  // ── Limpiar BD ─────────────────────────────────────────────────────────
  console.log('🧹  Limpiando colecciones...');
  await clearCollection('matches');
  await clearCollection('teams');
  await clearCollection('sports');

  // ── Sport ──────────────────────────────────────────────────────────────
  await db.collection('sports').doc('football').set({
    name: 'Fútbol', icon: '⚽', active: true, createdAt: Timestamp.now(),
  });
  console.log('✅  Sport: Fútbol');

  // ── Teams ──────────────────────────────────────────────────────────────
  const nameToId = new Map<string, string>();
  await writeBatch('teams', allTeams, (team, ref) => {
    nameToId.set(team.name, ref.id);
    return {
      sport: 'football',
      name: team.name,
      shortName: team.shortName,
      flagUrl: team.flagUrl,
      active: true,
      group: team.group,
    };
  });
  console.log(`✅  Equipos: ${allTeams.length}`);

  // ── Matches ────────────────────────────────────────────────────────────
  let created = 0;
  let skipped = 0;
  const now = new Date();

  const CHUNK = 25;
  for (let i = 0; i < allMatches.length; i += CHUNK) {
    const batch = db.batch();
    for (const m of allMatches.slice(i, i + CHUNK)) {
      const homeId = nameToId.get(m.homeTeam);
      const awayId = nameToId.get(m.awayTeam);
      if (!homeId || !awayId) {
        console.warn(`   ⚠  Sin ID: "${m.homeTeam}" vs "${m.awayTeam}"`);
        skipped++;
        continue;
      }

      const hasResult = m.homeScore !== null && m.awayScore !== null;
      const isLive = !hasResult && m.scheduledAt <= now && m.scheduledAt > new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const status = hasResult ? 'finished' : isLive ? 'live' : 'upcoming';
      const winner = hasResult
        ? m.homeScore! > m.awayScore! ? 'home' : m.homeScore! < m.awayScore! ? 'away' : 'draw'
        : null;

      const ref = db.collection('matches').doc();
      batch.set(ref, {
        sport: 'football',
        homeTeamId: homeId,
        awayTeamId: awayId,
        homeTeamName: m.homeTeam,
        awayTeamName: m.awayTeam,
        scheduledAt: Timestamp.fromDate(m.scheduledAt),
        predictionDeadline: Timestamp.fromDate(m.predictionDeadline),
        tournament: 'FIFA World Cup 2026',
        stage: m.stage,
        venue: m.venue,
        status,
        result: hasResult
          ? { homeScore: m.homeScore, awayScore: m.awayScore, winner, processedAt: Timestamp.now() }
          : null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      created++;
    }
    await batch.commit();
  }
  console.log(`✅  Partidos: ${created}${skipped ? ` (omitidos: ${skipped})` : ''}`);

  // ── Summary ────────────────────────────────────────────────────────────
  console.log('\n📋  Resumen por grupo:');
  for (const group of GROUPS) {
    const gTeams = allTeams.filter((t) => t.group === group);
    const gMatches = allMatches.filter((m) => m.stage === `Group ${group}`);
    const finished = gMatches.filter((m) => m.homeScore !== null).length;
    console.log(
      `   Grupo ${group}  ${gTeams.map((t) => t.shortName || t.name.slice(0, 3)).join(' · ').padEnd(24)}` +
        `  ${gMatches.length} partidos${finished ? ` (${finished} finalizados)` : ''}`,
    );
  }

  const upcomingCount = allMatches.filter((m) => m.homeScore === null).length;
  const finishedCount = allMatches.filter((m) => m.homeScore !== null).length;
  console.log(`\n   Próximos: ${upcomingCount}  |  Finalizados: ${finishedCount}`);
  console.log('\n🎉  Seed completado — http://localhost:4000/firestore\n');
}

main().catch((e) => {
  console.error('\n❌  Error fatal:', e);
  process.exit(1);
});
