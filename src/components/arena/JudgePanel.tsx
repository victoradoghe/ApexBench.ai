import Avatar from "@/components/Avatar";
import { providerColor, type FullMatch, type JudgeVote } from "@/data/arena";

const CRITERIA: [keyof NonNullable<JudgeVote["criteria"]>, string][] = [
  ["correctness", "Correctness"],
  ["grounding", "Evidence grounding"],
  ["constraintHandling", "Constraint handling"],
  ["completeness", "Completeness"],
];

/** How the panel actually voted. Each judge saw the two answers under
    its own A/B ordering (shown), so position bias cannot line up across
    the panel — and each had to name the difference that decided it. */
export default function JudgePanel({ match }: { match: FullMatch }) {
  if (match.votes.length === 0) {
    return (
      <div className="card rounded-2xl px-6 py-10 text-center">
        <p className="text-sm font-semibold text-t2">No panel was seated</p>
        <p className="mx-auto mt-2 max-w-md text-xs text-t4">
          {match.outcome === "forfeit"
            ? "One competitor failed to answer, so the match was decided by forfeit before judging."
            : "Both competitors failed to answer — there was nothing to judge."}
        </p>
      </div>
    );
  }

  const sideName = (w: "a" | "b" | undefined) =>
    w === "a" ? match.a.name : w === "b" ? match.b.name : null;

  return (
    <div className="space-y-3">
      {match.votes.map((v, i) => {
        const votedFor = sideName(v.winner);
        const agreed = match.winner && v.winner === match.winner;
        return (
          <article key={`${v.judge.slug}-${i}`} className="card rounded-xl p-4">
            <header className="flex flex-wrap items-center gap-3">
              <Avatar
                provider={v.judge.provider}
                size={30}
                fontSize={13}
                color={providerColor(v.judge.provider)}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-t1">{v.judge.name}</div>
                <div className="text-xs text-t4">{v.judge.provider} · judge</div>
              </div>

              {v.abstain ? (
                <span className="rounded-full border border-edge2 bg-chip px-2.5 py-1 text-[11px] font-semibold text-t4">
                  abstained
                </span>
              ) : (
                <div className="text-right">
                  <div
                    className={`text-sm font-bold ${agreed ? "text-accent" : "text-t2"}`}
                  >
                    {votedFor}
                  </div>
                  <div className="text-[11px] text-t4">
                    {v.confidence}% confidence
                    {!agreed && <span className="ml-1 text-orange-300">· dissent</span>}
                  </div>
                </div>
              )}
            </header>

            {v.abstain ? (
              <p className="mt-3 text-xs text-t4">
                No usable verdict after a retry — <span className="font-mono">{v.reason}</span>. An
                abstention never counts toward the majority.
              </p>
            ) : (
              <>
                {v.saw && (
                  <p className="mt-3 text-[11px] text-t4">
                    Saw <span className="font-mono text-t3">Model A = {v.saw.A}</span>,{" "}
                    <span className="font-mono text-t3">Model B = {v.saw.B}</span> — names redacted,
                    order assigned per judge.
                  </p>
                )}

                {v.decisiveDifference && (
                  <blockquote className="mt-3 rounded-lg border-l-2 border-accent/50 bg-chip px-3 py-2 text-sm leading-relaxed text-t2">
                    {v.decisiveDifference}
                  </blockquote>
                )}

                {v.criteria && (
                  <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                    {CRITERIA.map(([key, label]) => (
                      <div key={key} className="rounded-lg bg-chip px-3 py-2">
                        <dt className="text-[10px] font-semibold uppercase tracking-wider text-t4">
                          {label}
                        </dt>
                        <dd className="mt-0.5 text-xs leading-relaxed text-t3">
                          {v.criteria![key]}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </>
            )}
          </article>
        );
      })}
    </div>
  );
}
