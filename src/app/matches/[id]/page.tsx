import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import JudgePanel from "@/components/arena/JudgePanel";
import ModelChip from "@/components/arena/ModelChip";
import MatchTabs from "@/components/arena/MatchTabs";
import {
  allFullMatchIds,
  CAT_LABEL,
  fmtDateTime,
  fullMatch,
  METHODOLOGY_VERSION,
  taskById,
  taskKey,
} from "@/data/arena";

export function generateStaticParams() {
  return allFullMatchIds().map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const m = fullMatch(id);
  if (!m) return {};
  return {
    title: `${m.a.name} vs ${m.b.name} — ${m.task.title}`,
    description: `A judged ${CAT_LABEL[m.category]} match: both answers in full, all three judges' votes, and the difference that decided it.`,
  };
}

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = fullMatch(id);
  if (!match) notFound();

  const winnerSide = match.winner;
  const winner = winnerSide === "a" ? match.a : winnerSide === "b" ? match.b : null;
  const task = taskById(match.task.id);
  const drifted = task ? task.publicHash !== match.task.publicHash : false;

  return (
    <main className="mx-auto max-w-5xl flex-1 px-5 pt-32 pb-20">
      <nav className="mb-8 flex flex-wrap items-center gap-2 text-xs text-t4">
        <Link href="/" className="transition hover:text-accent">Home</Link>
        <span>/</span>
        <Link href="/matches/" className="transition hover:text-accent">Matches</Link>
        <span>/</span>
        <span className="font-mono text-t2">{match.matchId.slice(0, 14)}…</span>
      </nav>

      <header>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Link
            href={`/arena/${match.category}/`}
            className="rounded-full bg-accent-soft px-2.5 py-1 font-semibold text-accent transition hover:underline"
          >
            {CAT_LABEL[match.category]}
          </Link>
          <span className="rounded-full bg-chip px-2.5 py-1 text-t3">{match.task.cluster}</span>
          <span className="rounded-full bg-chip px-2.5 py-1 text-t3">{match.task.difficulty}</span>
          <span className="text-t4">{fmtDateTime(match.ranAt)}</span>
        </div>

        <h1 className="display mt-4 text-3xl font-extrabold leading-tight text-t1 sm:text-4xl">
          {match.task.title}
        </h1>
        <p className="mt-3 max-w-3xl text-base text-t3">{match.task.summary}</p>
      </header>

      {/* scoreline */}
      <section className="card mt-8 rounded-2xl p-6">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className={winnerSide === "a" ? "" : "opacity-55"}>
            <ModelChip name={match.a.name} provider={match.a.provider} slug={match.a.slug} size={40} />
            {match.a.eloBefore !== undefined && (
              <div className="mt-2 font-mono text-xs text-t4">
                {Math.round(match.a.eloBefore)} →{" "}
                <span className="font-bold text-t2">{Math.round(match.a.eloAfter!)}</span>
              </div>
            )}
          </div>

          <div className="shrink-0 text-center">
            <div className="font-mono text-sm font-bold text-t4">VS</div>
            {match.panel && (
              <div className="mt-1 font-mono text-lg font-bold text-t1">{match.panel}</div>
            )}
          </div>

          <div className={`text-right ${winnerSide === "b" ? "" : "opacity-55"}`}>
            <div className="flex justify-end">
              <ModelChip name={match.b.name} provider={match.b.provider} slug={match.b.slug} size={40} />
            </div>
            {match.b.eloBefore !== undefined && (
              <div className="mt-2 font-mono text-xs text-t4">
                {Math.round(match.b.eloBefore)} →{" "}
                <span className="font-bold text-t2">{Math.round(match.b.eloAfter!)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 border-t border-edge pt-5 text-xs">
          {winner ? (
            <span className="flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 font-semibold text-amber-300">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 21h8m-4-4v4M6 4h12v5a6 6 0 01-12 0z" />
              </svg>
              {winner.name} wins
              {match.outcome === "forfeit" ? " by forfeit" : match.unanimous ? " unanimously" : ""}
            </span>
          ) : (
            <span className="rounded-full border border-edge2 bg-chip px-3 py-1 font-semibold text-t4">
              No contest — {match.reason}
            </span>
          )}
          <span className="rounded-full bg-chip px-3 py-1 font-mono text-t4">
            {METHODOLOGY_VERSION}
          </span>
        </div>
      </section>

      {drifted && (
        <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-xs text-amber-200">
          The task file on disk has changed since this match ran. What the models actually received
          is fixed by the hash journaled with the match, not by the current file.
        </div>
      )}

      {/* answers + judges */}
      <section className="mt-10">
        <MatchTabs
          match={match}
          taskHref={task ? `/tasks/${taskKey(task.id)}/` : null}
          judges={<JudgePanel match={match} />}
        />
      </section>

      {/* provenance */}
      <section className="card mt-10 rounded-2xl p-6">
        <h2 className="text-sm font-bold text-t1">Provenance</h2>
        <p className="mt-1.5 text-xs text-t3">
          Everything below is journaled with the match, so this page can be checked against the
          append-only log rather than trusted.
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            ["Match ID", match.matchId],
            ["Task", `${match.task.id} v${match.task.version}`],
            ["Public half hash", match.task.publicHash.slice(0, 24) + "…"],
            ["Private half hash", match.task.privateHash.slice(0, 24) + "…"],
            [
              `${match.a.name} tokens`,
              `${match.a.tokens} out · ${match.a.reasoningTokens} reasoning${match.a.ms ? ` · ${(match.a.ms / 1000).toFixed(1)}s` : ""}`,
            ],
            [
              `${match.b.name} tokens`,
              `${match.b.tokens} out · ${match.b.reasoningTokens} reasoning${match.b.ms ? ` · ${(match.b.ms / 1000).toFixed(1)}s` : ""}`,
            ],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-chip px-3 py-2">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-t4">{k}</dt>
              <dd className="mt-0.5 break-all font-mono text-xs text-t2">{v}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
