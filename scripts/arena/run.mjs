/* ============================================================
   ApexBench arena — the runner
   ------------------------------------------------------------
     node scripts/arena/run.mjs [--max-matches N] [--category C] [--seed S]

   For each scheduled match: both competitors answer the same public task
   concurrently. A model that answers nothing loses by forfeit; an endpoint
   that was unreachable voids the match instead, so serving reliability never
   leaks into the ladder. Identities are redacted, three cross-vendor judges
   vote blind with per-judge A/B order, two matching votes decide, Elo updates,
   and the full match is appended to results/<category>/journal.jsonl — the
   single source of truth. Re-running resumes: journaled match ids are skipped.

   Runs on zero-cost models by default, so a real journal is produced
   at $0. Stops cleanly when the free-tier quota (429) is hit; just
   re-run tomorrow to accumulate more matches.
   ============================================================ */

import { readFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CATEGORIES, tasksFor, privateHalf, publicHash, privateHash } from '../../tasks/index.mjs';
import { COMPETITORS, JUDGE_POOL } from './roster.mjs';
import { complete, loadKey, RateLimited } from './client.mjs';
import { competitorMessages, judgeMessages, parseVerdict, anonymize } from './prompts.mjs';
import {
  ELO_START, hash32, matchId, eloUpdate, seatJudges, buildSchedule,
} from './core.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const RESULTS = path.join(ROOT, 'results');
const SEED = num('--seed', 20260725);
const MAX = num('--max-matches', Infinity);
const ONLY_CAT = arg('--category');
const METHODOLOGY_VERSION = 'apex-arena-v1.0.0';
/* every roster model reasons before answering, and reasoning is billed out of
   the same budget as the visible reply — a judge starved of tokens returns an
   empty completion and abstains, so the panel needs real headroom */
const JUDGE_TOKENS = 3000;

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : null;
}
function num(flag, dflt) {
  const v = arg(flag);
  return v == null ? dflt : Number(v);
}

/** live Elo per (category, slug), rebuilt from the journal */
function loadState() {
  const elo = {};
  const played = new Set();
  for (const cat of CATEGORIES) {
    elo[cat] = new Map(COMPETITORS.map((c) => [c.slug, { elo: ELO_START, wins: 0, losses: 0, matches: 0 }]));
    const file = path.join(RESULTS, cat, 'journal.jsonl');
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, 'utf8').split('\n').filter(Boolean)) {
      let m;
      try { m = JSON.parse(line); } catch { continue; }
      played.add(m.matchId);
      if (m.outcome !== 'judged') continue;
      const a = elo[cat].get(m.a.slug);
      const b = elo[cat].get(m.b.slug);
      if (!a || !b) continue;
      a.elo = m.a.eloAfter; b.elo = m.b.eloAfter;
      a.matches++; b.matches++;
      if (m.winner === 'a') { a.wins++; b.losses++; } else { b.wins++; a.losses++; }
    }
  }
  return { elo, played };
}

function appendJournal(category, record) {
  const dir = path.join(RESULTS, category);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  appendFileSync(path.join(dir, 'journal.jsonl'), JSON.stringify(record) + '\n');
}

async function main() {
  const key = loadKey(ROOT);
  if (!key) {
    console.error('OPENROUTER_API_KEY not set (checked env and .env). Cannot run the arena.');
    process.exit(1);
  }

  const cats = ONLY_CAT ? [ONLY_CAT] : CATEGORIES;
  const { elo, played } = loadState();
  let ran = 0;
  let failedInARow = 0;

  outer: for (const category of cats) {
    const tasks = tasksFor(category);
    if (!tasks.length) continue;
    const schedule = buildSchedule(COMPETITORS, tasks, hash32(`${SEED}|${category}`));

    schedule.forEach((s, i) => (s._index = i));
    for (const { task, a, b, _index } of schedule) {
      const mid = matchId(category, a.slug, b.slug, task.id, _index);
      if (played.has(mid)) continue;
      if (ran >= MAX) break outer;

      process.stdout.write(`\n[${category}] ${a.name} vs ${b.name} · ${task.id}\n`);

      // 1. both competitors answer concurrently
      let ra, rb;
      try {
        [ra, rb] = await Promise.all([
          complete(a.slug, competitorMessages(task), key),
          complete(b.slug, competitorMessages(task), key),
        ]);
      } catch (e) {
        if (e instanceof RateLimited) { console.log('  quota hit — stopping cleanly.'); break outer; }
        throw e;
      }

      // 2. both competitors failing is a no-contest; one failing is a forfeit
      if (!ra.ok || !rb.ok) {
        const taskLine = {
          id: task.id, version: task.version, cluster: task.cluster, difficulty: task.difficulty,
          title: task.title, summary: task.summary,
          publicHash: publicHash(task), privateHash: privateHash(task),
        };

        // A forfeit is only earned when the MODEL failed. If the endpoint was
        // throttled or unreachable, the model never got to answer, and scoring
        // that as a loss would rank serving reliability rather than capability
        // — on a free tier that would quietly become the dominant signal.
        const infra = (r) => !r.ok && r.kind !== 'model';
        if (!ra.ok && !rb.ok) {
          console.log(`  no-contest (both failed)`);
          appendJournal(category, {
            methodologyVersion: METHODOLOGY_VERSION, matchId: mid, category, seed: SEED,
            scheduleIndex: _index, ranAt: new Date().toISOString(), task: taskLine,
            a: { name: a.name, provider: a.provider, slug: a.slug },
            b: { name: b.name, provider: b.provider, slug: b.slug },
            outcome: 'no-contest', reason: 'both-failed',
            detail: { a: ra.error, b: rb.error },
          });
          played.add(mid);
          if (++failedInARow >= 12) { console.log('  twelve no-contests in a row — stopping (likely quota/health).'); break outer; }
          continue;
        }

        if (infra(ra) || infra(rb)) {
          const who = infra(ra) ? a.name : b.name;
          console.log(`  no-contest (${who} unreachable: ${(infra(ra) ? ra : rb).error})`);
          appendJournal(category, {
            methodologyVersion: METHODOLOGY_VERSION, matchId: mid, category, seed: SEED,
            scheduleIndex: _index, ranAt: new Date().toISOString(), task: taskLine,
            a: { name: a.name, provider: a.provider, slug: a.slug },
            b: { name: b.name, provider: b.provider, slug: b.slug },
            outcome: 'no-contest', reason: 'endpoint-unavailable',
            detail: { a: ra.ok ? 'ok' : ra.error, b: rb.ok ? 'ok' : rb.error },
          });
          played.add(mid);
          if (++failedInARow >= 12) { console.log('  twelve no-contests in a row — stopping (likely quota/health).'); break outer; }
          continue;
        }

        // a model that cannot answer the task loses it: the opponent answered
        // the same prompt under the same conditions, so the win is earned, and
        // voiding instead would let an unreliable model dodge its losses
        const winner = ra.ok ? 'a' : 'b';
        const ea = elo[category].get(a.slug);
        const eb = elo[category].get(b.slug);
        const [na, nb] = eloUpdate(ea.elo, eb.elo, winner === 'a' ? 1 : 0);
        console.log(`  → ${winner === 'a' ? a.name : b.name} wins by forfeit (${winner === 'a' ? b.name : a.name}: ${(winner === 'a' ? rb : ra).error})`);

        appendJournal(category, {
          methodologyVersion: METHODOLOGY_VERSION, matchId: mid, category, seed: SEED,
          scheduleIndex: _index, ranAt: new Date().toISOString(), task: taskLine,
          a: { name: a.name, provider: a.provider, slug: a.slug,
            response: ra.ok ? ra.text : null, error: ra.ok ? null : ra.error,
            tokens: ra.ok ? ra.tokens : 0, reasoningTokens: ra.ok ? ra.reasoningTokens : 0,
            ms: ra.ok ? ra.ms : null, genId: ra.ok ? ra.genId : null,
            eloBefore: ea.elo, eloAfter: na },
          b: { name: b.name, provider: b.provider, slug: b.slug,
            response: rb.ok ? rb.text : null, error: rb.ok ? null : rb.error,
            tokens: rb.ok ? rb.tokens : 0, reasoningTokens: rb.ok ? rb.reasoningTokens : 0,
            ms: rb.ok ? rb.ms : null, genId: rb.ok ? rb.genId : null,
            eloBefore: eb.elo, eloAfter: nb },
          judges: [], votes: [],
          outcome: 'forfeit', winner, panel: null, unanimous: false,
          reason: `${winner === 'a' ? b.name : a.name} failed to answer`,
          eloDelta: Math.round((na - ea.elo) * 10) / 10,
        });

        ea.elo = na; eb.elo = nb; ea.matches++; eb.matches++;
        if (winner === 'a') { ea.wins++; eb.losses++; } else { eb.wins++; ea.losses++; }
        played.add(mid);
        ran++;
        failedInARow = 0;
        continue;
      }
      failedInARow = 0;

      // 3. seat three cross-vendor judges, redact identity, per-judge A/B order
      const judges = seatJudges(JUDGE_POOL, a.provider, b.provider, SEED, mid);
      const ref = privateHalf(task);
      // blindness cannot depend on a competitor obeying the "never name
      // yourself" instruction — scrub identities out of both answers first
      const rosterTerms = [...COMPETITORS, ...JUDGE_POOL].flatMap((m) => [m.name, m.provider, m.slug]);
      const cleanA = anonymize(ra.text, rosterTerms);
      const cleanB = anonymize(rb.text, rosterTerms);
      const votes = [];
      let quota = false;
      for (let ji = 0; ji < judges.length; ji++) {
        const j = judges[ji];
        const flip = (hash32(`${SEED}|${mid}|${j.slug}`) & 1) === 1; // half see A first, half B first
        const first = flip ? cleanB : cleanA; // "Model A" in the judge prompt
        const second = flip ? cleanA : cleanB;
        const messages = judgeMessages(task, ref, first, second);
        let vr;
        try {
          vr = await complete(j.slug, messages, key, { maxTokens: JUDGE_TOKENS });
        } catch (e) {
          if (e instanceof RateLimited) { quota = true; break; }
          throw e;
        }
        if (!vr.ok) { votes.push({ judge: j, abstain: true, reason: vr.error }); continue; }
        let v = parseVerdict(vr.text);
        if (!v) {
          // one retry for a malformed verdict (a refused choice included), then abstain
          try {
            const retry = await complete(j.slug, messages, key, { maxTokens: JUDGE_TOKENS });
            v = retry.ok ? parseVerdict(retry.text) : null;
          } catch (e) { if (e instanceof RateLimited) { quota = true; break; } throw e; }
        }
        if (!v) { votes.push({ judge: j, abstain: true, reason: 'malformed-verdict' }); continue; }
        // map the judge's Model A/B back to real competitors a/b
        const realWinner = (v.winner === 'MODEL_A') === !flip ? 'a' : 'b';
        votes.push({
          judge: j, saw: flip ? { A: b.name, B: a.name } : { A: a.name, B: b.name },
          winner: realWinner, confidence: v.confidence, decisiveDifference: v.decisiveDifference,
          criteria: { correctness: v.correctness, grounding: v.grounding, constraintHandling: v.constraintHandling, completeness: v.completeness },
        });
        process.stdout.write(`  ${j.name}: ${realWinner === 'a' ? a.name : b.name} (${v.confidence}%)\n`);
      }
      if (quota) { console.log('  quota hit mid-judging — stopping (match not journaled).'); break outer; }

      // 4. two valid votes for the same side decide the match; a panel that
      //    cannot reach two (too many abstentions) is a no-contest, not a draw
      const valid = votes.filter((v) => !v.abstain);
      const aVotes = valid.filter((v) => v.winner === 'a').length;
      const bVotes = valid.filter((v) => v.winner === 'b').length;
      const decisive = Math.max(aVotes, bVotes) >= 2 && aVotes !== bVotes;
      if (!decisive) {
        console.log(`  no-contest (no majority: ${aVotes}-${bVotes})`);
        appendJournal(category, {
          methodologyVersion: METHODOLOGY_VERSION, matchId: mid, category, seed: SEED,
          scheduleIndex: _index, ranAt: new Date().toISOString(),
          task: { id: task.id, version: task.version, cluster: task.cluster, difficulty: task.difficulty,
            title: task.title, summary: task.summary, publicHash: publicHash(task), privateHash: privateHash(task) },
          a: { name: a.name, provider: a.provider, slug: a.slug,
            response: ra.text, tokens: ra.tokens, reasoningTokens: ra.reasoningTokens, ms: ra.ms, genId: ra.genId },
          b: { name: b.name, provider: b.provider, slug: b.slug,
            response: rb.text, tokens: rb.tokens, reasoningTokens: rb.reasoningTokens, ms: rb.ms, genId: rb.genId },
          judges: judges.map((j) => ({ name: j.name, provider: j.provider })), votes,
          outcome: 'no-contest', reason: 'no-majority',
        });
        continue;
      }

      const winner = aVotes > bVotes ? 'a' : 'b';
      const unanimous = valid.every((v) => v.winner === winner) && votes.every((v) => !v.abstain);
      const ea = elo[category].get(a.slug);
      const eb = elo[category].get(b.slug);
      const [na, nb] = eloUpdate(ea.elo, eb.elo, winner === 'a' ? 1 : 0);

      appendJournal(category, {
        methodologyVersion: METHODOLOGY_VERSION, matchId: mid, category, seed: SEED,
        scheduleIndex: _index, ranAt: new Date().toISOString(),
        task: { id: task.id, version: task.version, cluster: task.cluster, difficulty: task.difficulty,
          title: task.title, summary: task.summary, publicHash: publicHash(task), privateHash: privateHash(task) },
        a: { name: a.name, provider: a.provider, slug: a.slug, response: ra.text,
          tokens: ra.tokens, reasoningTokens: ra.reasoningTokens, ms: ra.ms, genId: ra.genId,
          eloBefore: ea.elo, eloAfter: na },
        b: { name: b.name, provider: b.provider, slug: b.slug, response: rb.text,
          tokens: rb.tokens, reasoningTokens: rb.reasoningTokens, ms: rb.ms, genId: rb.genId,
          eloBefore: eb.elo, eloAfter: nb },
        judges: judges.map((j) => ({ name: j.name, provider: j.provider })), votes,
        outcome: 'judged', winner, panel: `${Math.max(aVotes, bVotes)}-${Math.min(aVotes, bVotes)}`,
        unanimous, eloDelta: Math.round((na - ea.elo) * 10) / 10,
      });

      // update in-memory state and continue
      ea.elo = na; eb.elo = nb; ea.matches++; eb.matches++;
      if (winner === 'a') { ea.wins++; eb.losses++; } else { eb.wins++; ea.losses++; }
      played.add(mid);
      ran++;
      console.log(`  → ${winner === 'a' ? a.name : b.name} wins ${Math.max(aVotes, bVotes)}-${Math.min(aVotes, bVotes)}${unanimous ? ' (unanimous)' : ''} · Elo ${winner === 'a' ? na : nb}`);
    }
  }

  console.log(`\nDone. ${ran} new decided/played this run.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
