import type { Metadata } from "next";
import Link from "next/link";
import MatchBrowser from "@/components/arena/MatchBrowser";
import {
  ago,
  ALL_MATCHES,
  LATEST_RUN,
  TOTAL_DECIDED,
  TOTAL_FORFEITS,
  TOTAL_NO_CONTESTS,
} from "@/data/arena";

export const metadata: Metadata = {
  title: "Matches — The Append-Only Journal",
  description:
    "Every match ApexBench has run, in the order it ran. Filter by category or outcome and open any match for both answers, all three judge votes and the reasoning behind each one.",
};

export default function MatchesPage() {
  return (
    <main className="mx-auto max-w-5xl flex-1 px-5 pt-32 pb-20">
      <nav className="mb-8 flex items-center gap-2 text-xs text-t4">
        <Link href="/" className="transition hover:text-accent">Home</Link>
        <span>/</span>
        <span className="text-t2">Matches</span>
      </nav>

      <header>
        <h1 className="display text-4xl font-extrabold text-t1 sm:text-5xl">The journal</h1>
        <p className="mt-4 max-w-2xl text-lg text-t3">
          Every ladder on this site is a fold of this log. It is append-only and it is the source of
          truth: if a number here disagrees with a number on a leaderboard, the log is right and the
          leaderboard is a stale build.
        </p>
      </header>

      <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Decided", String(TOTAL_DECIDED)],
          ["By forfeit", String(TOTAL_FORFEITS)],
          ["No contest", String(TOTAL_NO_CONTESTS)],
          ["Last run", LATEST_RUN ? ago(LATEST_RUN) : "—"],
        ].map(([label, value]) => (
          <div key={label} className="card rounded-xl px-4 py-3.5">
            <div className="text-xs text-t4">{label}</div>
            <div className="mt-1 font-mono text-xl font-bold text-t1">{value}</div>
          </div>
        ))}
      </section>

      <section className="mt-10">
        <MatchBrowser matches={ALL_MATCHES} />
      </section>
    </main>
  );
}
