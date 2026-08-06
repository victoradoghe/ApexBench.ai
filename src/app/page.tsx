import Link from "next/link";
import Reveal from "@/components/Reveal";
import Newsletter from "@/components/Newsletter";
import Podium from "@/components/arena/Podium";
import MatchList from "@/components/arena/MatchList";
import ModelChip from "@/components/arena/ModelChip";
import Leaderboard from "@/components/Leaderboard";
import ValueMap from "@/components/ValueMap";
import {
  ago,
  CATEGORY_META,
  CAT_LABEL,
  champion,
  JUDGE_POOL,
  LATEST_RUN,
  overall,
  playedTotal,
  recentMatches,
  recordOf,
  ROSTER,
  scheduledTotal,
  seasonProgressLabel,
  TASKS,
  TOTAL_DECIDED,
  unanimityRate,
} from "@/data/arena";
import { LIVE_UPDATED_AT, MODELS, PROVIDERS, PROVIDER_COLORS, rankedModelCount } from "@/data/models";

function Marquee() {
  const items = [...PROVIDERS, ...PROVIDERS];
  return (
    <div className="marquee">
      <div className="marquee-track text-t3">
        {items.map((p, i) => (
          <span
            key={`${p}-${i}`}
            className="flex items-center gap-2 whitespace-nowrap text-base font-semibold tracking-tight"
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: PROVIDER_COLORS[p] ?? "#10b981" }}
            />
            {p}
          </span>
        ))}
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="font-mono text-3xl font-bold text-t1 sm:text-4xl">{value}</div>
      <div className="mt-1 text-xs text-t4">{label}</div>
    </div>
  );
}

export default function Home() {
  const top = champion();
  const board = overall();
  const unanimity = unanimityRate();

  return (
    <main className="flex-1">
      {/* ======================= HERO ======================= */}
      <section className="relative mx-auto max-w-7xl px-5 pt-36 pb-16 text-center md:pt-44">
        <div className="mx-auto mb-7 flex w-fit max-w-full flex-wrap items-center justify-center gap-2 rounded-full border border-edge bg-chip px-4 py-1.5 text-xs font-medium text-t2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-mint" />
          </span>
          Open-source coding benchmark
          <span className="text-t4">·</span>
          <span className="text-accent">{TOTAL_DECIDED} matches judged</span>
        </div>

        <h1 className="display mx-auto max-w-4xl text-4xl font-extrabold leading-[1.04] text-t1 sm:text-6xl md:text-[4.6rem]">
          Stop guessing which{" "}
          <span className="hero-grad bg-gradient-to-r from-brand-300 via-emerald-200 to-mint bg-clip-text text-transparent">
            agent is actually better
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-t3">
          ApexBench puts two models on the <span className="text-t1">same task</span> and has three
          independent judges decide who won — blind, cross-vendor, forced choice. Every rating traces
          back to a match you can open and read: both answers, all three votes, and the difference
          that decided it.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/arena/" className="btn-primary rounded-xl px-6 py-3.5 text-sm font-semibold">
            See who is winning
          </Link>
          <Link href="/head-to-head/" className="btn-ghost rounded-xl px-6 py-3.5 text-sm font-semibold">
            Run a head-to-head
          </Link>
        </div>

        <div className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-6 sm:grid-cols-4">
          <Stat value={String(TOTAL_DECIDED)} label="matches decided" />
          <Stat value={String(ROSTER.length)} label="competitors" />
          <Stat value={String(TASKS.length)} label="authored tasks" />
          <Stat
            value={unanimity === null ? "—" : `${unanimity}%`}
            label="unanimous verdicts"
          />
        </div>
      </section>

      <Marquee />

      {/* ======================= CHAMPION ======================= */}
      <Reveal>
        <section id="champion" className="mx-auto max-w-7xl px-5 py-20">
          <div className="mb-8 text-center">
            <h2 className="display text-3xl font-bold text-t1 sm:text-4xl">
              Best agent, all categories
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base text-t3">
              One model leads the board across every ladder it has entered. Not a vendor claim, not
              an average of published scores — the result of matches it won.
            </p>
          </div>

          {!top ? (
            <div className="card mx-auto max-w-2xl rounded-2xl px-6 py-14 text-center">
              <p className="text-base font-semibold text-t2">No champion yet</p>
              <p className="mx-auto mt-2 max-w-lg text-sm text-t4">
                No match has been decided, so there is nothing to crown. ApexBench shows an empty
                board rather than a placeholder ranking.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
              <div className="champion-glow rounded-2xl p-7 ring-1 ring-amber-400/35">
                <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 21h8m-4-4v4M6 4h12v5a6 6 0 01-12 0zM6 6H4a2 2 0 000 4h2m12-4h2a2 2 0 010 4h-2" />
                  </svg>
                  Overall champion
                </div>
                <ModelChip name={top.name} provider={top.provider} slug={top.slug} size={56} />
                <div className="mt-6 grid grid-cols-3 gap-3">
                  <div>
                    <div className="text-xs text-t4">Weighted Elo</div>
                    <div className="font-mono text-3xl font-bold text-t1">{top.score}</div>
                  </div>
                  <div>
                    <div className="text-xs text-t4">Record</div>
                    <div className="font-mono text-3xl font-bold text-t1">
                      {top.wins}-{top.losses}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-t4">Categories</div>
                    <div className="font-mono text-3xl font-bold text-t1">{top.cats}/5</div>
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-1.5">
                  {recordOf(top.slug).map(({ cat, rank }) => (
                    <span
                      key={cat}
                      className="rounded-full border border-edge2 bg-chip px-2.5 py-1 text-[11px] text-t3"
                    >
                      {CAT_LABEL[cat]} <span className="font-mono text-t1">#{rank}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="card rounded-2xl p-6">
                <div className="mb-4 flex items-baseline justify-between">
                  <h3 className="text-sm font-bold text-t1">The overall board</h3>
                  <Link href="/arena/" className="text-xs font-semibold text-accent hover:underline">
                    Full ladders →
                  </Link>
                </div>
                <ol className="space-y-1">
                  {board.slice(0, 8).map((r, i) => (
                    <li
                      key={r.slug}
                      className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-chip"
                    >
                      <span className="w-5 shrink-0 font-mono text-xs text-t4">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <ModelChip
                          name={r.name}
                          provider={r.provider}
                          slug={r.slug}
                          size={26}
                          showProvider={false}
                        />
                      </div>
                      <span className="w-14 shrink-0 text-right font-mono text-sm font-bold text-t1">
                        {r.score}
                      </span>
                    </li>
                  ))}
                </ol>
                <p className="mt-4 border-t border-edge pt-3 text-xs text-t4">
                  {playedTotal()} of {scheduledTotal()} scheduled matches played ·{" "}
                  {seasonProgressLabel()} of the season.
                </p>
              </div>
            </div>
          )}
        </section>
      </Reveal>

      {/* ======================= PODIUMS ======================= */}
      <Reveal>
        <section id="categories" className="mx-auto max-w-7xl px-5 py-20">
          <div className="mb-8 text-center">
            <h2 className="display text-3xl font-bold text-t1 sm:text-4xl">
              Best for each job
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base text-t3">
              The model that catches vulnerabilities is rarely the one that refuses to invent an
              API. Five ladders, scored separately and never averaged together.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {CATEGORY_META.map((meta) => (
              <Podium key={meta.key} meta={meta} />
            ))}
          </div>
        </section>
      </Reveal>

      {/* ======================= HOW IT WORKS ======================= */}
      <Reveal>
        <section className="mx-auto max-w-7xl px-5 py-20">
          <div className="card rounded-3xl p-8 sm:p-12">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
              <div>
                <h2 className="display text-3xl font-bold text-t1">
                  Why a match beats a score
                </h2>
                <p className="mt-4 text-base leading-relaxed text-t3">
                  A benchmark score tells you how a model did on a test set that may well be in its
                  training data. A match tells you which of two models handled{" "}
                  <span className="text-t1">this problem</span> better, as decided by three judges
                  that had to name the reason.
                </p>
                <p className="mt-4 text-base leading-relaxed text-t3">
                  Both models get identical context and neither knows it is competing. Their
                  identities are scrubbed before any judge sees a word. No judge shares a vendor with
                  either competitor, and each sees the answers in its own order — so nothing about
                  the seating can quietly favour one side.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link href="/methodology/" className="btn-primary rounded-xl px-5 py-3 text-sm font-semibold">
                    Read the methodology
                  </Link>
                  <Link href="/judges/" className="btn-ghost rounded-xl px-5 py-3 text-sm font-semibold">
                    Meet the {JUDGE_POOL.length} judges
                  </Link>
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-baseline justify-between">
                  <h3 className="text-sm font-bold text-t1">Latest from the journal</h3>
                  <Link href="/matches/" className="text-xs font-semibold text-accent hover:underline">
                    All matches →
                  </Link>
                </div>
                <MatchList matches={recentMatches(4)} />
                {LATEST_RUN && (
                  <p className="mt-3 text-xs text-t4">Last match run {ago(LATEST_RUN)}.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ======================= REGISTRY ======================= */}
      <Reveal>
        <section id="leaderboard" className="mx-auto max-w-7xl px-5 py-20">
          <div className="mb-8">
            <div className="mb-2 text-sm font-semibold text-accent">THE FIELD</div>
            <h2 className="display text-3xl font-bold text-t1 sm:text-4xl">
              The model registry
            </h2>
            <p className="mt-3 max-w-3xl text-base text-t3">
              A separate truth source, kept separate on purpose: {rankedModelCount()} frontier models
              with their <span className="text-t1">published</span> SWE-bench results, alongside live
              pricing, context and speed measured through OpenRouter. These are third-party numbers
              about models we do not run in the arena — so they are never folded into an arena
              rating.
            </p>
          </div>
          <Leaderboard />
        </section>
      </Reveal>

      {/* ======================= VALUE MAP ======================= */}
      <Reveal>
        <section id="value" className="mx-auto max-w-7xl px-5 py-20">
          <div className="mb-8">
            <h2 className="display text-3xl font-bold text-t1 sm:text-4xl">The cost of a point</h2>
            <p className="mt-3 max-w-2xl text-base text-t3">
              Published score against blended price. Everything on the frontier line is a model
              nothing cheaper beats — the rest are paying for something other than score.
            </p>
          </div>
          <ValueMap />
          <p className="mt-4 text-xs text-t4">
            Pricing and context live from the OpenRouter API
            {LIVE_UPDATED_AT ? ` · refreshed ${ago(LIVE_UPDATED_AT)}` : ""} · {MODELS.length} models
            tracked.
          </p>
        </section>
      </Reveal>

      {/* ======================= COMMUNITY ======================= */}
      <Reveal>
        <section id="community" className="mx-auto max-w-7xl px-5 py-20">
          <Newsletter />
        </section>
      </Reveal>
    </main>
  );
}
