"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Avatar from "./Avatar";
import {
  LIVE_UPDATED_AT, MODELS, PROVIDERS, SPEED_MEASURED_AT,
  benchTag, blendedPrice, fmtCtx, fmtPrice,
  type Model,
} from "@/data/models";

type SortKey = "score" | "speed" | "price" | "ctx";

const fmtDay = (iso: string | null) =>
  iso ? new Date(iso).toISOString().slice(0, 10) : "—";

function BenchBadge({ m }: { m: Model }) {
  const tag = benchTag(m);
  const cls =
    tag === "SWE-V"
      ? "border-emerald-500/40 text-emerald-500"
      : tag === "SWE-Pro"
        ? "border-amber-500/40 text-amber-500"
        : "border-edge text-t4";
  return (
    <span
      title={m.bench ? `${m.bench} — ${m.scoreSource}` : m.scoreSource}
      className={`rounded-full border px-1.5 py-px text-[9px] font-bold uppercase tracking-wide ${cls}`}
    >
      {tag}
    </span>
  );
}

function Champion() {
  const top = useMemo(
    () => [...MODELS].sort((a, b) => (b.overall ?? -1) - (a.overall ?? -1))[0],
    [],
  );
  return (
    <div className="champion-glow relative overflow-hidden rounded-2xl p-6 sm:p-8">
      <div className="flex flex-wrap items-center gap-4">
        <Avatar provider={top.provider} size={64} fontSize={24} />
        <div className="min-w-0">
          <span className="rounded-full bg-amber-400/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-500">
            ★ #1 published score
          </span>
          <div className="mt-1 text-2xl font-bold text-t1">
            <Link href={`/models/${top.slug}/`} className="hover:text-accent">
              {top.name}
            </Link>
          </div>
          <div className="text-sm text-t4">
            {top.provider} · {top.bench}
          </div>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          [top.overall !== null ? top.overall.toFixed(1) : "—", "Score"],
          [top.speed !== null ? `${top.speed} t/s` : "—", "Speed"],
          [fmtPrice(top), "$/M in·out"],
          [fmtCtx(top.ctx), "Context"],
        ].map(([v, l]) => (
          <div key={l} className="rounded-xl border border-edge bg-chip p-3 text-center">
            <div className="font-mono text-lg font-bold text-t1">{v}</div>
            <div className="mt-0.5 text-[10px] uppercase tracking-wide text-t4">{l}</div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-t4">
        This is a <span className="text-t3">published third-party result</span>, not an ApexBench
        rating. For ratings we produced ourselves, see the{" "}
        <Link href="/arena/" className="font-semibold text-accent hover:underline">
          arena
        </Link>
        .
      </p>
    </div>
  );
}

export default function Leaderboard() {
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [search, setSearch] = useState("");
  const [provider, setProvider] = useState("all");
  const [open, setOpen] = useState<string | null>(null);

  const ranks = useMemo(() => {
    const sorted = [...MODELS].sort((a, b) => (b.overall ?? -1) - (a.overall ?? -1));
    return new Map(sorted.map((m, i) => [m.slug, i + 1]));
  }, []);

  const rows = useMemo(() => {
    const out = MODELS.filter((m) => {
      const q = search.trim().toLowerCase();
      if (q && !m.name.toLowerCase().includes(q) && !m.provider.toLowerCase().includes(q)) return false;
      if (provider !== "all" && m.provider !== provider) return false;
      return true;
    });
    const dir = sortDir === "desc" ? -1 : 1;
    // missing values always sink to the bottom, whatever the direction
    const val = (m: Model): number | null =>
      sortKey === "score" ? m.overall
      : sortKey === "speed" ? m.speed
      : sortKey === "price" ? blendedPrice(m)
      : m.ctx;
    return [...out].sort((a, b) => {
      const va = val(a), vb = val(b);
      if (va === null && vb === null) return ranks.get(a.slug)! - ranks.get(b.slug)!;
      if (va === null) return 1;
      if (vb === null) return -1;
      return (va - vb) * dir || ranks.get(a.slug)! - ranks.get(b.slug)!;
    });
  }, [sortKey, sortDir, search, provider, ranks]);

  const max = useMemo(() => Math.max(...MODELS.map((m) => m.overall ?? 0)), []);

  const clickSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortKey(key);
      setSortDir(key === "price" ? "asc" : "desc"); // "best first" on first click
    }
  };

  const headBtn = (key: SortKey, label: string, extra = "") => (
    <span className={`${extra} text-right`}>
      <button
        type="button"
        className={`lb-sort ${sortKey === key ? "is-sorted" : ""}`}
        onClick={() => clickSort(key)}
      >
        {label}
        <span className="font-mono">{sortKey === key ? (sortDir === "desc" ? "↓" : "↑") : ""}</span>
      </button>
    </span>
  );

  return (
    <>
      <Champion />

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <div className="relative">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-t4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input
            className="field field-search w-56"
            type="search"
            placeholder="Search models…"
            autoComplete="off"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="field w-44"
          aria-label="Filter by provider"
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
        >
          <option value="all">All providers</option>
          {PROVIDERS.map((p) => <option key={p}>{p}</option>)}
        </select>
        <span className="text-xs text-t4">
          {rows.length} of {MODELS.length} models
        </span>
      </div>

      <div className="card mt-6 overflow-hidden rounded-2xl">
        <div className="lb-grid lb-head">
          <span>#</span>
          <span>Model</span>
          {headBtn("score", "Score")}
          {headBtn("speed", "Tok/s", "lb-col-md")}
          {headBtn("price", "$/M", "lb-col-md")}
          {headBtn("ctx", "Ctx", "lb-col-md")}
          <span />
        </div>

        {rows.length === 0 && (
          <div className="px-5 py-10 text-center text-sm text-t4">
            No models match — clear the search or provider filter.
          </div>
        )}

        {rows.map((m) => {
          const rank = ranks.get(m.slug)!;
          const unranked = m.overall === null;
          const pct = m.overall === null ? 0 : Math.round((m.overall / max) * 100);
          const isOpen = open === m.slug;
          const blended = blendedPrice(m);
          return (
            <div key={m.slug}>
              <div
                className={`lb-grid lb-row ${isOpen ? "open" : ""}`}
                role="button"
                tabIndex={0}
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : m.slug)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setOpen(isOpen ? null : m.slug);
                  }
                }}
              >
                <span className="flex items-center gap-1.5">
                  <span className={`rank-badge ${!unranked && rank <= 3 ? `rank-${rank}` : ""}`}>
                    {unranked ? "·" : rank}
                  </span>
                  {m.isNew && <span className="delta up">NEW</span>}
                </span>
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar provider={m.provider} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-semibold leading-tight text-t1">
                      <span className="sm:truncate">{m.name}</span>
                      <BenchBadge m={m} />
                    </div>
                    <div className="text-xs text-t4">{m.provider}</div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3">
                  <div className="hidden w-24 sm:block">
                    <div className="score-bar"><span style={{ width: `${pct}%` }} /></div>
                  </div>
                  <span className="w-12 text-right font-mono text-base font-bold text-t1">
                    {m.overall === null ? "—" : m.overall.toFixed(1)}
                  </span>
                </div>
                <span className="lb-col-md text-right font-mono text-sm text-t2">{m.speed ?? "—"}</span>
                <span className="lb-col-md text-right font-mono text-sm text-t2">
                  {blended === null ? "—" : `$${blended.toFixed(2)}`}
                </span>
                <span className="lb-col-md text-right font-mono text-sm text-t3">{fmtCtx(m.ctx)}</span>
                <span className="chev grid place-items-center">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="m6 9 6 6 6-6" /></svg>
                </span>
              </div>

              {isOpen && (
                <div className="lb-detail px-5 py-5 sm:px-8">
                  {unranked ? (
                    <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-t3">
                      <span className="font-bold text-amber-500">Unranked.</span> {m.scoreSource}.
                      {m.vendorClaim && <> {m.vendorClaim}.</>} It ranks here the moment a
                      standard-harness score is published.
                    </p>
                  ) : (
                    <p className="mb-4 text-xs text-t3">
                      <span className="font-semibold text-t2">{m.overall?.toFixed(1)}</span> on{" "}
                      {m.bench} — <span className="text-t4">{m.scoreSource}</span>.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 text-[11px] text-t4">
                    <span className="rounded-full border border-edge bg-chip px-2.5 py-1">TTFT <span className="font-mono text-t2">{m.ttft !== null ? `${m.ttft.toFixed(1)}s` : "—"}</span></span>
                    <span className="rounded-full border border-edge bg-chip px-2.5 py-1">Speed <span className="font-mono text-t2">{m.speed !== null ? `${m.speed} tok/s` : "—"}</span></span>
                    <span className="rounded-full border border-edge bg-chip px-2.5 py-1">Price <span className="font-mono text-t2">{fmtPrice(m)}</span> /M</span>
                    <span className="rounded-full border border-edge bg-chip px-2.5 py-1">Uptime <span className="font-mono text-t2">{m.uptime !== null ? `${m.uptime}%` : "—"}</span></span>
                    <span className="rounded-full border border-edge bg-chip px-2.5 py-1">Context <span className="font-mono text-t2">{fmtCtx(m.ctx)}</span></span>
                    <Link
                      href={`/models/${m.slug}/`}
                      className="rounded-full border border-edge bg-chip px-2.5 py-1 font-semibold text-accent transition hover:border-brand-500/50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Model page →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-center text-xs text-t4">
        Score = a published third-party result; the badge names the benchmark —{" "}
        <span className="text-emerald-500">SWE-V</span> = SWE-bench Verified,{" "}
        <span className="text-amber-500">SWE-Pro</span> = SWE-bench Pro (the two are not directly
        comparable; hover a badge for the source). Models without a published standard-harness score
        are listed unranked, never guessed. Pricing, context and uptime are live from the OpenRouter
        API ({fmtDay(LIVE_UPDATED_AT)}); tok/s and TTFT come from our own streamed probes
        ({fmtDay(SPEED_MEASURED_AT)}) — reasoning time included, “—” = not yet measured. None of
        these models compete in the ApexBench arena, so no rating on this table is ours.
      </p>
    </>
  );
}
