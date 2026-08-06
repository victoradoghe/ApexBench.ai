"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import type { FullMatch } from "@/data/arena";

type Tab = "answers" | "judges" | "task";

const TABS: [Tab, string][] = [
  ["answers", "Both answers"],
  ["judges", "Judge votes"],
  ["task", "The task"],
];

function Answer({
  side,
  name,
  provider,
  response,
  error,
  won,
}: {
  side: string;
  name: string;
  provider: string;
  response: string | null;
  error?: string | null;
  won: boolean;
}) {
  return (
    <article className="card flex min-w-0 flex-col rounded-xl">
      <header className="flex items-center justify-between gap-2 border-b border-edge px-4 py-3">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-t4">{side}</div>
          <div className="truncate text-sm font-bold text-t1">{name}</div>
          <div className="text-[11px] text-t4">{provider}</div>
        </div>
        {won && (
          <span className="shrink-0 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
            winner
          </span>
        )}
      </header>
      <div className="min-w-0 overflow-x-auto p-4">
        {response ? (
          <pre className="whitespace-pre-wrap break-words font-mono text-[12px] leading-relaxed text-t2">
            {response}
          </pre>
        ) : (
          <p className="text-xs text-t4">
            No answer returned — <span className="font-mono">{error}</span>. A model that cannot
            answer forfeits the match.
          </p>
        )}
      </div>
    </article>
  );
}

/** The evidence behind one match: what each model actually wrote, how each
    judge voted and why, and the task both were given. */
export default function MatchTabs({
  match,
  judges,
  taskHref,
}: {
  match: FullMatch;
  judges: ReactNode;
  taskHref: string | null;
}) {
  const [tab, setTab] = useState<Tab>("answers");

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Match detail">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`filter-btn ${tab === key ? "is-active" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "answers" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Answer
            side="Model A"
            name={match.a.name}
            provider={match.a.provider}
            response={match.a.response}
            error={match.a.error}
            won={match.winner === "a"}
          />
          <Answer
            side="Model B"
            name={match.b.name}
            provider={match.b.provider}
            response={match.b.response}
            error={match.b.error}
            won={match.winner === "b"}
          />
        </div>
      )}

      {tab === "judges" && judges}

      {tab === "task" && (
        <div className="card rounded-xl p-6">
          <h3 className="text-base font-bold text-t1">{match.task.title}</h3>
          <p className="mt-2 text-sm text-t3">{match.task.summary}</p>
          <dl className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-chip px-2.5 py-1 text-t3">
              cluster: <span className="text-t1">{match.task.cluster}</span>
            </span>
            <span className="rounded-full bg-chip px-2.5 py-1 text-t3">
              difficulty: <span className="text-t1">{match.task.difficulty}</span>
            </span>
            <span className="rounded-full bg-chip px-2.5 py-1 text-t3">
              version: <span className="text-t1">v{match.task.version}</span>
            </span>
          </dl>
          <p className="mt-5 text-sm text-t3">
            Both competitors received the public half of this task verbatim — prompt and every
            artifact, identical bytes. The judges additionally saw a hidden reference that
            competitors never do.
          </p>
          {taskHref && (
            <Link
              href={taskHref}
              className="btn-ghost mt-5 inline-block rounded-lg px-4 py-2 text-sm font-semibold"
            >
              Read the full task →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
