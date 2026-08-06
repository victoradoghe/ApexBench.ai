import ModelChip from "./ModelChip";
import { eloPct, ELO_START, PROVISIONAL_UNDER, type LadderRow } from "@/data/arena";

/** A full category ladder. Provisional rows are marked, never hidden —
    a thin record is information, not a reason to omit a model. */
export default function Ladder({
  rows,
  emptyNote,
}: {
  rows: LadderRow[];
  emptyNote?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="card rounded-2xl px-6 py-12 text-center">
        <p className="text-sm font-semibold text-t2">Nothing on this ladder yet</p>
        <p className="mx-auto mt-2 max-w-md text-xs text-t4">
          {emptyNote ??
            "Ratings appear here as matches are decided and appended to the journal — never before."}
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden rounded-2xl">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-edge text-left text-xs uppercase tracking-wider text-t4">
              <th className="px-4 py-3 font-semibold">#</th>
              <th className="px-4 py-3 font-semibold">Model</th>
              <th className="px-4 py-3 text-right font-semibold">Elo</th>
              <th className="px-4 py-3 font-semibold">Rating</th>
              <th className="px-4 py-3 text-right font-semibold">W-L</th>
              <th className="px-4 py-3 text-right font-semibold">Win %</th>
              <th className="px-4 py-3 text-right font-semibold">3-0</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.slug}
                className="border-b border-edge/60 transition last:border-0 hover:bg-chip"
              >
                <td className="px-4 py-3 font-mono text-xs text-t4">{i + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <ModelChip name={r.name} provider={r.provider} slug={r.slug} size={30} />
                    {r.provisional && (
                      <span
                        className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300"
                        title={`Fewer than ${PROVISIONAL_UNDER} decided matches — the displayed rating is still held toward ${ELO_START}`}
                      >
                        provisional
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-mono font-bold text-t1">{r.elo}</span>
                  {r.rawElo !== r.elo && (
                    <span className="ml-1.5 font-mono text-[11px] text-t4" title="Raw Elo before confidence weighting">
                      ({r.rawElo})
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="h-1.5 w-full min-w-[80px] overflow-hidden rounded-full bg-chip">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400"
                      style={{ width: `${eloPct(r.elo)}%` }}
                    />
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-t2">
                  {r.wins}-{r.losses}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-t2">
                  {r.winPct === null ? "—" : `${r.winPct}%`}
                </td>
                <td
                  className="px-4 py-3 text-right font-mono text-xs text-t3"
                  title="Wins taken on a unanimous 3-0 panel"
                >
                  {r.unanimous}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
