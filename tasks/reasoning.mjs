/* Reasoning pack — every task has one provable answer buried in specs,
   logs, and configs, with false trails for anyone skimming. Wins by
   finding the correct answer and citing the files that prove it. */

/** @type {import('./schema.mjs').Task[]} */
export default [
  {
    id: 'reasoning/semver-resolution',
    version: 1,
    cluster: 'constraint-reconciliation',
    difficulty: 'hard',
    title: 'One Valid Version Assignment Under Ranges, a Peer Dep, and a Pin',
    summary:
      'Resolve four packages to the single assignment satisfying every SemVer range, a peer dep, single-instance, and a lockfile pin.',
    prompt: `The resolver must pick exactly one version of each package so every constraint holds at once. Rules are in [spec]; package ranges in [registry]; the app\'s direct deps and the lockfile pin in [manifest]; all published versions in [versions]. Cite artifact ids for every claim.

1. Give the one valid version of app-core, app-ui, app-log, and util. Show it satisfies every util range, the peer dep, the single-instance rule, and the pin.
2. For app-core, app-log, and util, name what stops each from going higher.
3. If the pin on app-ui were removed, which single package\'s version changes, and to what?`,
    artifacts: [
      {
        id: 'spec',
        kind: 'spec',
        label: 'resolver rules',
        body: `RULES (highest-compatible selection):
- Pick the HIGHEST published version of each package that satisfies all constraints.
- LOCKFILE PIN is authoritative: a pinned package resolves to exactly the pinned version.
- SINGLE-INSTANCE: util is installed at most once, shared by all dependents.
- Ranges are half-open: >=X <Y excludes Y. ^A.B.C means >=A.B.C <(A+1).0.0.`,
      },
      {
        id: 'registry',
        kind: 'table',
        label: 'package dependency ranges',
        body: `app-core 2.1.0  -> util >=4.0.0 <4.5.0
app-core 2.2.0  -> util >=4.5.0 <5.0.0
app-log  3.0.0  -> util >=3.5.0 <5.0.0
app-log  3.1.0  -> util >=4.5.0 <5.0.0
app-ui   1.1.0  -> util >=4.0.0 <5.0.0 ; peer app-core >=2.1.0
app-ui   1.2.0  -> util >=4.5.0 <5.0.0 ; peer app-core >=2.2.0`,
      },
      {
        id: 'manifest',
        kind: 'config',
        label: 'app manifest + lockfile',
        body: `dependencies: app-core ^2.0.0, app-ui ^1.0.0, app-log ^3.0.0
lockfile pin: app-ui = 1.1.0`,
      },
      {
        id: 'versions',
        kind: 'table',
        label: 'published versions',
        body: `app-core: 2.0.0, 2.1.0, 2.2.0
app-ui:   1.1.0, 1.2.0
app-log:  3.0.0, 3.1.0
util:     4.0.0, 4.4.0, 4.5.0, 4.6.0`,
      },
    ],
    reference: {
      resolution:
        'app-core 2.2.0, app-ui 1.1.0, app-log 3.1.0, util 4.6.0. app-ui is pinned to 1.1.0. ui 1.1.0 peers app-core >=2.1.0; within ^2.0.0 the highest is 2.2.0. core 2.2.0 needs util >=4.5.0 <5.0.0; log 3.1.0 (highest under ^3.0.0) needs util >=4.5.0 <5.0.0; ui 1.1.0 needs util >=4.0.0 <5.0.0. Intersection >=4.5.0 <5.0.0; highest published is 4.6.0. (2) core is capped by ^2.0.0 (<3.0.0) and no higher version is published (2.2.0 is max); log is capped by ^3.0.0 (<4.0.0), 3.1.0 is max; util is capped below 5.0.0 by every dependent range and 4.6.0 is the highest published under that ceiling. (3) Removing the pin lets app-ui float to 1.2.0 (highest published); ui 1.2.0 needs util >=4.5.0 and peer core >=2.2.0, both already satisfied by the existing graph, so only app-ui changes (1.1.0 → 1.2.0).',
      deliverables: [
        {
          id: 'd1',
          ask: 'the resolution',
          expected: 'app-core 2.2.0, app-ui 1.1.0, app-log 3.1.0, util 4.6.0.',
          artifacts: ['spec', 'registry', 'manifest', 'versions'],
          disqualifiers: ['util = 4.5.0', 'app-ui = 1.2.0 (ignores the pin)', 'app-core = 2.1.0'],
        },
        {
          id: 'd2',
          ask: 'maximality',
          expected:
            'core: ^2.0.0 caps <3.0.0 and 2.2.0 is the max published; log: ^3.0.0 caps <4.0.0, 3.1.0 max; util: all ranges cap <5.0.0, 4.6.0 is highest published under that.',
          artifacts: ['versions', 'registry', 'manifest'],
        },
        {
          id: 'd3',
          ask: 'pin lifted',
          expected: 'Only app-ui changes, to 1.2.0 (its peer core>=2.2.0 and util>=4.5.0 are already met).',
          artifacts: ['registry', 'versions'],
          disqualifiers: ['Claiming util or core also changes'],
        },
      ],
      requiredEvidence: ['registry', 'manifest', 'versions'],
      disqualifiers: ['Selecting util 4.5.0 over 4.6.0', 'Overriding the pin in deliverable 1'],
    },
  },
  {
    id: 'reasoning/rate-limit-matrix',
    version: 1,
    cluster: 'multi-artifact-synthesis',
    difficulty: 'hard',
    title: 'Effective Rate Limit Across Route, Plan, and a Global Cap',
    summary:
      'Three layers of limits stack; the effective ceiling is the tightest that applies, and a decoy note misreads it.',
    prompt: `A gateway applies rate limits from three configs: per-route [route], per-plan [plan], and a global [global]. A support note [note] states a customer\'s effective limit. Using the precedence rules in [rules], compute the true effective requests-per-minute for a Pro customer calling POST /search, say whether the support note is right, and cite the configs. `,
    artifacts: [
      {
        id: 'rules',
        kind: 'spec',
        label: 'precedence rules',
        body: `The effective limit for a request is the MINIMUM of every limit that applies:
its route limit, its plan limit, and the global per-customer cap. Limits are
requests per minute (rpm). A route with no explicit limit inherits the plan limit.`,
      },
      {
        id: 'route',
        kind: 'config',
        label: 'route limits',
        body: `GET  /search  -> 600 rpm
POST /search  -> 120 rpm
POST /index   -> 60 rpm`,
      },
      {
        id: 'plan',
        kind: 'config',
        label: 'plan limits',
        body: `Free -> 60 rpm
Pro  -> 300 rpm
Enterprise -> 5000 rpm`,
      },
      {
        id: 'global',
        kind: 'config',
        label: 'global cap',
        body: `Global per-customer cap: 1000 rpm (applies to every customer regardless of plan).`,
      },
      {
        id: 'note',
        kind: 'note',
        label: 'support note',
        body: `"Pro customer, POST /search. Pro is 300 rpm, so their limit is 300 rpm."`,
      },
    ],
    reference: {
      resolution:
        'Effective limit = min(route, plan, global) = min(120, 300, 1000) = 120 rpm. The route limit for POST /search (120) is the tightest applicable, so it governs. The support note is WRONG: it applied the plan limit (300) and ignored the tighter route limit (120). The global cap (1000) is not binding here.',
      deliverables: [
        {
          id: 'd1',
          ask: 'effective rpm',
          expected: '120 rpm (min of route 120, plan 300, global 1000).',
          artifacts: ['rules', 'route', 'plan', 'global'],
          disqualifiers: ['300 rpm', '1000 rpm', '60 rpm'],
        },
        {
          id: 'd2',
          ask: 'is the note right',
          expected: 'No — it used the plan limit and ignored the tighter POST /search route limit of 120.',
          artifacts: ['note', 'route'],
        },
      ],
      requiredEvidence: ['route', 'rules'],
      disqualifiers: ['Answering 300 by trusting the note'],
    },
  },
  {
    id: 'reasoning/deadlock-ordering',
    version: 1,
    cluster: 'root-cause-reasoning',
    difficulty: 'expert',
    title: 'Which Two Transactions Can Deadlock, and Why the Third Cannot',
    summary:
      'Three transactions acquire the same locks; find the pair with a cyclic wait and prove the third is safe.',
    prompt: `Three transactions acquire row locks in the orders of [txns], under the lock rules in [rules]. Identify which pair can deadlock, give the exact interleaving that forms the cycle, and prove that the remaining transaction cannot participate in a deadlock with either. Cite artifact ids.`,
    artifacts: [
      {
        id: 'rules',
        kind: 'spec',
        label: 'lock rules',
        body: `Locks are exclusive per row and held until commit. A transaction blocks while
waiting for a lock another holds. A deadlock exists iff there is a cycle of
transactions each waiting for a row held by the next.`,
      },
      {
        id: 'txns',
        kind: 'spec',
        label: 'transactions (lock acquisition order)',
        body: `T1: lock A, then lock B, then commit.
T2: lock B, then lock A, then commit.
T3: lock A, then lock B, then commit.   (same order as T1)`,
      },
    ],
    reference: {
      resolution:
        'T1 and T2 can deadlock: they acquire A and B in OPPOSITE orders. Interleaving: T1 locks A; T2 locks B; T1 waits for B (held by T2); T2 waits for A (held by T1) — a cycle T1→T2→T1. T3 cannot deadlock with T1 (or with a lone T2) because T1 and T3 acquire locks in the SAME order (A then B); two transactions that always take locks in a consistent global order can never form a cycle — one simply waits for the other and then proceeds. T3 could only be involved in a cycle via T2 (the opposite-order transaction), i.e. the hazard is always the opposite-ordering pair, never the same-ordering pair. The classic fix is a consistent global lock order.',
      deliverables: [
        {
          id: 'd1',
          ask: 'the deadlocking pair',
          expected: 'T1 and T2 — they lock A and B in opposite orders.',
          artifacts: ['txns', 'rules'],
          disqualifiers: ['Naming T1 & T3', 'Claiming all three deadlock together as the primary answer'],
        },
        {
          id: 'd2',
          ask: 'the cyclic interleaving',
          expected:
            'T1 locks A; T2 locks B; T1 waits for B (T2 holds); T2 waits for A (T1 holds) → cycle.',
          artifacts: ['txns'],
        },
        {
          id: 'd3',
          ask: 'why T3 is safe with T1',
          expected:
            'T1 and T3 take locks in the same order (A then B); consistent ordering precludes a wait cycle — one waits, then proceeds.',
          artifacts: ['txns', 'rules'],
        },
      ],
      requiredEvidence: ['txns', 'rules'],
      disqualifiers: ['Concluding T1 & T3 are the primary hazard'],
    },
  },
];
