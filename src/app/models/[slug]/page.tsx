import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import Reveal from "@/components/Reveal";
import {
  LIVE_UPDATED_AT,
  MODELS,
  SPEED_MEASURED_AT,
  blendedPrice,
  bySlug,
  fmtCtx,
  paretoFrontier,
  rankBy,
  rankOf,
} from "@/data/models";
import { ago } from "@/data/arena";

export function generateStaticParams() {
  return MODELS.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const m = bySlug(slug);
  if (!m) return {};
  return {
    title: `${m.name} — Score, Pricing and Speed`,
    description: `${m.name} by ${m.provider}: published benchmark result with its source, live pricing and context from OpenRouter, and measured throughput.`,
  };
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card rounded-xl px-4 py-3.5">
      <div className="text-xs text-t4">{label}</div>
      <div className="mt-1 font-mono text-xl font-bold text-t1">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-t4">{sub}</div>}
    </div>
  );
}

export default async function ModelPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const model = bySlug(slug);
  if (!model) notFound();

  const rank = rankOf(model);
  const ranked = rankBy();
  const onFrontier = paretoFrontier().has(model.slug);
  const blended = blendedPrice(model);
  const peers = ranked
    .filter((m) => m.overall !== null && m.slug !== model.slug)
    .slice(0, 6);

  return (
    <main className="mx-auto max-w-5xl flex-1 px-5 pt-32 pb-20">
      <nav className="mb-8 flex flex-wrap items-center gap-2 text-xs text-t4">
        <Link href="/" className="transition hover:text-accent">Home</Link>
        <span>/</span>
        <Link href="/models/" className="transition hover:text-accent">Models</Link>
        <span>/</span>
        <span className="text-t2">{model.name}</span>
      </nav>

      <header className="flex flex-wrap items-center gap-4">
        <Avatar provider={model.provider} size={64} fontSize={26} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="display text-3xl font-extrabold text-t1 sm:text-4xl">{model.name}</h1>
            {model.isNew && (
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400">
                new
              </span>
            )}
            {onFrontier && (
              <span className="rounded-full border border-brand-500/40 bg-accent-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
                cost frontier
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-t3">
            {model.provider}
            {model.orId && (
              <>
                {" · "}
                <code className="font-mono text-xs text-t4">{model.orId}</code>
              </>
            )}
          </p>
        </div>
      </header>

      <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Published score"
          value={model.overall !== null ? model.overall.toFixed(1) : "—"}
          sub={model.bench ?? "no comparable result"}
        />
        <Stat
          label="Rank"
          value={rank !== null ? `#${rank}` : "unranked"}
          sub={rank !== null ? `of ${MODELS.length} tracked` : "no published score"}
        />
        <Stat
          label="Blended price"
          value={blended !== null ? `$${blended.toFixed(2)}` : "—"}
          sub="per M, 3:1 in:out"
        />
        <Stat label="Context" value={fmtCtx(model.ctx)} sub="tokens" />
      </section>

      <Reveal>
        <section className="card mt-8 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-t1">Where the score comes from</h2>
          {model.overall === null ? (
            <>
              <p className="mt-2 text-sm leading-relaxed text-t3">
                {model.name} carries no published, comparable benchmark result, so ApexBench lists
                it <span className="text-t1">unranked</span> rather than estimating a number.{" "}
                {model.scoreSource}.
              </p>
              {model.vendorClaim && (
                <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-t3">
                  <span className="font-bold text-amber-500">Vendor claim.</span>{" "}
                  {model.vendorClaim}. Self-reported on the vendor&apos;s own harness, so it is not
                  comparable with the scores on this site.
                </p>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm leading-relaxed text-t3">
              <span className="font-mono font-bold text-t1">{model.overall.toFixed(1)}</span> on{" "}
              <span className="text-t2">{model.bench}</span>, per {model.scoreSource}. ApexBench did
              not run this evaluation — it is reproduced here with its source so you can check it.
              SWE-bench Verified and SWE-bench Pro are different test sets and their numbers are not
              directly comparable with each other.
            </p>
          )}
        </section>
      </Reveal>

      <Reveal>
        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="card rounded-2xl p-6">
            <h2 className="text-lg font-bold text-t1">Serving</h2>
            <dl className="mt-4 divide-y divide-edge/60">
              {[
                ["Input price", model.priceIn !== null ? `$${model.priceIn}/M` : "—"],
                ["Output price", model.priceOut !== null ? `$${model.priceOut}/M` : "—"],
                ["Blended", blended !== null ? `$${blended.toFixed(2)}/M` : "—"],
                ["Context", fmtCtx(model.ctx)],
                ["Uptime", model.uptime !== null ? `${model.uptime}%` : "—"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className="text-sm text-t3">{k}</dt>
                  <dd className="font-mono text-sm font-semibold text-t1">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[11px] text-t4">
              Live from the OpenRouter API
              {LIVE_UPDATED_AT ? ` · ${ago(LIVE_UPDATED_AT)}` : ""}.
            </p>
          </div>

          <div className="card rounded-2xl p-6">
            <h2 className="text-lg font-bold text-t1">Measured speed</h2>
            <dl className="mt-4 divide-y divide-edge/60">
              {[
                ["Throughput", model.speed !== null ? `${model.speed} tok/s` : "not yet measured"],
                [
                  "Time to first token",
                  model.ttft !== null ? `${model.ttft.toFixed(1)}s` : "not yet measured",
                ],
                ["Price for output", model.priceOut !== null ? `$${model.priceOut}/M` : "—"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className="text-sm text-t3">{k}</dt>
                  <dd className="font-mono text-sm font-semibold text-t1">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[11px] text-t4">
              One streamed completion per model, timed client-side, reasoning time included
              {SPEED_MEASURED_AT ? ` · ${ago(SPEED_MEASURED_AT)}` : ""}.
            </p>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="card mt-8 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-t1">Is it in the arena?</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-t3">
            No. The ApexBench arena runs an open roster of models we can play at scale, and{" "}
            {model.name} is not on it — so this page shows no Elo, no head-to-head record and no
            per-category standing for it. Those are things that must be earned in matches, and
            inventing them from a published pass rate is exactly the kind of number this site exists
            to avoid.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/arena/" className="btn-ghost rounded-lg px-4 py-2 text-sm font-semibold">
              See the arena roster →
            </Link>
            <Link href="/methodology/" className="btn-ghost rounded-lg px-4 py-2 text-sm font-semibold">
              Why they are kept apart →
            </Link>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="mt-10">
          <h2 className="display mb-4 text-2xl font-bold text-t1">Other models</h2>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {peers.map((m) => (
              <Link
                key={m.slug}
                href={`/models/${m.slug}/`}
                className="card flex items-center gap-3 rounded-xl p-4 transition hover:border-edge2"
              >
                <Avatar provider={m.provider} size={32} fontSize={14} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-t1">{m.name}</div>
                  <div className="text-xs text-t4">{m.provider}</div>
                </div>
                <span className="shrink-0 font-mono text-sm font-bold text-t1">
                  {m.overall!.toFixed(1)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </Reveal>
    </main>
  );
}
