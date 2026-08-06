/* Debugging pack — a failing system with planted decoys. Wins by pinning
   the real root cause and a fix that holds, not a patch that hides the
   symptom. */

/** @type {import('./schema.mjs').Task[]} */
export default [
  {
    id: 'debugging/race-double-charge',
    version: 1,
    cluster: 'concurrency-defect',
    difficulty: 'expert',
    title: 'Customers Charged Twice When They Double-Click Checkout',
    summary:
      'A check-then-act on the idempotency key races under concurrency; a tempting log line points at retries instead.',
    prompt: `Support reports customers occasionally charged twice. The checkout path is [charge], the schema is [schema], and a fresh incident trace is in [trace]. There is also an ops hunch in [hunch]. Find the true root cause, explain the exact interleaving that produces a double charge, say why the ops hunch is a decoy, and give a fix that actually closes the race (not one that merely makes it rarer). Cite artifact ids.`,
    artifacts: [
      {
        id: 'charge',
        kind: 'code',
        label: 'checkout/charge.js',
        body: `async function charge(userId, cartId, idemKey) {
  // 1. has this idempotency key already been used?
  const existing = await db.query(
    'SELECT id FROM charges WHERE idem_key = $1', [idemKey]);
  if (existing.rows.length) return existing.rows[0];   // already charged

  // 2. no row found -> call the payment provider, then record it
  const receipt = await provider.capture(userId, cartTotal(cartId));
  const row = await db.query(
    'INSERT INTO charges(idem_key, user_id, receipt) VALUES($1,$2,$3) RETURNING id',
    [idemKey, userId, receipt.id]);
  return row.rows[0];
}`,
      },
      {
        id: 'schema',
        kind: 'spec',
        label: 'db/charges.sql',
        body: `CREATE TABLE charges (
  id       BIGSERIAL PRIMARY KEY,
  idem_key TEXT NOT NULL,          -- NOTE: no UNIQUE constraint
  user_id  BIGINT NOT NULL,
  receipt  TEXT NOT NULL,
  created  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_charges_idem ON charges(idem_key);  -- non-unique`,
      },
      {
        id: 'trace',
        kind: 'log',
        label: 'incident trace (one double charge)',
        body: `12:00:03.101 req A  SELECT charges WHERE idem_key=k9 -> 0 rows
12:00:03.104 req B  SELECT charges WHERE idem_key=k9 -> 0 rows
12:00:03.210 req A  provider.capture -> receipt rcpt_A
12:00:03.244 req B  provider.capture -> receipt rcpt_B
12:00:03.301 req A  INSERT charges(idem_key=k9) -> id 5567
12:00:03.332 req B  INSERT charges(idem_key=k9) -> id 5568
(two receipts, same idem_key k9, same cart)`,
      },
      {
        id: 'hunch',
        kind: 'note',
        label: 'ops hunch',
        body: `"Our HTTP client retries on 5xx with a 200ms backoff. I bet the provider
returns a spurious 500, we retry, and both attempts succeed — we should turn
off client retries on the capture call."`,
      },
    ],
    reference: {
      resolution:
        'Root cause: a check-then-act (TOCTOU) race on idem_key with no uniqueness enforcement. Two concurrent requests with the same idem_key both run the SELECT before either INSERTs (trace shows A and B both read 0 rows at 12:00:03.10x), so both proceed to provider.capture and both INSERT — the schema has only a NON-UNIQUE index, so the database permits two rows for k9. The ops hunch (client retries) is a decoy: the trace shows two DISTINCT requests A and B each capturing once, not one request retried; disabling retries would not stop two concurrent clicks. Durable fix: add a UNIQUE constraint on idem_key and let the INSERT be the authority — on unique-violation, look up and return the existing charge (insert-first / upsert), so only one capture can ever win. (Capturing before the row exists is itself risky; the robust pattern reserves the key row first, then captures.)',
      deliverables: [
        {
          id: 'd1',
          ask: 'the root cause',
          expected:
            'TOCTOU race: concurrent SELECT-then-INSERT on idem_key with no UNIQUE constraint, so two requests both see 0 rows and both charge.',
          artifacts: ['charge', 'schema', 'trace'],
          disqualifiers: ['Attributing it to client retries', 'Attributing it to provider double-capture'],
        },
        {
          id: 'd2',
          ask: 'the exact interleaving',
          expected:
            'A SELECT(0) → B SELECT(0) → A capture → B capture → A INSERT → B INSERT; both inserts succeed because the index is non-unique.',
          artifacts: ['trace', 'schema'],
        },
        {
          id: 'd3',
          ask: 'why the hunch is a decoy',
          expected:
            'The trace shows two separate requests A and B each capturing exactly once — not one request retried. Disabling retries leaves the concurrent-click race intact.',
          artifacts: ['trace', 'hunch'],
        },
        {
          id: 'd4',
          ask: 'a durable fix',
          expected:
            'UNIQUE(idem_key) and rely on the insert: reserve/insert the key first and on unique violation return the existing charge, so only one capture wins. Not merely lowering timing or disabling retries.',
          artifacts: ['charge', 'schema'],
        },
      ],
      requiredEvidence: ['trace', 'schema'],
      disqualifiers: ['A fix that only shrinks the window (locks around the SELECT without uniqueness)'],
    },
  },
  {
    id: 'debugging/timezone-off-by-one',
    version: 1,
    cluster: 'root-cause-isolation',
    difficulty: 'hard',
    title: 'Daily Report Counts Are Off by One Near Midnight',
    summary:
      'A report bucket boundary uses local-time formatting over UTC storage; a "leap second" decoy is planted.',
    prompt: `A daily-active-users report is occasionally off by one compared to raw events. Events are stored per [schema], bucketed by [bucket], with a sample discrepancy in [sample] and an engineer's theory in [theory]. Identify the real cause, show with the sample how an event lands in the wrong day, dismiss the decoy theory, and give the fix. Cite artifact ids.`,
    artifacts: [
      {
        id: 'schema',
        kind: 'spec',
        label: 'events table',
        body: `-- ts is stored in UTC (timestamptz), always.
CREATE TABLE events (id BIGSERIAL, user_id BIGINT, ts TIMESTAMPTZ);
-- server TZ = UTC; report worker runs on a box with TZ=America/New_York`,
      },
      {
        id: 'bucket',
        kind: 'code',
        label: 'report/bucket.js',
        body: `// buckets an event into a YYYY-MM-DD day key
function dayKey(tsIso) {
  const d = new Date(tsIso);           // parses the UTC instant fine
  // toLocaleDateString uses the WORKER's local TZ (America/New_York)
  return d.toLocaleDateString('en-CA'); // 'YYYY-MM-DD'
}`,
      },
      {
        id: 'sample',
        kind: 'log',
        label: 'discrepancy sample',
        body: `event ts (UTC): 2026-03-10T02:30:00Z
raw daily query (UTC day):   bucket = 2026-03-10
report dayKey() output:      bucket = 2026-03-09
=> user counted on Mar 9 by the report, Mar 10 by the raw query`,
      },
      {
        id: 'theory',
        kind: 'note',
        label: 'engineer theory',
        body: `"March 10 is near a DST change and there was a leap second inserted in 2026.
I think Date is mishandling the leap second and dropping an event."`,
      },
    ],
    reference: {
      resolution:
        'Root cause: dayKey() converts a UTC instant to a day string using the report worker\'s LOCAL timezone (toLocaleDateString with TZ=America/New_York), while the raw query buckets by UTC day. For 2026-03-10T02:30:00Z, New York local time is 2026-03-09 21:30, so the report assigns Mar 9 while the UTC-based raw query assigns Mar 10 — an off-by-one for any event in the first few UTC hours of a day. The leap-second/DST theory is a decoy: the shift is a fixed UTC→local offset, not a one-second or DST artifact (it happens every day near the UTC midnight boundary, not only at DST). Fix: bucket in UTC — derive the day key from the UTC date (e.g. tsIso.slice(0,10) or toISOString().slice(0,10)), matching the storage and the raw query.',
      deliverables: [
        {
          id: 'd1',
          ask: 'the root cause',
          expected:
            'dayKey() buckets by the worker\'s local timezone (toLocaleDateString) while storage/raw query are UTC — a UTC↔local boundary mismatch.',
          artifacts: ['bucket', 'schema'],
          disqualifiers: ['Blaming a leap second', 'Blaming DST specifically'],
        },
        {
          id: 'd2',
          ask: 'walk the sample',
          expected:
            '02:30Z is 21:30 previous-day in America/New_York, so the report emits 2026-03-09 while the UTC query emits 2026-03-10.',
          artifacts: ['sample', 'bucket'],
        },
        {
          id: 'd3',
          ask: 'dismiss the decoy',
          expected:
            'It is a constant UTC-offset misbucketing that occurs near every UTC midnight, not a one-off leap-second/DST bug; magnitude is hours, not a second.',
          artifacts: ['theory', 'sample'],
        },
        {
          id: 'd4',
          ask: 'the fix',
          expected: 'Bucket by UTC day (toISOString().slice(0,10) or equivalent), matching storage.',
          artifacts: ['bucket'],
        },
      ],
      requiredEvidence: ['bucket', 'sample'],
      disqualifiers: ['Fix that sets the worker TZ but still uses local formatting inconsistently with the raw query'],
    },
  },
  {
    id: 'debugging/n-plus-one-timeout',
    version: 1,
    cluster: 'fix-adequacy',
    difficulty: 'standard',
    title: 'Dashboard Times Out Only for Power Users',
    summary:
      'An N+1 query scales with a user\'s project count; a cache decoy hides the symptom without fixing it.',
    prompt: `A dashboard endpoint [loader] times out, but only for users with many projects. Given the timing breakdown [timing] and a proposed patch [patch], identify the real cause, explain why it correlates with project count, judge whether the proposed patch actually fixes it or just hides the symptom, and give the correct fix. Cite artifact ids.`,
    artifacts: [
      {
        id: 'loader',
        kind: 'code',
        label: 'dashboard/loader.js',
        body: `async function loadDashboard(userId) {
  const projects = await db.query(
    'SELECT id, name FROM projects WHERE owner = $1', [userId]);
  // for each project, fetch its latest deploy — one query per project
  for (const p of projects.rows) {
    const d = await db.query(
      'SELECT status, at FROM deploys WHERE project = $1 ORDER BY at DESC LIMIT 1',
      [p.id]);
    p.latest = d.rows[0] || null;
  }
  return projects.rows;
}`,
      },
      {
        id: 'timing',
        kind: 'log',
        label: 'timing by user',
        body: `user with   3 projects:  4 queries,   38 ms  total
user with  40 projects: 41 queries,  520 ms  total
user with 220 projects: 221 queries, 3180 ms  total  (gateway timeout at 3000ms)
each deploy query: ~14 ms; projects query: ~9 ms`,
      },
      {
        id: 'patch',
        kind: 'diff',
        label: 'proposed patch',
        body: `+ // cache the whole dashboard for 60s per user
+ const hit = cache.get('dash:' + userId);
+ if (hit) return hit;
  const projects = await db.query(...);
  ...
+ cache.set('dash:' + userId, projects.rows, 60);
  return projects.rows;`,
      },
    ],
    reference: {
      resolution:
        'Root cause: classic N+1 — one deploy query per project inside a loop, so total queries and latency scale linearly with project count (timing: 3→4 queries/38ms, 220→221 queries/3180ms). The proposed 60s cache only hides the symptom: the first (cold) request for a power user still runs 221 queries and still times out, so the endpoint never returns to populate the cache; it also serves stale data. Correct fix: eliminate the N+1 with a single set-based query — fetch the latest deploy for all of the user\'s projects at once (e.g. a lateral join or a window function partitioned by project, or WHERE project = ANY($1)), turning 1+N queries into 2 (or 1).',
      deliverables: [
        {
          id: 'd1',
          ask: 'the root cause',
          expected: 'N+1 query: a per-project deploy query inside the loop.',
          artifacts: ['loader', 'timing'],
        },
        {
          id: 'd2',
          ask: 'why it tracks project count',
          expected: 'Query count = 1 + (#projects); latency grows ~14ms per project, matching the timing table.',
          artifacts: ['timing'],
        },
        {
          id: 'd3',
          ask: 'does the patch fix it',
          expected:
            'No — the cold request for a power user still runs N+1 and times out before it can populate the cache; it also serves stale data. It hides, not fixes.',
          artifacts: ['patch', 'timing'],
          disqualifiers: ['Endorsing the cache as the real fix'],
        },
        {
          id: 'd4',
          ask: 'the correct fix',
          expected:
            'Single set-based query for latest deploy across all projects (lateral join / window function / project = ANY(ids)), reducing to ~2 queries.',
          artifacts: ['loader'],
        },
      ],
      requiredEvidence: ['loader', 'timing'],
      disqualifiers: ['Recommending only to raise the gateway timeout'],
    },
  },
];
