import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import MatchList from "@/components/arena/MatchList";
import ModelChip from "@/components/arena/ModelChip";
import Reveal from "@/components/Reveal";
import {
  ALL_MATCHES,
  bySlugKey,
  CAT_LABEL,
  eloPct,
  h2hTally,
  modelKey,
  overallOf,
  providerColor,
  recordOf,
  ROSTER,
} from "@/data/arena";

export function generateStaticParams() {
  return ROSTER.map((c) => ({ key: modelKey(c.slug) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string }>;
}): Promise<Metadata> {
  const { key } = await params;
  const c = bySlugKey(key);
  if (!c) return {};
  return {
    title: `${c.name} — Arena Record`,
    description: `Every ApexBench ladder ${c.name} appears on, its head-to-head record against the rest of the roster, and every match it has played.`,
  };
}

export default async function CompetitorPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const model = bySlugKey(key);
  if (!model) notFound();

  const overallRow = overallOf(model.slug);
  const record = recordOf(model.slug);
  const matches = ALL_MATCHES.filter(
    (m) => m.a.slug === model.slug || m.b.slug === model.slug,
  );
  const rivals = ROSTER.filter((c) => c.slug !== model.slug).map((c) => ({
    rival: c,
    tally: h2hTally(model.slug, c.slug),
  }));

  return (
    <main className="mx-auto max-w-5xl flex-1 px-5 pt-32 pb-20">
      <nav className="mb-8 flex flex-wrap items-center gap-2 text-xs text-t4">
        <Link href="/" className="transition hover:text-accent">Home</Link>
        <span>/</span>
        <Link href="/arena/" className="transition hover:text-accent">Arena</Link>
        <span>/</span>
        <span className="text-t2">{model.name}</span>
      </nav>

      <header className="flex flex-wrap items-center gap-4">
        <Avatar
          provider={model.provider}
          size={64}
          fontSize={26}
          color={providerColor(model.provider)}
        />
        <div className="min-w-0 flex-1">
          <h1 className="display text-3xl font-extrabold text-t1 sm:text-4xl">{model.name}</h1>
          <p className="mt-1 text-sm text-t3">
            {model.provider} · <code className="font-mono text-xs text-t4">{model.slug}</code>
          </p>
        </div>
      </header>

      <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Overall Elo", overallRow ? String(overallRow.score) : "—"],
          [
            "Record",
            overallRow ? `${overallRow.wins}-${overallRow.losses}` : "—",
          ],
          ["Win rate", overallRow?.winPct !== null && overallRow ? `${overallRow.winPct}%` : "—"],
          ["Rated in", `${record.length}/5`],
        ].map(([label, value]) => (
          <div key={label} className="card rounded-xl px-4 py-3.5">
            <div className="text-xs text-t4">{label}</div>
            <div className="mt-1 font-mono text-xl font-bold text-t1">{value}</div>
          </div>
        ))}
      </section>

      <Reveal>
        <section className="mt-12">
          <h2 className="display text-2xl font-bold text-t1">Standing by category</h2>
          {record.length === 0 ? (
            <div className="card mt-4 rounded-2xl px-6 py-10 text-center">
              <p className="text-sm font-semibold text-t2">Not yet rated anywhere</p>
              <p className="mx-auto mt-2 max-w-md text-xs text-t4">
                This competitor is on the roster and scheduled against every task, but no match it
                played has been decided yet.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {record.map(({ cat, row, rank, of }) => (
                <div key={cat} className="card rounded-xl p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link
                      href={`/arena/${cat}/`}
                      className="text-sm font-bold text-t1 transition hover:text-accent"
                    >
                      {CAT_LABEL[cat]}
                    </Link>
                    <div className="flex items-center gap-3 text-xs text-t4">
                      <span>
                        rank <span className="font-mono text-t1">#{rank}</span> of {of}
                      </span>
                      <span className="font-mono">
                        {row.wins}W-{row.losses}L
                      </span>
                      {row.provisional && (
                        <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                          provisional
                        </span>
                      )}
                      <span className="font-mono text-base font-bold text-t1">{row.elo}</span>
                    </div>
                  </div>
                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-chip">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400"
                      style={{ width: `${eloPct(row.elo)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </Reveal>

      <Reveal>
        <section className="mt-12">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="display text-2xl font-bold text-t1">Against the field</h2>
            <Link
              href="/head-to-head/"
              className="text-xs font-semibold text-accent transition hover:underline"
            >
              Open head-to-head →
            </Link>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {rivals.map(({ rival, tally }) => (
              <div key={rival.slug} className="card rounded-xl p-4">
                <div className="flex items-center justify-between gap-2">
                  <ModelChip
                    name={rival.name}
                    provider={rival.provider}
                    slug={rival.slug}
                    size={28}
                    showProvider={false}
                  />
                  <span className="shrink-0 font-mono text-sm font-bold text-t1">
                    {tally.a}-{tally.b}
                  </span>
                </div>
                {tally.total === 0 ? (
                  <p className="mt-2 text-[11px] text-t4">Not yet met.</p>
                ) : (
                  <div className="mt-2.5 flex h-1.5 overflow-hidden rounded-full bg-chip">
                    <div
                      className="h-full bg-gradient-to-r from-brand-600 to-brand-400"
                      style={{ width: `${(tally.a / tally.total) * 100}%` }}
                    />
                    <div className="h-full flex-1" style={{ background: "var(--s2)" }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="mt-12">
          <h2 className="display mb-4 text-2xl font-bold text-t1">
            Matches
            <span className="ml-2 text-sm font-normal text-t4">{matches.length} played</span>
          </h2>
          <MatchList matches={matches.slice(0, 20)} />
        </section>
      </Reveal>
    </main>
  );
}
