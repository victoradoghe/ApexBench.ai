import type { Metadata } from "next";
import Link from "next/link";
import Leaderboard from "@/components/Leaderboard";
import ValueMap from "@/components/ValueMap";
import Reveal from "@/components/Reveal";
import { MODELS, PROVIDERS, rankedModelCount } from "@/data/models";

export const metadata: Metadata = {
  title: "Models — Published Scores, Live Pricing and Measured Speed",
  description:
    "The field: frontier coding models with their published SWE-bench results, live OpenRouter pricing and context, and speed measured by our own streamed probes. Every number carries its source.",
};

export default function ModelsPage() {
  return (
    <main className="mx-auto max-w-7xl flex-1 px-5 pt-32 pb-20">
      <nav className="mb-8 flex items-center gap-2 text-xs text-t4">
        <Link href="/" className="transition hover:text-accent">Home</Link>
        <span>/</span>
        <span className="text-t2">Models</span>
      </nav>

      <header>
        <h1 className="display text-4xl font-extrabold text-t1 sm:text-5xl">The model registry</h1>
        <p className="mt-4 max-w-3xl text-lg text-t3">
          {MODELS.length} frontier models across {PROVIDERS.length} providers, with{" "}
          {rankedModelCount()} carrying a published, comparable benchmark result.
        </p>
      </header>

      <section className="card mt-8 rounded-2xl p-6">
        <h2 className="text-sm font-bold text-t1">What this table is — and is not</h2>
        <p className="mt-2 max-w-4xl text-sm leading-relaxed text-t3">
          These are numbers other people published, gathered in one place with their sources
          attached. They are <span className="text-t1">not</span> ApexBench ratings: we did not run
          these evaluations, and a SWE-bench score is a pass rate on a fixed test set, which is a
          different claim from “this model writes better code than that one”. Ratings we produced
          ourselves live in the{" "}
          <Link href="/arena/" className="font-semibold text-accent hover:underline">
            arena
          </Link>
          , where models compete head-to-head under judges. The two are never averaged together,
          because the resulting number would mean nothing.
        </p>
      </section>

      <Reveal>
        <section className="mt-12">
          <Leaderboard />
        </section>
      </Reveal>

      <Reveal>
        <section className="mt-20">
          <h2 className="display text-3xl font-bold text-t1">The cost of a point</h2>
          <p className="mt-3 max-w-2xl text-base text-t3">
            Published score against blended price at a 3:1 input:output mix. Everything on the
            frontier line is a model nothing cheaper beats.
          </p>
          <div className="mt-6">
            <ValueMap />
          </div>
        </section>
      </Reveal>
    </main>
  );
}
