import type { Metadata } from "next";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import Reveal from "@/components/Reveal";
import {
  JUDGE_POOL,
  judgeStats,
  providerColor,
  ROSTER,
  TOTAL_DECIDED,
  unanimityRate,
} from "@/data/arena";

export const metadata: Metadata = {
  title: "Judges — The Blind Cross-Vendor Panel",
  description:
    "Who scores an ApexBench match and under what rules: three judges per match, none sharing a vendor with either competitor, names redacted, A/B order shuffled per judge, forced choice with a stated reason.",
};

const RULES: [string, string][] = [
  [
    "No judge scores its own family",
    "A judge sharing a vendor with either competitor is excluded from that match. With a pool spanning every vendor on the roster, every pairing still has at least three eligible judges.",
  ],
  [
    "Identities are removed, not just withheld",
    "Vendor and family names are scrubbed out of both answers before they reach a judge prompt. Blindness does not depend on a competitor obeying the instruction not to name itself.",
  ],
  [
    "Order is assigned per judge",
    "Which answer is shown as Model A is a hash of the match and the judge, so half the panel sees each ordering. Position bias cannot line up across a panel.",
  ],
  [
    "Judges are isolated",
    "A judge sees the task, the hidden reference and the two answers — never the identities, the ratings, the stakes, or how the other judges voted.",
  ],
  [
    "Forced choice, with a reason",
    "There is no tie option. Each judge names the single substantive difference that decided it and grades correctness, grounding, constraint handling and completeness. A malformed verdict gets one retry, then the judge abstains.",
  ],
  [
    "The reference is context, not an oracle",
    "No deterministic score picks the winner and no model-written code is executed. The reference tells a judge what a correct answer must reach; the judgment is still a judgment.",
  ],
];

export default function JudgesPage() {
  const stats = judgeStats();
  const unanimity = unanimityRate();
  const anyVotes = stats.some((s) => s.votes > 0);

  return (
    <main className="mx-auto max-w-5xl flex-1 px-5 pt-32 pb-20">
      <nav className="mb-8 flex items-center gap-2 text-xs text-t4">
        <Link href="/" className="transition hover:text-accent">Home</Link>
        <span>/</span>
        <span className="text-t2">Judges</span>
      </nav>

      <header>
        <h1 className="display text-4xl font-extrabold text-t1 sm:text-5xl">The panel</h1>
        <p className="mt-4 max-w-3xl text-lg text-t3">
          Every rating on this site traces back to a model deciding another model was better at a
          task. That is only worth something if the panel is hard to game — so the seating rules do
          the work, not good intentions.
        </p>
      </header>

      <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Pool", String(JUDGE_POOL.length)],
          ["Seated per match", "3"],
          ["Matches judged", String(TOTAL_DECIDED)],
          ["Unanimous", unanimity === null ? "—" : `${unanimity}%`],
        ].map(([label, value]) => (
          <div key={label} className="card rounded-xl px-4 py-3.5">
            <div className="text-xs text-t4">{label}</div>
            <div className="mt-1 font-mono text-xl font-bold text-t1">{value}</div>
          </div>
        ))}
      </section>

      <Reveal>
        <section className="mt-12">
          <h2 className="display text-2xl font-bold text-t1">The rules</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {RULES.map(([title, body]) => (
              <div key={title} className="card rounded-xl p-5">
                <h3 className="text-sm font-bold text-t1">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-t3">{body}</p>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="mt-12">
          <h2 className="display text-2xl font-bold text-t1">The pool</h2>
          <p className="mt-1.5 max-w-2xl text-sm text-t3">
            Judges are drawn from the same open roster as competitors — a model can judge a match it
            is not competing in. Where a judge has cast votes, its record is shown: how often it
            landed with the panel majority, and how confident it says it is.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {stats.map((s) => {
              const agree =
                s.votes > 0 ? Math.round((s.withMajority / s.votes) * 100) : null;
              return (
                <article key={s.judge.slug} className="card rounded-xl p-5">
                  <header className="flex items-center gap-3">
                    <Avatar
                      provider={s.judge.provider}
                      size={38}
                      fontSize={16}
                      color={providerColor(s.judge.provider)}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-t1">{s.judge.name}</div>
                      <div className="text-xs text-t4">{s.judge.provider}</div>
                    </div>
                    {ROSTER.some((c) => c.slug === s.judge.slug) && (
                      <span className="shrink-0 rounded-full bg-chip px-2 py-0.5 text-[10px] text-t4">
                        also competes
                      </span>
                    )}
                  </header>

                  {s.votes === 0 && s.seated === 0 ? (
                    <p className="mt-3 text-xs text-t4">Not yet seated on a panel.</p>
                  ) : (
                    <dl className="mt-4 grid grid-cols-4 gap-2 text-center">
                      <div>
                        <dt className="text-[10px] text-t4">Seated</dt>
                        <dd className="font-mono text-base font-bold text-t1">{s.seated}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] text-t4">Votes</dt>
                        <dd className="font-mono text-base font-bold text-t1">{s.votes}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] text-t4">With panel</dt>
                        <dd className="font-mono text-base font-bold text-t1">
                          {agree === null ? "—" : `${agree}%`}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] text-t4">Abstained</dt>
                        <dd className="font-mono text-base font-bold text-t1">{s.abstentions}</dd>
                      </div>
                    </dl>
                  )}

                  {s.meanConfidence !== null && (
                    <p className="mt-3 text-[11px] text-t4">
                      Mean stated confidence {s.meanConfidence}%.
                    </p>
                  )}
                </article>
              );
            })}
          </div>

          {!anyVotes && (
            <p className="mt-4 text-xs text-t4">
              No votes have been cast yet — these records fill in as matches are judged.
            </p>
          )}
        </section>
      </Reveal>

      <Reveal>
        <section className="card mt-12 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-t1">What this does not prove</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-t3">
            A cross-vendor panel removes the obvious conflicts of interest. It does not remove
            shared bias: models trained on overlapping data can be wrong in the same direction, and
            three of them agreeing is not the same as three of them being right. That is why every
            vote, its confidence and its stated reason are published per match — so a verdict you
            disagree with can be inspected rather than merely trusted.
          </p>
          <Link
            href="/matches/"
            className="btn-ghost mt-5 inline-block rounded-lg px-4 py-2 text-sm font-semibold"
          >
            Read the votes yourself →
          </Link>
        </section>
      </Reveal>
    </main>
  );
}
