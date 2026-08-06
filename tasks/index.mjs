/* ============================================================
   ApexBench task packs — the loader
   ------------------------------------------------------------
   Every task ApexBench runs is authored here, in-repo. Each has a
   PUBLIC half (rendered on the site, given verbatim to competitors)
   and a PRIVATE reference (judging context only). The arena harness
   and the website both import from here — one source of truth.
   ============================================================ */

import { createHash } from 'node:crypto';
import { validateTask } from './schema.mjs';

import security from './security.mjs';
import debugging from './debugging.mjs';
import refactoring from './refactoring.mjs';
import reasoning from './reasoning.mjs';
import hallucination from './hallucination.mjs';

/** the live categories — each is a pack with authored tasks */
export const CATEGORIES = ['security', 'debugging', 'refactoring', 'reasoning', 'hallucination'];

const PACKS = { security, debugging, refactoring, reasoning, hallucination };

/** validate every task once, at import time */
for (const [cat, pack] of Object.entries(PACKS)) {
  pack.forEach((t, i) => validateTask(t, `${cat}[${i}]`));
}

/** stable SHA-256 of a value, canonicalized by sorted keys */
export function hashOf(value) {
  const canon = JSON.stringify(value, Object.keys(value).sort?.() ?? undefined);
  return createHash('sha256').update(canon).digest('hex');
}

/** the public half a competitor sees — never the reference */
export function publicHalf(task) {
  return {
    id: task.id,
    version: task.version,
    cluster: task.cluster,
    difficulty: task.difficulty,
    title: task.title,
    summary: task.summary,
    prompt: task.prompt,
    artifacts: task.artifacts,
  };
}

/** the private half only judges see */
export function privateHalf(task) {
  return task.reference;
}

export function publicHash(task) {
  return createHash('sha256').update(JSON.stringify(publicHalf(task))).digest('hex');
}
export function privateHash(task) {
  return createHash('sha256').update(JSON.stringify(privateHalf(task))).digest('hex');
}

/** all tasks for a category */
export function tasksFor(category) {
  return PACKS[category] ?? [];
}

/** every task across every category */
export function allTasks() {
  return CATEGORIES.flatMap((c) => PACKS[c]);
}

export { PACKS };
