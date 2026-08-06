"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import {
  ago,
  CAT_LABEL,
  h2hTally,
  overallOf,
  playedPairs,
  providerColor,
  recordOf,
  ROSTER,
  type Competitor,
} from "@/data/arena";

function Picker({
  label,
  value,
  onChange,
  exclude,
}: {
  label: string;
  value: string;
  onChange: (slug: string) => void;
  exclude: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-t4">
        {label}
      </span>
      <select
        className="field w-full"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {ROSTER.map((c) => (
          <option key={c.slug} value={c.slug} disabled={c.slug === exclude}>
            {c.name} · {c.provider}
          </option>
        ))}
      </select>
    </label>
  );
}

function Corner({ model, wins, total }: { model: Competitor; wins: number; total: number }) {
  const rec = recordOf(model.slug);
  const ov = overallOf(model.slug);
  return (
    <div className="card rounded-2xl p-5">
      <div className="flex items-center gap-3">
        <Avatar
          provider={model.provider}
          size={44}
          fontSize={18}
          color={providerColor(model.provider)}
        />
        <div className="min-w-0">
          <div className="truncate text-base font-bold text-t1">{model.name}</div>
          <div className="text-xs text-t4">{model.provider}</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="font-mono text-2xl font-bold text-t1">{wins}</div>
          <div className="text-[11px] text-t4">{wins === 1 ? "win here" : "wins here"}</div>
        </div>
        <div>
          <div className="font-mono text-2xl font-bold text-t1">
            {total ? Math.round((wins / total) * 100) : 0}%
          </div>
          <div className="text-[11px] text-t4">of meetings</div>
        </div>
        <div>
          <div className="font-mono text-2xl font-bold text-t1">{ov?.score ?? "—"}</div>
          <div className="text-[11px] text-t4">overall Elo</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {rec.length === 0 ? (
          <span className="text-[11px] text-t4">Not yet rated in any category.</span>
        ) : (
          rec.map(({ cat, rank, row }) => (
            <span
              key={cat}
              className="rounded-full border border-edge2 bg-chip px-2 py-0.5 text-[11px] text-t3"
            >
              {CAT_LABEL[cat]} <span className="font-mono text-t1">#{rank}</span>
              <span className="ml-1 text-t4">{row.elo}</span>
            </span>
          ))
        )}
      </div>
    </div>
  );
}

/** Pick any two competitors and see what actually happened when they met:
    the lifetime record, the per-category split, and every judged match with
    a link to the full answers and all three votes. */
export default function HeadToHead({ initialA, initialB }: { initialA?: string; initialB?: string }) {
  // open on a matchup that has actually been played, so a first visit shows the
  // real thing rather than the "not yet met" state; fall back to the roster
  // order only while the journal is still empty
  const [defaultA, defaultB] = useMemo(() => {
    const played = playedPairs()[0];
    return played ? played.pair : [ROSTER[0]?.slug ?? "", ROSTER[1]?.slug ?? ""];
  }, []);

  const [aSlug, setA] = useState(initialA ?? defaultA);
  const [bSlug, setB] = useState(initialB ?? defaultB);

  const a = ROSTER.find((m) => m.slug === aSlug)!;
  const b = ROSTER.find((m) => m.slug === bSlug)!;
  const tally = useMemo(() => h2hTally(aSlug, bSlug), [aSlug, bSlug]);

  const swap = () => {
    setA(bSlug);
    setB(aSlug);
  };

  const aPct = tally.total ? (tally.a / tally.total) * 100 : 50;

  return (
    <div>
      {/* pickers */}
      <div className="card rounded-2xl p-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <Picker label="Challenger" value={aSlug} onChange={setA} exclude={bSlug} />
          <button
            type="button"
            onClick={swap}
            className="icon-btn mx-auto mb-0.5"
            aria-label="Swap the two models"
            title="Swap sides"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 16H3m0 0l4-4m-4 4l4 4M17 8h4m0 0l-4-4m4 4l-4 4" />
            </svg>
          </button>
          <Picker label="Opponent" value={bSlug} onChange={setB} exclude={aSlug} />
        </div>
      </div>

      {/* corners */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Corner model={a} wins={tally.a} total={tally.total} />
        <Corner model={b} wins={tally.b} total={tally.total} />
      </div>

      {/* the record */}
      <div className="card mt-4 rounded-2xl p-6">
        {tally.total === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm font-semibold text-t2">These two have not met yet</p>
            <p className="mx-auto mt-2 max-w-md text-xs text-t4">
              Every pair is scheduled against every task, so this matchup exists in the season plan
              — it simply has not been played and journaled yet. Nothing is estimated in the
              meantime.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-2 flex items-baseline justify-between text-sm">
              <span className="font-bold text-t1">{tally.a}</span>
              <span className="text-xs text-t4">
                {tally.total} decided meeting{tally.total === 1 ? "" : "s"}
              </span>
              <span className="font-bold text-t1">{tally.b}</span>
            </div>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-chip">
              <div
                className="h-full bg-gradient-to-r from-brand-600 to-brand-400"
                style={{ width: `${aPct}%` }}
              />
              <div className="h-full flex-1" style={{ background: "var(--s2)" }} />
            </div>

            {/* per-category split */}
            <div className="mt-6 space-y-2.5">
              {tally.byCat.map(({ cat, a: av, b: bv }) => {
                const t = av + bv;
                return (
                  <div key={cat} className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                    <span className="w-10 text-right font-mono text-xs text-t2">{av}</span>
                    <div>
                      <div className="mb-1 text-center text-[11px] text-t4">{CAT_LABEL[cat]}</div>
                      <div className="flex h-1.5 overflow-hidden rounded-full bg-chip">
                        <div
                          className="h-full bg-brand-500"
                          style={{ width: `${t ? (av / t) * 100 : 50}%` }}
                        />
                        <div className="h-full flex-1" style={{ background: "var(--s2)" }} />
                      </div>
                    </div>
                    <span className="w-10 font-mono text-xs text-t2">{bv}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* the meetings */}
      {tally.meetings.length > 0 && (
        <section className="mt-8">
          <h3 className="mb-3 text-lg font-bold text-t1">Every meeting, judged</h3>
          <ul className="space-y-2.5">
            {tally.meetings.map((m) => {
              const aWon = m.winnerSlug === aSlug;
              const winner = aWon ? a : b;
              return (
                <li key={m.matchId}>
                  <Link
                    href={`/matches/${m.matchId}/`}
                    className="card block rounded-xl p-4 transition hover:border-edge2"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-accent-soft px-2 py-0.5 font-semibold text-accent">
                        {CAT_LABEL[m.category]}
                      </span>
                      <span className="text-t4">{m.cluster}</span>
                      {m.unanimous && (
                        <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                          unanimous
                        </span>
                      )}
                      <span className="ml-auto text-t4">{ago(m.ranAt)}</span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-t2">{m.task}</p>
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <Avatar
                        provider={winner.provider}
                        size={20}
                        fontSize={10}
                        color={providerColor(winner.provider)}
                      />
                      <span className="font-semibold text-t1">{winner.name}</span>
                      <span className="text-t4">took it {m.panel}</span>
                      {m.eloDelta !== null && (
                        /* the journal records the swing from side A's seat, which
                           is negative when side A lost — but this line is about
                           the winner, who always gained it */
                        <span className="ml-auto font-mono text-t4">
                          Elo +{Math.abs(m.eloDelta)}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
