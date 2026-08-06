/* ============================================================
   ApexBench arena — deterministic core (Elo, seating, scheduling)
   ------------------------------------------------------------
   Pure functions only, so a season is reproducible and a ladder
   can be rebuilt from the journal at any time.
   ============================================================ */

import { createHash } from 'node:crypto';

export const ELO_START = 1000;
export const ELO_K = 32;
/** matches before a rating stops being provisional */
export const PROVISIONAL_UNDER = 10;

/** seeded, deterministic PRNG (mulberry32) */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 32-bit unsigned hash of a string, for seeding */
export function hash32(str) {
  return parseInt(createHash('sha256').update(str).digest('hex').slice(0, 8), 16) >>> 0;
}

/** stable match id from its identity */
export function matchId(category, aSlug, bSlug, taskId, index) {
  return (
    'match-' +
    createHash('sha256')
      .update(`${category}|${aSlug}|${bSlug}|${taskId}|${index}`)
      .digest('hex')
      .slice(0, 20)
  );
}

/** standard Elo update; returns [newA, newB] given result (1 = A wins, 0 = B wins) */
export function eloUpdate(ra, rb, resultA, k = ELO_K) {
  const ea = 1 / (1 + 10 ** ((rb - ra) / 400));
  const na = ra + k * (resultA - ea);
  const nb = rb + k * ((1 - resultA) - (1 - ea));
  return [Math.round(na * 10) / 10, Math.round(nb * 10) / 10];
}

/** confidence-weighted display Elo — raw pulled toward the start by
    matches / (matches + PROVISIONAL_UNDER) */
export function confidenceElo(rawElo, matches) {
  const w = matches / (matches + PROVISIONAL_UNDER);
  return Math.round(ELO_START + (rawElo - ELO_START) * w);
}

/**
 * Seat three judges for a match from the pool, excluding any judge that
 * shares a provider with either competitor. Deterministic: judges ranked
 * by SHA-256(seed|matchId|slug); the top three eligible are seated.
 */
export function seatJudges(pool, aProvider, bProvider, seed, mid) {
  const excluded = new Set([aProvider, bProvider]);
  const eligible = pool.filter((j) => !excluded.has(j.provider));
  const ranked = [...eligible].sort(
    (x, y) => hash32(`${seed}|${mid}|${x.slug}`) - hash32(`${seed}|${mid}|${y.slug}`),
  );
  return ranked.slice(0, 3);
}

/**
 * Build a balanced, reproducible schedule of matches. Every
 * (task, unordered competitor pair) is one match; ordering (who is A)
 * and overall order come from the seeded PRNG. Exposure-balanced:
 * greedily pick the pairing whose two models have the lowest combined
 * exposure so far.
 */
export function buildSchedule(competitors, tasks, seed) {
  const rnd = mulberry32(seed);
  const combos = [];
  for (const task of tasks) {
    for (let i = 0; i < competitors.length; i++) {
      for (let j = i + 1; j < competitors.length; j++) {
        // seeded side assignment
        const flip = rnd() < 0.5;
        const a = flip ? competitors[i] : competitors[j];
        const b = flip ? competitors[j] : competitors[i];
        combos.push({ task, a, b, jitter: rnd() });
      }
    }
  }
  const exposure = new Map(competitors.map((c) => [c.slug, 0]));
  const taskExposure = new Map(tasks.map((t) => [t.id, 0]));
  const scheduled = [];
  const remaining = [...combos];
  while (remaining.length) {
    remaining.sort((x, y) => {
      const ex = exposure.get(x.a.slug) + exposure.get(x.b.slug);
      const ey = exposure.get(y.a.slug) + exposure.get(y.b.slug);
      if (ex !== ey) return ex - ey;
      const tx = taskExposure.get(x.task.id);
      const ty = taskExposure.get(y.task.id);
      if (tx !== ty) return tx - ty;
      return x.jitter - y.jitter;
    });
    const next = remaining.shift();
    exposure.set(next.a.slug, exposure.get(next.a.slug) + 1);
    exposure.set(next.b.slug, exposure.get(next.b.slug) + 1);
    taskExposure.set(next.task.id, taskExposure.get(next.task.id) + 1);
    scheduled.push(next);
  }
  return scheduled;
}
