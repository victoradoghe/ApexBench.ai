import Link from "next/link";
import ModelChip from "./ModelChip";
import { ago, CAT_LABEL, type MatchSummary } from "@/data/arena";

function Outcome({ m }: { m: MatchSummary }) {
  if (m.outcome === "no-contest") {
    return (
      <span className="rounded-full border border-edge2 bg-chip px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-t4">
        no contest
      </span>
    );
  }
  if (m.outcome === "forfeit") {
    return (
      <span className="rounded-full border border-orange-400/30 bg-orange-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-300">
        forfeit
      </span>
    );
  }
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        m.unanimous
          ? "border border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
          : "border border-edge2 bg-chip text-t3"
      }`}
    >
      {m.panel}
      {m.unanimous ? " unanimous" : ""}
    </span>
  );
}

/** The journal, rendered. Every row links to the full match: both
    answers, all three votes, and the rationale behind each one. */
export default function MatchList({ matches }: { matches: MatchSummary[] }) {
  if (matches.length === 0) {
    return (
      <div className="card rounded-2xl px-6 py-12 text-center">
        <p className="text-sm font-semibold text-t2">No matches in the journal yet</p>
        <p className="mx-auto mt-2 max-w-md text-xs text-t4">
          Run <code className="font-mono text-t3">pnpm season</code> to play matches and fold them
          into the site.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2.5">
      {matches.map((m) => {
        const winnerSlug = m.winner === "a" ? m.a.slug : m.winner === "b" ? m.b.slug : null;
        return (
          <li key={m.matchId}>
            <Link
              href={`/matches/${m.matchId}/`}
              className="card block rounded-xl p-4 transition hover:border-edge2"
            >
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-accent-soft px-2 py-0.5 font-semibold text-accent">
                  {CAT_LABEL[m.category]}
                </span>
                <span className="text-t4">{m.cluster}</span>
                <Outcome m={m} />
                <span className="ml-auto text-t4">{ago(m.ranAt)}</span>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div className={winnerSlug === m.a.slug ? "" : "opacity-60"}>
                  <ModelChip
                    name={m.a.name}
                    provider={m.a.provider}
                    slug={m.a.slug}
                    size={28}
                    showProvider={false}
                    link={false}
                    muted={winnerSlug !== m.a.slug}
                  />
                </div>
                <span className="shrink-0 font-mono text-[11px] font-bold text-t4">vs</span>
                <div className={`text-right ${winnerSlug === m.b.slug ? "" : "opacity-60"}`}>
                  <div className="flex justify-end">
                    <ModelChip
                      name={m.b.name}
                      provider={m.b.provider}
                      slug={m.b.slug}
                      size={28}
                      showProvider={false}
                      link={false}
                      muted={winnerSlug !== m.b.slug}
                    />
                  </div>
                </div>
              </div>

              <p className="mt-3 truncate text-xs text-t3">{m.task}</p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
