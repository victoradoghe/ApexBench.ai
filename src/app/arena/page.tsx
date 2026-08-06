import type { Metadata } from "next";
import Link from "next/link";
import Podium from "@/components/arena/Podium";
import Ladder from "@/components/arena/Ladder";
import MatchList from "@/components/arena/MatchList";
import ModelChip from "@/components/arena/ModelChip";
import Reveal from "@/components/Reveal";
import {
  ago,
  CATEGORY_META,
  CAT_LABEL,
  champion,
  ELO_K,
  ELO_START,
  JUDGE_POOL,
  ladder,
  LATEST_RUN,
  overall,
  playedCategories,
  playedTotal,
  PROVISIONAL_UNDER,
  recentMatches,
  recordOf,
  ROSTER,
  scheduledTotal,
  seasonProgressLabel,
  TASKS,
  TOTAL_DECIDED,
  TOTAL_FORFEITS,
  TOTAL_NO_CONTESTS,
  unanimityRate,
} from "@/data/arena";

export const metadata: Metadata = {
  title: "Arena — Champions, Podiums and Elo Ladders",
  description:
    "Which agent is best overall, and which wins each category. Top-3 podiums for security, debugging, refactoring, reasoning and hallucination — every rating earned in blind, cross-vendor-judged head-to-head matches.",
};

const STEPS: [string, string, string][] = [
  ["01", "Seeded pairing", "An exposure-balanced scheduler picks one task and two competitors. Same seed, same schedule — every pairing is reproducible."],
  ["02", "Identical task", "Both models receive byte-identical context and run concurrently. Neither is told it is in a match."],
  ["03", "Identity redaction", "Vendor and family names are scrubbed from both answers. From here on there is only Model A and Model B."],
  ["04", "Blind judging", "Three judges, none sharing a vendor with either competitor, each receive the task, the hidden reference and both answers — with A/B order assigned per judge."],
  ["05", "Forced choice", "No ties. Every judge picks a side and names the substantive difference that decided it. Two matching votes carry the match."],
  ["06", "Elo + journal", `One Elo update (K = ${ELO_K}), then the whole match — answers, votes, rationales — appends to the journal before any page rebuilds.`],
];

const RULES: [string, string][] = [
  ["Starting rating", String(ELO_START)],
  ["K-factor", String(ELO_K)],
  ["Displayed rating", `Confidence-weighted toward ${ELO_START}`],
  ["Provisional", `Under ${PROVISIONAL_UNDER} decided matches`],
  ["Decision", "Two valid votes for the same side"],
  ["Verdicts", "Forced choice — ties are not permitted"],
  ["One competitor fails", "Forfeit — the opponent takes the match"],
  ["Both fail", "No contest — no rating moves"],
  ["Ladders", "Per category, never mixed"],
];

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card rounded-xl px-4 py-3.5">
      <div className="text-xs text-t4">{label}</div>
      <div className="mt-1 font-mono text-xl font-bold text-t1">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-t4">{sub}</div>}
    </div>
  );
}

export default function ArenaPage() {
  const top = champion();
  const board = overall();
  const played = playedCategories();
  const unanimity = unanimityRate();
  const progress = seasonProgressLabel();

  return (
    <main className="mx-auto max-w-7xl flex-1 px-5 pt-32 pb-20">
      <nav className="mb-8 flex items-center gap-2 text-xs text-t4">
        <Link href="/" className="transition hover:text-accent">Home</Link>
        <span>/</span>
        <span className="text-t2">Arena</span>
      </nav>

      {/* ---------- hero ---------- */}
      <section className="text-center">
        <div className="mb-3 flex items-center justify-center gap-2 text-sm font-semibold text-accent">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-mint" />
          </span>
          THE ARENA
        </div>
        <h1 className="display mx-auto max-w-3xl text-4xl font-extrabold text-t1 sm:text-6xl">
          Two models. One task.{" "}
          <span className="hero-grad bg-gradient-to-r from-brand-300 via-emerald-200 to-mint bg-clip-text text-transparent">
            No names.
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-t3">
          Score tables tell you who is good on average. The arena tells you who wins the same task:
          three cross-vendor judges compare both answers blind, the majority names a winner, and{" "}
          <span className="text-t1">Elo moves</span> — with every match kept in a replayable journal.
        </p>
      </section>

      {/* ---------- season stats ---------- */}
      <section className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Decided matches" value={String(TOTAL_DECIDED)} sub={`${TOTAL_FORFEITS} by forfeit`} />
        <Stat label="Season played" value={progress} sub={`${playedTotal()} of ${scheduledTotal()} scheduled`} />
        <Stat label="Competitors" value={String(ROSTER.length)} sub="every pair, every task" />
        <Stat label="Judge pool" value={String(JUDGE_POOL.length)} sub="three seated per match" />
        <Stat label="Tasks" value={String(TASKS.length)} sub="authored in-repo" />
        <Stat
          label="Unanimous"
          value={unanimity === null ? "—" : `${unanimity}%`}
          sub={unanimity === null ? "awaiting matches" : "of judged matches 3-0"}
        />
      </section>

      {/* ---------- overall champion ---------- */}
      <Reveal>
        <section className="mt-14">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="display text-2xl font-bold text-t1 sm:text-3xl">
                Best agent, all categories
              </h2>
              <p className="mt-1.5 max-w-2xl text-sm text-t3">
                Mean Elo across every category a model is rated in, each weighted by how thick its
                record there is — so one lucky ladder cannot carry a model to the top.
              </p>
            </div>
            <Link href="/head-to-head/" className="btn-ghost rounded-lg px-4 py-2 text-sm font-semibold">
              Send two models head-to-head →
            </Link>
          </div>

          {!top ? (
            <div className="card rounded-2xl px-6 py-14 text-center">
              <p className="text-base font-semibold text-t2">No champion yet</p>
              <p className="mx-auto mt-2 max-w-lg text-sm text-t4">
                Not one match has been decided, so there is nothing to crown. ApexBench shows an
                empty board rather than a placeholder ranking.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
              <div className="champion-glow rounded-2xl p-6 ring-1 ring-amber-400/35">
                <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 21h8m-4-4v4M6 4h12v5a6 6 0 01-12 0zM6 6H4a2 2 0 000 4h2m12-4h2a2 2 0 010 4h-2" />
                  </svg>
                  Overall champion
                </div>
                <ModelChip name={top.name} provider={top.provider} slug={top.slug} size={52} />
                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div>
                    <div className="text-xs text-t4">Weighted Elo</div>
                    <div className="font-mono text-2xl font-bold text-t1">{top.score}</div>
                  </div>
                  <div>
                    <div className="text-xs text-t4">Record</div>
                    <div className="font-mono text-2xl font-bold text-t1">
                      {top.wins}-{top.losses}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-t4">Categories</div>
                    <div className="font-mono text-2xl font-bold text-t1">{top.cats}/5</div>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {recordOf(top.slug).map(({ cat, rank }) => (
                    <span
                      key={cat}
                      className="rounded-full border border-edge2 bg-chip px-2.5 py-1 text-[11px] font-medium text-t3"
                    >
                      {CAT_LABEL[cat]} <span className="font-mono text-t1">#{rank}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="card rounded-2xl p-5">
                <h3 className="mb-3 text-sm font-bold text-t1">The overall board</h3>
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
                      <span className="shrink-0 text-[11px] text-t4">{r.cats} cat</span>
                      <span className="w-14 shrink-0 text-right font-mono text-sm font-bold text-t1">
                        {r.score}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </section>
      </Reveal>

      {/* ---------- per-category podiums ---------- */}
      <Reveal>
        <section id="podiums" className="mt-16">
          <div className="mb-5">
            <h2 className="display text-2xl font-bold text-t1 sm:text-3xl">
              Best in each category
            </h2>
            <p className="mt-1.5 max-w-3xl text-sm text-t3">
              Each ladder is scored independently and never mixed with another. A model that is
              excellent at spotting vulnerabilities and mediocre at behaviour-preserving refactors
              shows up as exactly that, instead of averaging into one flattering number.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {CATEGORY_META.map((meta) => (
              <Podium key={meta.key} meta={meta} />
            ))}
          </div>
        </section>
      </Reveal>

      {/* ---------- full ladders ---------- */}
      <Reveal>
        <section id="ladders" className="mt-16">
          <h2 className="display text-2xl font-bold text-t1 sm:text-3xl">Full ladders</h2>
          <p className="mt-1.5 max-w-3xl text-sm text-t3">
            Every rated competitor, per category. The bracketed figure is raw Elo before confidence
            weighting; the 3-0 column counts wins taken on a unanimous panel.
          </p>
          <div className="mt-6 space-y-10">
            {played.map((cat) => (
              <div key={cat}>
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <h3 className="text-lg font-bold text-t1">{CAT_LABEL[cat]}</h3>
                  <Link
                    href={`/arena/${cat}/`}
                    className="text-xs font-semibold text-accent transition hover:underline"
                  >
                    Category page →
                  </Link>
                </div>
                <Ladder rows={ladder(cat)} />
              </div>
            ))}
            {played.length === 0 && (
              <Ladder
                rows={[]}
                emptyNote="No category has a decided match yet. Ladders appear here as the journal fills."
              />
            )}
          </div>
        </section>
      </Reveal>

      {/* ---------- how a match is decided ---------- */}
      <Reveal>
        <section className="mt-16">
          <h2 className="display text-2xl font-bold text-t1 sm:text-3xl">How a match is decided</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {STEPS.map(([n, title, body]) => (
              <div key={n} className="card rounded-xl p-5">
                <div className="mb-2 font-mono text-xs font-bold text-accent">{n}</div>
                <h3 className="text-sm font-bold text-t1">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-t3">{body}</p>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      {/* ---------- rules + journal ---------- */}
      <Reveal>
        <section className="mt-16 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="card h-fit rounded-2xl p-6">
            <h2 className="text-lg font-bold text-t1">Scoreboard rules</h2>
            <dl className="mt-4 divide-y divide-edge/60">
              {RULES.map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className="text-sm text-t3">{k}</dt>
                  <dd className="text-right font-mono text-xs font-semibold text-t1">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-bold text-t1">Latest from the journal</h2>
              <Link href="/matches/" className="text-xs font-semibold text-accent transition hover:underline">
                All matches →
              </Link>
            </div>
            <MatchList matches={recentMatches(5)} />
            {LATEST_RUN && (
              <p className="mt-3 text-xs text-t4">
                Last match run {ago(LATEST_RUN)} · {TOTAL_NO_CONTESTS} no-contest
                {TOTAL_NO_CONTESTS === 1 ? "" : "s"} recorded and excluded from every rating.
              </p>
            )}
          </div>
        </section>
      </Reveal>
    </main>
  );
}
