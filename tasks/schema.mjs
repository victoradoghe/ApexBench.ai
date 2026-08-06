/* ============================================================
   ApexBench task-pack schema
   ------------------------------------------------------------
   A task has two halves:

   - the PUBLIC half (title, summary, prompt, artifacts) is the
     byte-identical context both competitors receive, and the only
     half the website ever renders;
   - the PRIVATE half (`reference`) is judging context only. Judges
     see it; competitors never do. It is not an oracle — no
     deterministic score picks a winner.

   Both halves are hashed (SHA-256) into every journal line, so a
   task edited after a match ran is externally detectable.
   ============================================================ */

/** every artifact kind a task may carry */
export const ARTIFACT_KINDS = ['code', 'log', 'spec', 'table', 'config', 'diff', 'note'];

export const DIFFICULTIES = ['standard', 'hard', 'expert'];

/**
 * @typedef {object} Artifact
 * @property {string} id      short id competitors and judges cite, e.g. "auth-middleware"
 * @property {string} kind    one of ARTIFACT_KINDS
 * @property {string} label   human title shown above the artifact
 * @property {string} body    the artifact itself, inlined verbatim
 */

/**
 * @typedef {object} Deliverable
 * @property {string} id           "d1", "d2", …
 * @property {string} ask          the question as the prompt puts it
 * @property {string} expected     the resolution a correct answer must reach
 * @property {string[]} artifacts  artifact ids that prove it
 * @property {string[]} [disqualifiers] answers that are automatically wrong
 */

/**
 * @typedef {object} Task
 * @property {string} id           "<category>/<slug>"
 * @property {number} version      bump when the public half changes
 * @property {string} cluster      what flavour of failure this task probes
 * @property {string} difficulty   one of DIFFICULTIES
 * @property {string} title
 * @property {string} summary      one sentence, shown on match pages
 * @property {string} prompt       the instructions, deliverables included
 * @property {Artifact[]} artifacts
 * @property {{ resolution: string, deliverables: Deliverable[], requiredEvidence: string[], disqualifiers: string[] }} reference
 */

/** shape-check a task at load time — a malformed pack fails the run, never a match */
export function validateTask(task, file) {
  const err = (msg) => {
    throw new Error(`${file}: ${msg}`);
  };
  for (const key of ['id', 'cluster', 'difficulty', 'title', 'summary', 'prompt']) {
    if (typeof task[key] !== 'string' || !task[key].trim()) err(`missing "${key}"`);
  }
  if (!DIFFICULTIES.includes(task.difficulty)) err(`bad difficulty "${task.difficulty}"`);
  if (!Number.isInteger(task.version) || task.version < 1) err('version must be a positive integer');
  if (!Array.isArray(task.artifacts) || task.artifacts.length === 0) err('needs at least one artifact');

  const ids = new Set();
  for (const a of task.artifacts) {
    if (!a.id || ids.has(a.id)) err(`duplicate or missing artifact id "${a.id}"`);
    if (!ARTIFACT_KINDS.includes(a.kind)) err(`artifact ${a.id}: bad kind "${a.kind}"`);
    if (!a.body?.trim()) err(`artifact ${a.id}: empty body`);
    ids.add(a.id);
  }

  const ref = task.reference;
  if (!ref?.resolution?.trim()) err('reference.resolution is required');
  if (!Array.isArray(ref.deliverables) || ref.deliverables.length === 0)
    err('reference needs at least one deliverable');
  for (const d of ref.deliverables) {
    if (!d.id || !d.expected?.trim()) err(`deliverable ${d.id}: missing id or expected`);
    for (const aid of d.artifacts ?? []) {
      if (!ids.has(aid)) err(`deliverable ${d.id} cites unknown artifact "${aid}"`);
    }
  }
  return task;
}
