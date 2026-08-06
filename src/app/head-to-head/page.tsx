import type { Metadata } from "next";
import Link from "next/link";
import HeadToHead from "@/components/arena/HeadToHead";
import MatchList from "@/components/arena/MatchList";
import Reveal from "@/components/Reveal";
import {
  ago,
  JUDGE_POOL,
  LATEST_RUN,
  playedPairs,
  recentMatches,
  ROSTER,
  TOTAL_DECIDED,
} from "@/data/arena";

export const metadata: Metadata = {
  title: "Head-to-Head — Any Two Models, Same Task, Three Judges",
  description:
    "Pick two models and see what happened when they actually met: the lifetime record, the per-category split, and every judged match with both answers and all three judges' votes and rationales.",
};

const PANEL: [string, string][] = [
  [
    "Same task, same context",
    "Both models receive byte-identical instructions and artifacts, and answer concurrently. Neither is told it is competing.",
  ],
  [
    "Three cross-vendor judges",
    "No judge shares a vendor with either competitor, so no model is ever scored by its own family.",
  ],
  [
    "Blind and order-shuffled",
    "Vendor and family names are scrubbed from both answers, and which answer is shown first is decided per judge — position bias cannot line up across the panel.",
  ],
  [
    "Forced choice, with reasons",
    "No ties allowed. Each judge names the one substantive difference that decided it and grades correctness, grounding, constraint handling and completeness.",
  ],
];

export default function HeadToHeadPage() {
  const pairs = playedPairs();

  return (
    <main className="mx-auto max-w-5xl flex-1 px-5 pt-32 pb-20">
      <nav className="mb-8 flex items-center gap-2 text-xs text-t4">
        <Link href="/" className="transition hover:text-accent">Home</Link>
        <span>/</span>
        <span className="text-t2">Head-to-Head</span>
      </nav>

      <header className="text-center">
        <div className="mb-3 text-sm font-semibold text-accent">HEAD-TO-HEAD</div>
        <h1 className="display mx-auto max-w-3xl text-4xl font-extrabold text-t1 sm:text-5xl">
          Put any two models{" "}
          <span className="hero-grad bg-gradient-to-r from-brand-300 via-emerald-200 to-mint bg-clip-text text-transparent">
            in the ring
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-t3">
          Same task, same context, three independent judges. Pick a matchup and you get the real
          record — not a projection from two separate scores, but the matches these two actually
          played, with every vote and the reasoning behind it.
        </p>
      </header>

      <section className="mt-10">
        <HeadToHead />
      </section>

      {/* how the judging works */}
      <Reveal>
        <section className="mt-16">
          <h2 className="display text-2xl font-bold text-t1">Who decides, and how</h2>
          <p className="mt-1.5 max-w-2xl text-sm text-t3">
            A matchup is only as trustworthy as its panel. Three of the{" "}
            <Link href="/judges/" className="text-accent hover:underline">
              {JUDGE_POOL.length} pool judges
            </Link>{" "}
            are seated per match under rules designed to remove every obvious way a verdict could be
            bought.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {PANEL.map(([title, body]) => (
              <div key={title} className="card rounded-xl p-5">
                <h3 className="text-sm font-bold text-t1">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-t3">{body}</p>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      {/* most-played rivalries */}
      {pairs.length > 0 && (
        <Reveal>
          <section className="mt-16">
            <h2 className="display text-2xl font-bold text-t1">Most-played rivalries</h2>
            <p className="mt-1.5 text-sm text-t3">
              The pairs with the thickest record so far — the matchups whose result is least likely
              to be noise.
            </p>
            <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
              {pairs.slice(0, 6).map((p) => {
                const [x, y] = p.pair;
                const nx = ROSTER.find((m) => m.slug === x);
                const ny = ROSTER.find((m) => m.slug === y);
                if (!nx || !ny) return null;
                return (
                  <li key={p.pair.join("|")} className="card rounded-xl p-4">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate font-semibold text-t1">{nx.name}</span>
                      <span className="shrink-0 font-mono text-[11px] text-t4">vs</span>
                      <span className="min-w-0 truncate text-right font-semibold text-t1">
                        {ny.name}
                      </span>
                    </div>
                    <div className="mt-1.5 text-center text-[11px] text-t4">
                      {p.meetings.length} decided meeting{p.meetings.length === 1 ? "" : "s"}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </Reveal>
      )}

      {/* recent matches */}
      <Reveal>
        <section className="mt-16">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="display text-2xl font-bold text-t1">Latest matches</h2>
            <Link href="/matches/" className="text-xs font-semibold text-accent transition hover:underline">
              Full journal →
            </Link>
          </div>
          <MatchList matches={recentMatches(6)} />
          <p className="mt-3 text-xs text-t4">
            {TOTAL_DECIDED} decided across {ROSTER.length} competitors
            {LATEST_RUN ? ` · last run ${ago(LATEST_RUN)}` : ""}.
          </p>
        </section>
      </Reveal>
    </main>
  );
}
