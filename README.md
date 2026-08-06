# ApexBench

**Two models. One task. No names.**

ApexBench ranks coding models by putting them head-to-head on the same problem
and having three independent judges decide who won — blind, cross-vendor, forced
choice. Every rating traces back to a match you can open and read: both answers,
all three votes, and the difference that decided it.

Built with **Next.js 16** (App Router, static export), **Tailwind CSS v4** and **pnpm**.

## Two truth sources, kept apart

The site carries two kinds of number and never averages them together, because
the result would mean nothing:

| | The arena | The registry |
| --- | --- | --- |
| **What** | Ratings we produce ourselves | Results other people published |
| **Data** | Elo folded from played matches | SWE-bench Verified / Pro scores, with sources |
| **Who** | The arena roster (`scripts/arena/roster.mjs`) | Frontier models (`src/data/models.ts`) |
| **Pages** | `/arena`, `/head-to-head`, `/matches`, `/competitors` | `/models` |

A model in the registry has no Elo. A model in the arena has no SWE-bench score.
Live pricing, context, uptime and measured throughput are ours, and apply to the
registry only.

## How a match becomes a rating

1. **Seeded pairing** — the schedule is every (task, unordered pair) per
   category, ordered by an exposure-balancing scheduler off a fixed seed.
2. **Identical context** — both competitors get the task's public half as
   identical bytes, run concurrently, and are never told they are competing.
3. **Redaction** — vendor and family names are scrubbed from both answers before
   they reach a judge. Blindness does not depend on a competitor's compliance.
4. **Three judges** — seated from the pool, none sharing a vendor with either
   competitor, each seeing the answers in its own A/B order.
5. **Forced choice** — no ties. Each judge picks a side, names the decisive
   substantive difference, and grades correctness, grounding, constraint
   handling and completeness. A malformed verdict retries once, then abstains.
6. **Scoring** — two valid votes for the same side decide it. Elo starts at 1000,
   K = 32. One competitor failing is a **forfeit** for the other; both failing is
   a no-contest. Displayed ratings are confidence-weighted toward 1000 until a
   record is thick (under 10 matches shows as provisional).
7. **Journal** — the whole match appends to `results/<category>/journal.jsonl`
   *before* anything is rebuilt. Every ladder on the site is a fold of that log.

The full contract, including what it does **not** prove, is at `/methodology`.

## Run it

```bash
pnpm install
pnpm dev              # http://localhost:3000
pnpm build            # static site to ./out
```

Arena:

```bash
pnpm arena                            # play matches, append to the journal
pnpm arena -- --category security     # one category
pnpm arena -- --max-matches 10        # stop after N newly decided
pnpm snapshot                         # refold src/data/arena.json from the journal
pnpm season                           # arena + snapshot
```

`pnpm arena` needs `OPENROUTER_API_KEY` (env or `.env`). It is **resumable**:
journaled match IDs are skipped, so it can be re-run daily and the season
accumulates. It stops cleanly when the account quota returns 429.

> **On the free tier**, a match costs five requests (two competitors, three
> judges) against a daily allowance of roughly fifty — so expect a handful of
> matches per run, and a season that fills in over weeks. The
> `arena-season.yml` workflow runs it daily. Adding OpenRouter credits raises
> the allowance and unlocks a frontier roster: edit `scripts/arena/roster.mjs`
> and re-run. The journal is append-only and the two eras stay distinguishable
> by `methodologyVersion`.

Registry:

```bash
pnpm refresh          # OpenRouter pricing/context/uptime (+ speed probes with a key)
```

## Structure

| Path | What |
| --- | --- |
| `tasks/*.mjs` | The task packs. Each task has a public half (given to competitors, published on the site) and a private `reference` (judging context only). `schema.mjs` validates every task at load. |
| `scripts/arena/run.mjs` | The runner: schedules, runs competitors, seats judges, folds Elo, appends the journal. |
| `scripts/arena/core.mjs` | Pure deterministic core — Elo, seeded scheduling, judge seating. |
| `scripts/arena/prompts.mjs` | Competitor and judge prompts, identity redaction, verdict parsing. |
| `scripts/arena/client.mjs` | Fail-closed OpenRouter client: distinguishes upstream throttling from account quota, retries truncated reasoning. |
| `scripts/arena/build-snapshot.mjs` | Folds the journals into `src/data/arena.json` + `matches.json`. |
| `results/<cat>/journal.jsonl` | **The source of truth.** Append-only. Everything else is derived and disposable. |
| `src/data/arena.ts` | Typed accessors over the snapshot: ladders, podiums, head-to-head, judge stats. |
| `src/data/models.ts` | The registry: published scores with provenance, merged with the live OpenRouter snapshot. |

## Provenance

Every task's public and private halves are SHA-256 hashed into each journal line
that used them, so editing a task after a match ran does not rewrite history — it
makes the mismatch detectable. Because the fold is deterministic, the fastest way
to check any number on the site is to rebuild the snapshot from the journal and
compare.

## Performance notes

- All content is pre-rendered to HTML at build time — ladders are readable
  before any JS runs.
- Tailwind compiles at build time; no runtime CDN compiler.
- Fonts are self-hosted via `next/font` with `display: swap`.
- No animated blur layers; the only `backdrop-filter` is the sticky nav.
- Theme resolves in an inline pre-paint script — no flash; `?theme=light|dark`
  overrides for shareable links.
