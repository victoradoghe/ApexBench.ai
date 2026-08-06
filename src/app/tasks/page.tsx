import type { Metadata } from "next";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import { CATEGORY_META, TASKS, tasksIn, taskKey } from "@/data/arena";

export const metadata: Metadata = {
  title: "Tasks — Every Problem, Published",
  description:
    "The full public half of every ApexBench task: the prompt and artifacts competitors receive, verbatim. Only the hidden reference judges score against is withheld.",
};

const DIFF_STYLE: Record<string, string> = {
  standard: "border-edge2 bg-chip text-t3",
  hard: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  expert: "border-rose-400/30 bg-rose-400/10 text-rose-300",
};

export default function TasksPage() {
  return (
    <main className="mx-auto max-w-6xl flex-1 px-5 pt-32 pb-20">
      <nav className="mb-8 flex items-center gap-2 text-xs text-t4">
        <Link href="/" className="transition hover:text-accent">Home</Link>
        <span>/</span>
        <span className="text-t2">Tasks</span>
      </nav>

      <header>
        <h1 className="display text-4xl font-extrabold text-t1 sm:text-5xl">The task packs</h1>
        <p className="mt-4 max-w-3xl text-lg text-t3">
          {TASKS.length} tasks, authored in this repository, each built so the obvious answer is the
          wrong one. Every task ships in two halves: the <strong className="text-t1">public half</strong>{" "}
          below, which competitors receive verbatim and you can read in full, and a private
          reference that only judges see.
        </p>
      </header>

      <section className="card mt-8 rounded-2xl p-6">
        <h2 className="text-sm font-bold text-t1">Why the reference stays hidden</h2>
        <p className="mt-2 text-sm leading-relaxed text-t3">
          The reference names the expected resolution, the evidence an answer must cite, and the
          mistakes that disqualify one. Publishing it while a pack is live would let a model be
          tuned against the answer key rather than the problem. Both halves are hashed into every
          journal line, so a task quietly edited after a match ran is detectable by anyone — you do
          not have to take our word for it.
        </p>
      </section>

      {CATEGORY_META.map((meta) => {
        const tasks = tasksIn(meta.key);
        if (tasks.length === 0) return null;
        return (
          <Reveal key={meta.key}>
            <section className="mt-12">
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent-soft text-accent">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d={meta.icon} />
                    </svg>
                  </span>
                  <h2 className="display text-2xl font-bold text-t1">{meta.label}</h2>
                  <span className="text-sm text-t4">{tasks.length} tasks</span>
                </div>
                <Link
                  href={`/arena/${meta.key}/`}
                  className="text-xs font-semibold text-accent transition hover:underline"
                >
                  Ladder →
                </Link>
              </div>

              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {tasks.map((t) => (
                  <Link
                    key={t.id}
                    href={`/tasks/${taskKey(t.id)}/`}
                    className="card flex flex-col rounded-xl p-5 transition hover:border-edge2"
                  >
                    <div className="mb-2.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span
                        className={`rounded-full border px-2 py-0.5 font-semibold ${
                          DIFF_STYLE[t.difficulty] ?? DIFF_STYLE.standard
                        }`}
                      >
                        {t.difficulty}
                      </span>
                      <span className="rounded-full bg-chip px-2 py-0.5 text-t4">{t.cluster}</span>
                    </div>
                    <h3 className="text-sm font-bold leading-snug text-t1">{t.title}</h3>
                    <p className="mt-2 flex-1 text-xs leading-relaxed text-t3">{t.summary}</p>
                    <div className="mt-3 flex items-center justify-between border-t border-edge pt-3 text-[11px] text-t4">
                      <span>
                        {t.artifacts.length} artifact{t.artifacts.length === 1 ? "" : "s"}
                      </span>
                      <span>
                        {t.played} match{t.played === 1 ? "" : "es"} played
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </Reveal>
        );
      })}
    </main>
  );
}
