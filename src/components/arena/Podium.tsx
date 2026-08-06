import Link from "next/link";
import ModelChip from "./ModelChip";
import {
  CAT_LABEL,
  eloPct,
  ladder,
  matchesIn,
  scheduledIn,
  type Category,
  type CategoryMeta,
} from "@/data/arena";

const PLACE = [
  { medal: "1", ring: "ring-amber-400/45", text: "text-amber-300", glow: "champion-glow" },
  { medal: "2", ring: "ring-slate-300/35", text: "text-slate-300", glow: "card" },
  { medal: "3", ring: "ring-orange-500/30", text: "text-orange-300", glow: "card" },
];

/** Top three of one category. Renders an honest empty state while a
    category has no decided matches rather than an empty podium. */
export default function Podium({ meta }: { meta: CategoryMeta }) {
  const cat: Category = meta.key;
  const rows = ladder(cat).slice(0, 3);
  const played = matchesIn(cat);
  const scheduled = scheduledIn(cat);

  return (
    <section className="card flex flex-col rounded-2xl p-5">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
            <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d={meta.icon} />
            </svg>
          </span>
          <div>
            <h3 className="text-base font-bold text-t1">{CAT_LABEL[cat]}</h3>
            <p className="text-xs text-t4">
              {played > 0
                ? `${played} decided of ${scheduled} scheduled`
                : `${scheduled} matches scheduled`}
            </p>
          </div>
        </div>
        <Link
          href={`/arena/${cat}/`}
          className="shrink-0 text-xs font-semibold text-accent transition hover:underline"
        >
          Ladder →
        </Link>
      </header>

      <p className="mb-4 text-sm leading-relaxed text-t3">{meta.blurb}</p>

      {rows.length === 0 ? (
        <div className="mt-auto rounded-xl border border-dashed border-edge2 px-4 py-6 text-center">
          <p className="text-sm font-semibold text-t2">No matches decided yet</p>
          <p className="mt-1 text-xs text-t4">
            This podium fills in the moment the first match in this category lands in the journal.
          </p>
        </div>
      ) : (
        <ol className="mt-auto space-y-2.5">
          {rows.map((r, i) => (
            <li
              key={r.slug}
              className={`${PLACE[i].glow} flex items-center gap-3 rounded-xl px-3 py-2.5 ring-1 ${PLACE[i].ring}`}
            >
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-md bg-chip font-mono text-xs font-bold ${PLACE[i].text}`}
              >
                {PLACE[i].medal}
              </span>
              <div className="min-w-0 flex-1">
                <ModelChip name={r.name} provider={r.provider} slug={r.slug} size={26} showProvider={false} />
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-chip">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400"
                    style={{ width: `${eloPct(r.elo)}%` }}
                  />
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-mono text-sm font-bold text-t1">{r.elo}</div>
                <div className="text-[11px] text-t4">
                  {r.wins}W-{r.losses}L
                  {r.provisional && <span className="ml-1 text-amber-400/80">prov</span>}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
