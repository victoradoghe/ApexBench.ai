/* ============================================================
   ApexBench arena — snapshot builder
   ------------------------------------------------------------
     node scripts/arena/build-snapshot.mjs

   Folds the append-only journals in results/<category>/journal.jsonl
   into the JSON the static site imports:

     src/data/arena.json    ladders, overall fold, head-to-head
                            records, per-match summaries + panels
     src/data/matches.json  full match detail (both responses,
                            every judge vote and rationale)

   Snapshots are derived and disposable — the journal is the source
   of truth and every ladder rebuilds from it.
   ============================================================ */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CATEGORIES, tasksFor, publicHalf, publicHash, privateHash } from '../../tasks/index.mjs';
import { COMPETITORS, JUDGE_POOL } from './roster.mjs';
import { ELO_START, PROVISIONAL_UNDER, confidenceElo } from './core.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const RESULTS = path.join(ROOT, 'results');
const OUT_ARENA = path.join(ROOT, 'src', 'data', 'arena.json');
const OUT_MATCHES = path.join(ROOT, 'src', 'data', 'matches.json');

function readJournal(category) {
  const file = path.join(RESULTS, category, 'journal.jsonl');
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}

const ladders = {};
const matchSummaries = [];
const fullMatches = {};
const h2h = new Map(); // "slugA|slugB" (sorted) -> record

let totalDecided = 0;
let totalForfeits = 0;
let totalNoContests = 0;
let latestRun = null;

for (const category of CATEGORIES) {
  const journal = readJournal(category);
  const stat = new Map(); // slug -> { name, provider, elo, wins, losses, matches, unanimous }
  const ensure = (m) => {
    if (!stat.has(m.slug))
      stat.set(m.slug, { name: m.name, provider: m.provider, slug: m.slug, elo: ELO_START, wins: 0, losses: 0, matches: 0, unanimous: 0 });
    return stat.get(m.slug);
  };

  for (const rec of journal) {
    if (rec.ranAt && (!latestRun || rec.ranAt > latestRun)) latestRun = rec.ranAt;

    // a forfeit is a decided match: it moved Elo and counts on the ladder
    if (rec.outcome === 'judged' || rec.outcome === 'forfeit') {
      totalDecided++;
      if (rec.outcome === 'forfeit') totalForfeits++;
      const a = ensure(rec.a);
      const b = ensure(rec.b);
      a.elo = rec.a.eloAfter; b.elo = rec.b.eloAfter;
      a.matches++; b.matches++;
      const winSlug = rec.winner === 'a' ? rec.a.slug : rec.b.slug;
      const loseSlug = rec.winner === 'a' ? rec.b.slug : rec.a.slug;
      ensure(rec.winner === 'a' ? rec.a : rec.b).wins++;
      ensure(rec.winner === 'a' ? rec.b : rec.a).losses++;
      if (rec.unanimous) { a.unanimous += rec.winner === 'a' ? 1 : 0; b.unanimous += rec.winner === 'b' ? 1 : 0; }

      // head-to-head record
      const key = [rec.a.slug, rec.b.slug].sort().join('|');
      if (!h2h.has(key)) h2h.set(key, { pair: key.split('|'), byCat: {}, meetings: [] });
      const rc = h2h.get(key);
      rc.byCat[category] = rc.byCat[category] || {};
      rc.byCat[category][winSlug] = (rc.byCat[category][winSlug] || 0) + 1;
      rc.meetings.push({
        matchId: rec.matchId, category, ranAt: rec.ranAt, task: rec.task.title,
        cluster: rec.task.cluster, winnerSlug: winSlug, loserSlug: loseSlug,
        panel: rec.panel, unanimous: rec.unanimous, eloDelta: rec.eloDelta,
      });
    }

    if (rec.outcome === 'no-contest') totalNoContests++;

    // match summary (decided matches, plus no-contests that still produced answers)
    if (rec.outcome !== 'no-contest' || rec.a.response) {
      matchSummaries.push({
        matchId: rec.matchId, category, ranAt: rec.ranAt,
        taskId: rec.task.id, task: rec.task.title,
        cluster: rec.task.cluster, difficulty: rec.task.difficulty,
        a: { name: rec.a.name, provider: rec.a.provider, slug: rec.a.slug },
        b: { name: rec.b.name, provider: rec.b.provider, slug: rec.b.slug },
        outcome: rec.outcome, winner: rec.winner ?? null,
        panel: rec.panel ?? null, unanimous: rec.unanimous ?? false,
        eloDelta: rec.eloDelta ?? null,
      });
      // full detail for a match page
      fullMatches[rec.matchId] = {
        matchId: rec.matchId, category, ranAt: rec.ranAt,
        task: rec.task, outcome: rec.outcome, winner: rec.winner ?? null,
        panel: rec.panel ?? null, unanimous: rec.unanimous ?? false, reason: rec.reason ?? null,
        a: rec.a, b: rec.b,
        judges: rec.judges ?? [], votes: rec.votes ?? [],
      };
    }
  }

  const rows = [...stat.values()]
    .map((s) => ({
      name: s.name, provider: s.provider, slug: s.slug,
      rawElo: Math.round(s.elo),
      elo: confidenceElo(s.elo, s.matches),
      wins: s.wins, losses: s.losses, matches: s.matches, unanimous: s.unanimous,
      winPct: s.wins + s.losses ? Math.round((s.wins / (s.wins + s.losses)) * 100) : null,
      provisional: s.matches < PROVISIONAL_UNDER,
    }))
    .filter((r) => r.matches > 0)
    .sort((a, b) => (a.provisional === b.provisional ? b.elo - a.elo : a.provisional ? 1 : -1));

  ladders[category] = rows;
}

/* overall fold: mean confidence-weighted Elo across categories a model is
   rated in, each category weighted by matches/(matches+PROVISIONAL_UNDER) */
const overallMap = new Map();
for (const category of CATEGORIES) {
  for (const r of ladders[category]) {
    if (!overallMap.has(r.slug))
      overallMap.set(r.slug, { name: r.name, provider: r.provider, slug: r.slug, num: 0, den: 0, cats: 0, wins: 0, losses: 0, matches: 0 });
    const o = overallMap.get(r.slug);
    const w = r.matches / (r.matches + PROVISIONAL_UNDER);
    o.num += r.elo * w; o.den += w; o.cats++;
    o.wins += r.wins; o.losses += r.losses; o.matches += r.matches;
  }
}
const overall = [...overallMap.values()]
  .map((o) => ({
    name: o.name, provider: o.provider, slug: o.slug,
    score: o.den ? Math.round((o.num / o.den) * 10) / 10 : ELO_START,
    cats: o.cats, wins: o.wins, losses: o.losses, matches: o.matches,
    winPct: o.wins + o.losses ? Math.round((o.wins / (o.wins + o.losses)) * 100) : null,
  }))
  .sort((a, b) => b.score - a.score);

/* per-category podiums: top 3 by Elo among non-provisional first */
const podiums = {};
for (const category of CATEGORIES) podiums[category] = ladders[category].slice(0, 3);

matchSummaries.sort((a, b) => (b.ranAt || '').localeCompare(a.ranAt || ''));
const h2hOut = [...h2h.values()].map((r) => ({ ...r, meetings: r.meetings.sort((a, b) => (b.ranAt || '').localeCompare(a.ranAt || '')) }));

/* The public half of every task ships with the snapshot: what competitors were
   asked is published, what judges scored against stays in tasks/*.mjs. Both
   hashes travel too, so a task edited after a match ran is externally
   detectable by comparing against the hashes journaled with that match. */
const tasks = CATEGORIES.flatMap((category) =>
  tasksFor(category).map((t) => ({
    ...publicHalf(t),
    category,
    publicHash: publicHash(t),
    privateHash: privateHash(t),
    /* how often this task has actually been played, per category ladder */
    played: matchSummaries.filter((m) => m.taskId === t.id).length,
  })),
);

const arena = {
  updatedAt: new Date().toISOString(),
  latestRun,
  roster: COMPETITORS,
  judgePool: JUDGE_POOL,
  tasks,
  source: 'ApexBench arena — own task packs, blind cross-vendor judged head-to-head matches, append-only journal',
  eloStart: ELO_START, eloK: 32, provisionalUnder: PROVISIONAL_UNDER,
  totalDecided, totalForfeits, totalNoContests,
  categories: CATEGORIES,
  ladders, overall, podiums,
  headToHead: h2hOut,
  matches: matchSummaries,
};

writeFileSync(OUT_ARENA, JSON.stringify(arena, null, 2) + '\n');
writeFileSync(OUT_MATCHES, JSON.stringify({ updatedAt: arena.updatedAt, matches: fullMatches }, null, 2) + '\n');

console.log(`Wrote ${OUT_ARENA}`);
console.log(`Wrote ${OUT_MATCHES}`);
console.log(`  ${totalDecided} decided matches · ${matchSummaries.length} with responses · ${overall.length} models on the overall board`);
for (const c of CATEGORIES) console.log(`  ${c.padEnd(14)} ${ladders[c].length} rated, ${ladders[c].reduce((s, r) => s + r.wins, 0)} wins logged`);
