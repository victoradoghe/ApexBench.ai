/* ============================================================
   ApexBench arena — the data layer
   ------------------------------------------------------------
   REAL data, and ours. Every number below is folded from
   results/<category>/journal.jsonl — the append-only log written by
   scripts/arena/run.mjs as matches actually run — through
   scripts/arena/build-snapshot.mjs into src/data/arena.json.

   Nothing here is simulated, and nothing here is scraped from another
   benchmark. A model with no matches in a category has no rating in
   that category; it is never given one.

   Note this covers the ARENA roster (the models ApexBench itself runs
   head-to-head), which is deliberately separate from the model
   registry in models.ts (frontier models carrying published
   third-party scores). They are different truth sources and the site
   never folds them into one number.
   ============================================================ */

import SNAP from './arena.json';
import FULL from './matches.json';

export const CATEGORIES = [
  'security',
  'debugging',
  'refactoring',
  'reasoning',
  'hallucination',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CAT_LABEL: Record<Category, string> = {
  security: 'Security',
  debugging: 'Debugging',
  refactoring: 'Refactoring',
  reasoning: 'Reasoning',
  hallucination: 'Hallucination',
};

export const CAT_SHORT: Record<Category, string> = {
  security: 'Sec',
  debugging: 'Debug',
  refactoring: 'Refactor',
  reasoning: 'Reason',
  hallucination: 'Halluc',
};

export interface CategoryMeta {
  key: Category;
  label: string;
  icon: string;
  blurb: string;
  /** what winning a match in this category actually demonstrates */
  decidedOn: string;
}

export const CATEGORY_META: CategoryMeta[] = [
  {
    key: 'security',
    label: 'Security',
    icon: 'M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z',
    blurb:
      'Real vulnerabilities hidden in code that mostly does the right thing — the exploitable line sits next to four safe ones.',
    decidedOn:
      'Finding the true vulnerability, proving it is reachable, and not crying wolf over the safe code around it.',
  },
  {
    key: 'debugging',
    label: 'Debugging',
    icon: 'M9 3v2m6-2v2M5 9h14M6 13a6 6 0 0012 0v-2H6v2zM4 17l-2 2m18-2l2 2',
    blurb:
      'Production incidents reconstructed from logs, traces and diffs, where the obvious cause is usually the wrong one.',
    decidedOn:
      'Reaching the actual root cause and a durable fix, rather than a patch that only hides the symptom.',
  },
  {
    key: 'refactoring',
    label: 'Refactoring',
    icon: 'M4 7h16M4 12h10M4 17h16M18 10l3 3-3 3',
    blurb:
      'Rewrites that look equivalent and are not — a short-circuit dropped, a default argument changed, a debounce that stops trailing.',
    decidedOn:
      'Judging behavioural equivalence by semantics, not by which version reads more cleanly.',
  },
  {
    key: 'reasoning',
    label: 'Reasoning',
    icon: 'M12 3v3m0 12v3M3 12h3m12 0h3M7 7l2 2m6 6l2 2m0-10l-2 2M9 15l-2 2M12 9a3 3 0 100 6 3 3 0 000-6z',
    blurb:
      'Multi-constraint problems with one provable answer: version resolution, rate-limit matrices, lock-ordering deadlocks.',
    decidedOn:
      'Tracking every constraint to the one answer the artifacts support — hedging on a determinable question is an error.',
  },
  {
    key: 'hallucination',
    label: 'Hallucination',
    icon: 'M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6zM9 12l2 2 4-4',
    blurb:
      'Prompts built on false premises, invented APIs and sources that contradict each other, to see who invents the rest.',
    decidedOn:
      'Correcting the false premise and naming what is missing — while still answering everything the artifacts do support.',
  },
];

/* ---------- shapes as written by build-snapshot.mjs ---------- */

export interface LadderRow {
  name: string;
  provider: string;
  slug: string;
  /** raw Elo straight off the journal */
  rawElo: number;
  /** confidence-weighted Elo — held toward 1000 until a record is thick */
  elo: number;
  wins: number;
  losses: number;
  matches: number;
  /** wins taken on a 3-0 panel */
  unanimous: number;
  winPct: number | null;
  provisional: boolean;
}

export interface OverallRow {
  name: string;
  provider: string;
  slug: string;
  score: number;
  /** how many categories back this figure */
  cats: number;
  wins: number;
  losses: number;
  matches: number;
  winPct: number | null;
}

export interface MatchSummary {
  matchId: string;
  category: Category;
  ranAt: string;
  taskId: string;
  task: string;
  cluster: string;
  difficulty: string;
  a: { name: string; provider: string; slug: string };
  b: { name: string; provider: string; slug: string };
  outcome: 'judged' | 'forfeit' | 'no-contest';
  winner: 'a' | 'b' | null;
  panel: string | null;
  unanimous: boolean;
  eloDelta: number | null;
}

export interface Meeting {
  matchId: string;
  category: Category;
  ranAt: string;
  task: string;
  cluster: string;
  winnerSlug: string;
  loserSlug: string;
  panel: string | null;
  unanimous: boolean;
  eloDelta: number | null;
}

export interface HeadToHeadRecord {
  pair: [string, string];
  byCat: Partial<Record<Category, Record<string, number>>>;
  meetings: Meeting[];
}

export interface Competitor {
  name: string;
  provider: string;
  slug: string;
}

export interface TaskArtifact {
  id: string;
  kind: string;
  label: string;
  body: string;
}

export interface PublicTask {
  id: string;
  version: number;
  category: Category;
  cluster: string;
  difficulty: string;
  title: string;
  summary: string;
  prompt: string;
  artifacts: TaskArtifact[];
  publicHash: string;
  privateHash: string;
  played: number;
}

export interface JudgeVote {
  judge: Competitor;
  abstain?: boolean;
  reason?: string;
  saw?: { A: string; B: string };
  winner?: 'a' | 'b';
  confidence?: number;
  decisiveDifference?: string;
  criteria?: {
    correctness: string;
    grounding: string;
    constraintHandling: string;
    completeness: string;
  };
}

export interface MatchSide {
  name: string;
  provider: string;
  slug: string;
  response: string | null;
  error?: string | null;
  tokens: number;
  reasoningTokens: number;
  ms: number | null;
  genId: string | null;
  eloBefore?: number;
  eloAfter?: number;
}

export interface FullMatch {
  matchId: string;
  category: Category;
  ranAt: string;
  task: {
    id: string;
    version: number;
    cluster: string;
    difficulty: string;
    title: string;
    summary: string;
    publicHash: string;
    privateHash: string;
  };
  outcome: 'judged' | 'forfeit' | 'no-contest';
  winner: 'a' | 'b' | null;
  panel: string | null;
  unanimous: boolean;
  reason: string | null;
  a: MatchSide;
  b: MatchSide;
  judges: Competitor[];
  votes: JudgeVote[];
}

interface Snapshot {
  updatedAt: string;
  latestRun: string | null;
  roster: Competitor[];
  judgePool: Competitor[];
  tasks: PublicTask[];
  source: string;
  eloStart: number;
  eloK: number;
  provisionalUnder: number;
  totalDecided: number;
  totalForfeits: number;
  totalNoContests: number;
  categories: Category[];
  ladders: Record<Category, LadderRow[]>;
  overall: OverallRow[];
  podiums: Record<Category, LadderRow[]>;
  headToHead: HeadToHeadRecord[];
  matches: MatchSummary[];
}

const SNAPSHOT = SNAP as unknown as Snapshot;

/* ---------- constants and metadata ---------- */

export const ELO_START = SNAPSHOT.eloStart;
export const ELO_K = SNAPSHOT.eloK;
export const PROVISIONAL_UNDER = SNAPSHOT.provisionalUnder;
export const ARENA_UPDATED_AT = SNAPSHOT.updatedAt;
export const LATEST_RUN = SNAPSHOT.latestRun;
export const TOTAL_DECIDED = SNAPSHOT.totalDecided;
export const TOTAL_FORFEITS = SNAPSHOT.totalForfeits;
export const TOTAL_NO_CONTESTS = SNAPSHOT.totalNoContests;
export const METHODOLOGY_VERSION = 'apex-arena-v1.0.0';

/** the models ApexBench runs head-to-head */
export const ROSTER: Competitor[] = SNAPSHOT.roster;
/** the pool three judges are seated from, per match */
export const JUDGE_POOL: Competitor[] = SNAPSHOT.judgePool;
/** every authored task, public half only */
export const TASKS: PublicTask[] = SNAPSHOT.tasks;
export const ALL_MATCHES: MatchSummary[] = SNAPSHOT.matches;

export const PROVIDER_COLOR: Record<string, string> = {
  NVIDIA: '#76b900',
  Google: '#4285f4',
  OpenAI: '#10a37f',
  Cohere: '#39a385',
  InclusionAI: '#8b5cf6',
  Poolside: '#f43f5e',
};

export const providerColor = (p: string) => PROVIDER_COLOR[p] ?? '#64748b';

/* ---------- ladders ---------- */

/** the ranked ladder for a category (empty until matches are played) */
export const ladder = (cat: Category): LadderRow[] => SNAPSHOT.ladders[cat] ?? [];

/** top three of a category, in rank order */
export const podium = (cat: Category): LadderRow[] => SNAPSHOT.podiums[cat] ?? [];

/** the cross-category board, ranked by weighted mean Elo */
export const overall = (): OverallRow[] => SNAPSHOT.overall ?? [];

/** the model leading the overall board, or null before any match is decided */
export const champion = (): OverallRow | null => overall()[0] ?? null;

/** the leader of one category, or null while it is unplayed */
export const catChampion = (cat: Category): LadderRow | null => ladder(cat)[0] ?? null;

/** has this category had any decided match yet? */
export const isPlayed = (cat: Category): boolean => ladder(cat).length > 0;

/** categories with at least one decided match */
export const playedCategories = (): Category[] => CATEGORIES.filter(isPlayed);

/** decided matches in a category (every decided match produces one win) */
export const matchesIn = (cat: Category): number =>
  ladder(cat).reduce((s, r) => s + r.wins, 0);

/** a competitor's row in one category, or null when unrated there */
export const rowOf = (slug: string, cat: Category): LadderRow | null =>
  ladder(cat).find((r) => r.slug === slug) ?? null;

/** 1-based rank in a category, or null when unrated */
export const rankIn = (slug: string, cat: Category): number | null => {
  const i = ladder(cat).findIndex((r) => r.slug === slug);
  return i === -1 ? null : i + 1;
};

/** every category row a competitor carries, with its rank */
export const recordOf = (slug: string) =>
  CATEGORIES.flatMap((cat) => {
    const row = rowOf(slug, cat);
    return row ? [{ cat, row, rank: rankIn(slug, cat)!, of: ladder(cat).length }] : [];
  });

/** a competitor's overall row, or null when it has no decided match */
export const overallOf = (slug: string): OverallRow | null =>
  overall().find((r) => r.slug === slug) ?? null;

export const competitorBySlug = (slug: string): Competitor | null =>
  ROSTER.find((c) => c.slug === slug) ?? null;

/** url-safe id for a competitor (an OpenRouter slug carries / and :) */
export const modelKey = (slug: string) =>
  slug.replace(/:free$/, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();

export const bySlugKey = (key: string): Competitor | null =>
  ROSTER.find((c) => modelKey(c.slug) === key) ?? null;

/* ---------- Elo presentation ---------- */

/** the observed Elo band across every ladder, used to scale bars */
export const eloBand = (): { min: number; max: number } => {
  const all = CATEGORIES.flatMap((c) => ladder(c).map((r) => r.elo));
  if (!all.length) return { min: ELO_START - 40, max: ELO_START + 40 };
  const min = Math.min(...all);
  const max = Math.max(...all);
  // never collapse to a zero-width band, or every bar renders identical
  return max - min < 20 ? { min: min - 10, max: max + 10 } : { min, max };
};

/** map an Elo onto 0-100 within the observed band, for bar widths */
export const eloPct = (elo: number): number => {
  const { min, max } = eloBand();
  return Math.max(4, Math.min(100, Math.round(((elo - min) / (max - min)) * 100)));
};

/* ---------- head-to-head ---------- */

const h2hKey = (a: string, b: string) => [a, b].sort().join('|');

/** the lifetime record between two competitors, or null if they never met */
export const headToHead = (slugA: string, slugB: string): HeadToHeadRecord | null => {
  const key = h2hKey(slugA, slugB);
  return SNAPSHOT.headToHead.find((r) => h2hKey(r.pair[0], r.pair[1]) === key) ?? null;
};

export interface H2HTally {
  /** decided meetings won by A / by B */
  a: number;
  b: number;
  total: number;
  byCat: { cat: Category; a: number; b: number }[];
  meetings: Meeting[];
}

/** fold a pair's record into a tally oriented to (slugA, slugB) */
export const h2hTally = (slugA: string, slugB: string): H2HTally => {
  const rec = headToHead(slugA, slugB);
  if (!rec) return { a: 0, b: 0, total: 0, byCat: [], meetings: [] };
  const byCat = CATEGORIES.flatMap((cat) => {
    const c = rec.byCat[cat];
    if (!c) return [];
    return [{ cat, a: c[slugA] ?? 0, b: c[slugB] ?? 0 }];
  });
  const a = byCat.reduce((s, c) => s + c.a, 0);
  const b = byCat.reduce((s, c) => s + c.b, 0);
  return { a, b, total: a + b, byCat, meetings: rec.meetings };
};

/** every pair that has actually met, most-played first */
export const playedPairs = (): HeadToHeadRecord[] =>
  [...SNAPSHOT.headToHead].sort((x, y) => y.meetings.length - x.meetings.length);

/* ---------- matches ---------- */

const FULL_MATCHES = (FULL as unknown as { matches: Record<string, FullMatch> }).matches;

export const fullMatch = (id: string): FullMatch | null => FULL_MATCHES[id] ?? null;

export const allFullMatchIds = (): string[] => Object.keys(FULL_MATCHES);

/** most recent matches first, optionally filtered by category */
export const recentMatches = (limit?: number, cat?: Category): MatchSummary[] => {
  const rows = cat ? ALL_MATCHES.filter((m) => m.category === cat) : ALL_MATCHES;
  return limit ? rows.slice(0, limit) : rows;
};

/** matches that used a given task */
export const matchesForTask = (taskId: string): MatchSummary[] =>
  ALL_MATCHES.filter((m) => m.taskId === taskId);

/* ---------- tasks ---------- */

export const tasksIn = (cat: Category): PublicTask[] =>
  TASKS.filter((t) => t.category === cat);

export const taskById = (id: string): PublicTask | null =>
  TASKS.find((t) => t.id === id) ?? null;

export const taskKey = (id: string) => id.replace('/', '--');
export const taskByKey = (key: string): PublicTask | null =>
  TASKS.find((t) => taskKey(t.id) === key) ?? null;

/* ---------- judges ---------- */

export interface JudgeStat {
  judge: Competitor;
  /** seated on a panel this many times */
  seated: number;
  /** verdicts actually returned */
  votes: number;
  /** verdicts that landed on the side the panel decided for */
  withMajority: number;
  /** seatings that produced no usable verdict */
  abstentions: number;
  /** mean stated confidence across its verdicts */
  meanConfidence: number | null;
}

export const judgeStats = (): JudgeStat[] => {
  const stats = new Map<string, JudgeStat>(
    JUDGE_POOL.map((j) => [
      j.slug,
      { judge: j, seated: 0, votes: 0, withMajority: 0, abstentions: 0, meanConfidence: null },
    ]),
  );
  const conf = new Map<string, number[]>();

  for (const id of allFullMatchIds()) {
    const m = fullMatch(id);
    if (!m) continue;
    for (const j of m.judges) {
      const s = stats.get(j.slug);
      if (s) s.seated++;
    }
    for (const v of m.votes) {
      const s = stats.get(v.judge.slug);
      if (!s) continue;
      if (v.abstain) {
        s.abstentions++;
        continue;
      }
      s.votes++;
      if (m.winner && v.winner === m.winner) s.withMajority++;
      if (typeof v.confidence === 'number') {
        conf.set(v.judge.slug, [...(conf.get(v.judge.slug) ?? []), v.confidence]);
      }
    }
  }
  for (const [slug, values] of conf) {
    const s = stats.get(slug);
    if (s && values.length) {
      s.meanConfidence = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    }
  }
  return [...stats.values()].sort((a, b) => b.votes - a.votes);
};

/** share of judged matches the panel decided unanimously */
export const unanimityRate = (): number | null => {
  const decided = ALL_MATCHES.filter((m) => m.outcome === 'judged');
  if (!decided.length) return null;
  return Math.round((decided.filter((m) => m.unanimous).length / decided.length) * 100);
};

/* ---------- season progress ----------
   The schedule is every (task, unordered pair) in every category, so the
   denominator is knowable before a single match runs — which lets the site
   state honestly how much of the season is actually in the journal. */

const pairsOf = (n: number) => (n * (n - 1)) / 2;

export const scheduledIn = (cat: Category): number =>
  tasksIn(cat).length * pairsOf(ROSTER.length);

export const scheduledTotal = (): number =>
  CATEGORIES.reduce((s, c) => s + scheduledIn(c), 0);

export const playedTotal = (): number => ALL_MATCHES.length;

export const seasonProgress = (): number => {
  const total = scheduledTotal();
  return total ? Math.min(100, Math.round((playedTotal() / total) * 100)) : 0;
};

/** Progress as a label. A season that has started must never read "0%" —
    rounding a real match down to nothing is the kind of small lie this
    site exists to avoid. */
export const seasonProgressLabel = (): string => {
  const total = scheduledTotal();
  if (!total) return "—";
  const pct = (playedTotal() / total) * 100;
  if (pct > 0 && pct < 1) return "<1%";
  return `${Math.round(pct)}%`;
};

/* ---------- formatting ---------- */

export const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

export const fmtDateTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '—';

export const ago = (iso: string | null) => {
  if (!iso) return '—';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
};
