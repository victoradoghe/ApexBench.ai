import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Ladder from "@/components/arena/Ladder";
import MatchList from "@/components/arena/MatchList";
import Reveal from "@/components/Reveal";
import {
  CATEGORIES,
  CATEGORY_META,
  CAT_LABEL,
  catChampion,
  ladder,
  matchesIn,
  recentMatches,
  scheduledIn,
  tasksIn,
  taskKey,
  type Category,
} from "@/data/arena";

export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ category }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const meta = CATEGORY_META.find((m) => m.key === category);
  if (!meta) return {};
  return {
    title: `${meta.label} Arena — Ladder, Tasks and Matches`,
    description: `${meta.blurb} Ranked by blind, cross-vendor-judged head-to-head matches.`,
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const meta = CATEGORY_META.find((m) => m.key === category);
  if (!meta) notFound();

  const cat = meta.key as Category;
  const rows = ladder(cat);
  const leader = catChampion(cat);
  const tasks = tasksIn(cat);
  const decided = matchesIn(cat);

  return (
    <main className="mx-auto max-w-6xl flex-1 px-5 pt-32 pb-20">
      <nav className="mb-8 flex flex-wrap items-center gap-2 text-xs text-t4">
        <Link href="/" className="transition hover:text-accent">Home</Link>
        <span>/</span>
        <Link href="/arena/" className="transition hover:text-accent">Arena</Link>
        <span>/</span>
        <span className="text-t2">{meta.label}</span>
      </nav>

      <header className="flex flex-wrap items-start gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d={meta.icon} />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="display text-3xl font-extrabold text-t1 sm:text-4xl">
            {meta.label} arena
          </h1>
          <p className="mt-2 max-w-2xl text-base text-t3">{meta.blurb}</p>
        </div>
      </header>

      <div className="mt-6 card rounded-xl p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-t4">Decided on</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-t2">{meta.decidedOn}</p>
      </div>

      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card rounded-xl px-4 py-3.5">
          <div className="text-xs text-t4">Leader</div>
          <div className="mt-1 truncate text-sm font-bold text-t1">
            {leader?.name ?? "—"}
          </div>
        </div>
        <div className="card rounded-xl px-4 py-3.5">
          <div className="text-xs text-t4">Top Elo</div>
          <div className="mt-1 font-mono text-lg font-bold text-t1">{leader?.elo ?? "—"}</div>
        </div>
        <div className="card rounded-xl px-4 py-3.5">
          <div className="text-xs text-t4">Decided</div>
          <div className="mt-1 font-mono text-lg font-bold text-t1">
            {decided}
            <span className="text-xs font-normal text-t4"> / {scheduledIn(cat)}</span>
          </div>
        </div>
        <div className="card rounded-xl px-4 py-3.5">
          <div className="text-xs text-t4">Tasks</div>
          <div className="mt-1 font-mono text-lg font-bold text-t1">{tasks.length}</div>
        </div>
      </section>

      <Reveal>
        <section className="mt-12">
          <h2 className="display mb-4 text-2xl font-bold text-t1">Ladder</h2>
          <Ladder
            rows={rows}
            emptyNote={`No ${meta.label.toLowerCase()} match has been decided yet. This ladder fills from the journal, never from an estimate.`}
          />
        </section>
      </Reveal>

      <Reveal>
        <section className="mt-12">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="display text-2xl font-bold text-t1">Tasks in this pack</h2>
            <Link href="/tasks/" className="text-xs font-semibold text-accent transition hover:underline">
              All task packs →
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {tasks.map((t) => (
              <Link
                key={t.id}
                href={`/tasks/${taskKey(t.id)}/`}
                className="card rounded-xl p-4 transition hover:border-edge2"
              >
                <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[10px]">
                  <span className="rounded-full bg-chip px-2 py-0.5 font-semibold text-t3">
                    {t.difficulty}
                  </span>
                  <span className="rounded-full bg-chip px-2 py-0.5 text-t4">{t.cluster}</span>
                  <span className="ml-auto text-t4">
                    {t.played} played
                  </span>
                </div>
                <h3 className="text-sm font-bold leading-snug text-t1">{t.title}</h3>
                <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-t3">{t.summary}</p>
              </Link>
            ))}
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="mt-12">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="display text-2xl font-bold text-t1">
              {CAT_LABEL[cat]} matches
            </h2>
            <Link href="/matches/" className="text-xs font-semibold text-accent transition hover:underline">
              Full journal →
            </Link>
          </div>
          <MatchList matches={recentMatches(12, cat)} />
        </section>
      </Reveal>
    </main>
  );
}
