import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import MatchList from "@/components/arena/MatchList";
import { CAT_LABEL, matchesForTask, TASKS, taskByKey, taskKey } from "@/data/arena";

export function generateStaticParams() {
  return TASKS.map((t) => ({ key: taskKey(t.id) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string }>;
}): Promise<Metadata> {
  const { key } = await params;
  const t = taskByKey(key);
  if (!t) return {};
  return { title: `${t.title} — ${CAT_LABEL[t.category]} Task`, description: t.summary };
}

export default async function TaskPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const task = taskByKey(key);
  if (!task) notFound();

  const played = matchesForTask(task.id);

  return (
    <main className="mx-auto max-w-4xl flex-1 px-5 pt-32 pb-20">
      <nav className="mb-8 flex flex-wrap items-center gap-2 text-xs text-t4">
        <Link href="/" className="transition hover:text-accent">Home</Link>
        <span>/</span>
        <Link href="/tasks/" className="transition hover:text-accent">Tasks</Link>
        <span>/</span>
        <span className="text-t2">{CAT_LABEL[task.category]}</span>
      </nav>

      <header>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Link
            href={`/arena/${task.category}/`}
            className="rounded-full bg-accent-soft px-2.5 py-1 font-semibold text-accent transition hover:underline"
          >
            {CAT_LABEL[task.category]}
          </Link>
          <span className="rounded-full bg-chip px-2.5 py-1 text-t3">{task.cluster}</span>
          <span className="rounded-full bg-chip px-2.5 py-1 text-t3">{task.difficulty}</span>
          <span className="font-mono text-t4">
            {task.id} · v{task.version}
          </span>
        </div>
        <h1 className="display mt-4 text-3xl font-extrabold leading-tight text-t1 sm:text-4xl">
          {task.title}
        </h1>
        <p className="mt-3 text-lg text-t3">{task.summary}</p>
      </header>

      <section className="card mt-8 rounded-2xl p-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-t4">
          The prompt, as competitors receive it
        </h2>
        <pre className="mt-3 whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed text-t2">
          {task.prompt}
        </pre>
      </section>

      <section className="mt-8">
        <h2 className="display text-2xl font-bold text-t1">
          Artifacts
          <span className="ml-2 text-sm font-normal text-t4">
            {task.artifacts.length} inlined verbatim
          </span>
        </h2>
        <div className="mt-4 space-y-4">
          {task.artifacts.map((a) => (
            <article key={a.id} className="card overflow-hidden rounded-xl">
              <header className="flex flex-wrap items-center gap-2 border-b border-edge px-4 py-3">
                <code className="rounded bg-chip px-2 py-0.5 font-mono text-xs text-accent">
                  {a.id}
                </code>
                <span className="text-sm font-semibold text-t1">{a.label}</span>
                <span className="ml-auto rounded-full bg-chip px-2 py-0.5 text-[10px] uppercase tracking-wider text-t4">
                  {a.kind}
                </span>
              </header>
              <div className="overflow-x-auto p-4">
                <pre className="whitespace-pre font-mono text-[12px] leading-relaxed text-t2">
                  {a.body}
                </pre>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="card mt-10 rounded-2xl p-6">
        <h2 className="text-sm font-bold text-t1">What is withheld</h2>
        <p className="mt-2 text-sm leading-relaxed text-t3">
          The private half — expected resolution, per-deliverable expectations, and the errors that
          disqualify an answer — is given to judges and never to competitors. Both halves are
          hashed into every match that used this task, so the version you are reading can be checked
          against what the models were actually given.
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-chip px-3 py-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-t4">
              Public half hash
            </dt>
            <dd className="mt-0.5 break-all font-mono text-xs text-t2">{task.publicHash}</dd>
          </div>
          <div className="rounded-lg bg-chip px-3 py-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-t4">
              Private half hash
            </dt>
            <dd className="mt-0.5 break-all font-mono text-xs text-t2">{task.privateHash}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-10">
        <h2 className="display mb-4 text-2xl font-bold text-t1">
          Matches on this task
          <span className="ml-2 text-sm font-normal text-t4">{played.length} played</span>
        </h2>
        <MatchList matches={played} />
      </section>
    </main>
  );
}
