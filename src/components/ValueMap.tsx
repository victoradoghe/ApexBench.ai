"use client";

import { useMemo, useRef, useState } from "react";
import { MODELS, blendedPrice, paretoFrontier, type Model } from "@/data/models";

const W = 760, H = 440, L = 52, RM = 20, T = 18, BM = 46;
/* log-scale price axis: live blended $/M spans ~$0.3 to ~$20 */
const X_MIN = 0.25, X_MAX = 30, Y_MIN = 50, Y_MAX = 100;
/* coordinates are rounded to 2dp: Math.log10 may differ by 1 ulp between
   the server and browser engines, which breaks React hydration */
const X = (c: number) =>
  Math.round(
    (L + ((W - L - RM) * (Math.log10(c) - Math.log10(X_MIN))) / (Math.log10(X_MAX) - Math.log10(X_MIN))) * 100,
  ) / 100;
const Y = (s: number) => Math.round((T + (H - T - BM) * (1 - (s - Y_MIN) / (Y_MAX - Y_MIN))) * 100) / 100;
const X_TICKS = [0.25, 0.5, 1, 2, 5, 10, 20];
const Y_TICKS = [50, 60, 70, 80, 90, 100];

const fmtTick = (t: number) => (t < 1 ? `$${t.toFixed(2)}` : `$${t}`);

export default function ValueMap() {
  const [showTable, setShowTable] = useState(false);
  const [hover, setHover] = useState<Model | null>(null);
  const [tipPos, setTipPos] = useState({ x: 0, y: 0 });
  const chartRef = useRef<HTMLDivElement>(null);

  // only models with both a published score and live pricing can be placed
  const placed = useMemo(
    () => MODELS.filter((m) => m.overall !== null && blendedPrice(m) !== null),
    [],
  );
  const excluded = useMemo(
    () => MODELS.filter((m) => m.overall === null || blendedPrice(m) === null),
    [],
  );
  const frontier = useMemo(() => paretoFrontier(), []);
  const frontierLine = useMemo(
    () => placed.filter((m) => frontier.has(m.slug)).sort((a, b) => blendedPrice(a)! - blendedPrice(b)!),
    [placed, frontier],
  );
  // draw dominated first so the frontier sits on top
  const ordered = useMemo(
    () => [...placed].sort((a, b) => (frontier.has(a.slug) ? 1 : 0) - (frontier.has(b.slug) ? 1 : 0)),
    [placed, frontier],
  );

  const showTip = (m: Model, target: Element) => {
    const box = chartRef.current?.getBoundingClientRect();
    if (!box) return;
    const r = target.getBoundingClientRect();
    setHover(m);
    setTipPos({
      x: Math.min(r.left - box.left + r.width / 2 + 12, box.width - 210),
      y: r.top - box.top - 8,
    });
  };

  return (
    <div className="card relative mx-auto mt-10 max-w-4xl overflow-hidden rounded-2xl p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-5 text-xs font-medium text-t2">
          <span className="flex items-center gap-2"><span className="swatch" style={{ background: "var(--s1)" }} />Efficient frontier</span>
          <span className="flex items-center gap-2"><span className="swatch" style={{ background: "var(--dot-muted)" }} />Dominated</span>
        </div>
        <button type="button" className="btn-ghost rounded-lg px-3 py-1.5 text-xs font-semibold" onClick={() => setShowTable(!showTable)}>
          {showTable ? "View as chart" : "View as table"}
        </button>
      </div>

      {!showTable && (
        <div ref={chartRef} className="relative mt-4">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Scatter plot of blended live price versus published benchmark score">
            {Y_TICKS.map((t) => (
              <g key={t}>
                <line x1={L} y1={Y(t)} x2={W - RM} y2={Y(t)} stroke="var(--grid-line)" strokeWidth="1" />
                <text x={L - 8} y={Y(t)} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="var(--t4)" fontFamily="var(--font-mono)">{t}</text>
              </g>
            ))}
            {X_TICKS.map((t) => (
              <g key={t}>
                <line x1={X(t)} y1={T} x2={X(t)} y2={H - BM} stroke="var(--grid-line)" strokeWidth="1" />
                <text x={X(t)} y={H - BM + 16} textAnchor="middle" fontSize="10" fill="var(--t4)" fontFamily="var(--font-mono)">{fmtTick(t)}</text>
              </g>
            ))}
            <text x={(L + W - RM) / 2} y={H - 6} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--t3)" fontFamily="var(--font-sans)">
              Blended live price, $/M tokens at 3:1 in:out (log scale) — lower is better
            </text>
            <text x={14} y={(T + H - BM) / 2} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--t3)" fontFamily="var(--font-sans)" transform={`rotate(-90 14 ${(T + H - BM) / 2})`}>
              Published benchmark score
            </text>
            <polyline
              points={frontierLine.map((m) => `${X(blendedPrice(m)!).toFixed(1)},${Y(m.overall!).toFixed(1)}`).join(" ")}
              fill="none" stroke="var(--s1)" strokeWidth="1.5" strokeOpacity="0.45" strokeLinejoin="round"
            />
            {ordered.map((m) => {
              const onF = frontier.has(m.slug);
              const x = X(blendedPrice(m)!), y = Y(m.overall!);
              return (
                <g key={m.slug}>
                  <circle
                    className="vm-hit"
                    cx={x} cy={y} r="14" tabIndex={0}
                    onMouseEnter={(e) => showTip(m, e.currentTarget)}
                    onFocus={(e) => showTip(m, e.currentTarget)}
                    onMouseLeave={() => setHover(null)}
                    onBlur={() => setHover(null)}
                  />
                  <circle
                    cx={x} cy={y} r={hover?.slug === m.slug ? 7 : 5}
                    fill={onF ? "var(--s1)" : "var(--dot-muted)"}
                    stroke="var(--panel)" strokeWidth="2" pointerEvents="none"
                  />
                  {onF && (
                    <text x={x} y={y - 12} textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--t2)" fontFamily="var(--font-sans)">
                      {m.name.replace("Claude ", "")}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          <div className={`chart-tooltip ${hover ? "show" : ""}`} style={{ left: tipPos.x, top: tipPos.y }}>
            {hover && (
              <>
                <div className="font-semibold" style={{ color: "var(--t1)" }}>{hover.name}</div>
                <div className="mt-0.5 font-mono">
                  ${blendedPrice(hover)!.toFixed(2)}/M blended · {hover.overall!.toFixed(1)} {hover.bench === "SWE-bench Pro" ? "SWE-Pro" : "SWE-V"}
                  {hover.speed !== null && <> · {hover.speed} tok/s</>}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showTable && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead>
              <tr className="border-b border-edge text-xs uppercase tracking-wider text-t4">
                <th className="py-2 pr-4 font-semibold">Model</th>
                <th className="py-2 pr-4 text-right font-semibold">Blended $/M</th>
                <th className="py-2 pr-4 text-right font-semibold">Score</th>
                <th className="py-2 text-right font-semibold">Frontier</th>
              </tr>
            </thead>
            <tbody>
              {[...placed].sort((a, b) => blendedPrice(a)! - blendedPrice(b)!).map((m) => (
                <tr key={m.slug} className="border-b border-edge">
                  <td className="py-2 pr-4 text-t1">{m.name} <span className="text-xs text-t4">· {m.provider}</span></td>
                  <td className="py-2 pr-4 text-right font-mono text-t2">${blendedPrice(m)!.toFixed(2)}</td>
                  <td className="py-2 pr-4 text-right font-mono text-t2">{m.overall!.toFixed(1)}</td>
                  <td className="py-2 text-right">
                    {frontier.has(m.slug) ? <span className="win-chip">✓ yes</span> : <span className="text-xs text-t4">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-t4">
        Prices are live OpenRouter per-token rates blended 3:1 input:output; scores are published
        benchmark results (Verified and Pro mixed — see the leaderboard badges).
        {excluded.length > 0 && (
          <> Not shown ({excluded.map((m) => m.name).join(", ")}): missing a published score or live pricing.</>
        )}
      </p>
    </div>
  );
}
