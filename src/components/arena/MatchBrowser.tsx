"use client";

import { useMemo, useState } from "react";
import MatchList from "./MatchList";
import { CATEGORIES, CAT_LABEL, type Category, type MatchSummary } from "@/data/arena";

type Outcome = "all" | "judged" | "forfeit" | "no-contest";

const OUTCOMES: [Outcome, string][] = [
  ["all", "All outcomes"],
  ["judged", "Judged"],
  ["forfeit", "Forfeit"],
  ["no-contest", "No contest"],
];

const PAGE = 25;

/** Filterable view over the journal. Filters narrow what is shown; they
    never change a rating, because ratings come from the log, not the view. */
export default function MatchBrowser({ matches }: { matches: MatchSummary[] }) {
  const [cat, setCat] = useState<Category | "all">("all");
  const [outcome, setOutcome] = useState<Outcome>("all");
  const [shown, setShown] = useState(PAGE);

  const filtered = useMemo(
    () =>
      matches.filter(
        (m) => (cat === "all" || m.category === cat) && (outcome === "all" || m.outcome === outcome),
      ),
    [matches, cat, outcome],
  );

  const reset = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setShown(PAGE);
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => reset(setCat)("all")}
          className={`filter-btn ${cat === "all" ? "is-active" : ""}`}
        >
          All categories
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => reset(setCat)(c)}
            className={`filter-btn ${cat === c ? "is-active" : ""}`}
          >
            {CAT_LABEL[c]}
          </button>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {OUTCOMES.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => reset(setOutcome)(key)}
            className={`filter-btn ${outcome === key ? "is-active" : ""}`}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto text-xs text-t4">
          {filtered.length} match{filtered.length === 1 ? "" : "es"}
        </span>
      </div>

      <MatchList matches={filtered.slice(0, shown)} />

      {shown < filtered.length && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setShown((s) => s + PAGE)}
            className="btn-ghost rounded-lg px-5 py-2.5 text-sm font-semibold"
          >
            Show {Math.min(PAGE, filtered.length - shown)} more
          </button>
        </div>
      )}
    </div>
  );
}
