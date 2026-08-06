import type { Metadata } from "next";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import {
  ELO_K,
  ELO_START,
  JUDGE_POOL,
  METHODOLOGY_VERSION,
  PROVISIONAL_UNDER,
  ROSTER,
  scheduledTotal,
  TASKS,
  TOTAL_DECIDED,
} from "@/data/arena";
import { MODELS, rankedModelCount } from "@/data/models";

export const metadata: Metadata = {
  title: "Methodology — How a Match Becomes a Ranking",
  description:
    "The full ApexBench contract: how tasks are authored, how matches are scheduled and run, how the blind cross-vendor panel decides, how Elo is folded from the append-only journal — and what none of it proves.",
};

function Section({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-edge pt-10">
      <div className="mb-1 font-mono text-xs font-bold text-accent">{n}</div>
      <h2 className="display text-2xl font-bold text-t1 sm:text-3xl">{title}</h2>
      <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-t3">{children}</div>
    </section>
  );
}

const LIMITS: [string, string][] = [
  [
    "Judges can share a bias",
    "A cross-vendor panel removes the obvious conflict of interest. It does not remove correlated error: models trained on overlapping data can be confidently wrong in the same direction. Three judges agreeing is evidence, not proof.",
  ],
  [
    "Nothing is executed",
    "No model-written code is compiled or run. A judged win says an expert-level reader found one answer better against a reference — not that a patch passes a test suite. That is a real limitation, and it is why published execution-verified scores are kept on this site as a separate view rather than deleted.",
  ],
  [
    "Prose is not reproducible",
    "The schedule, the pairings, the seating and the scoring all replay exactly from the seed and the journal. The model outputs do not: the same prompt to the same slug can return different text tomorrow. Reproducibility here is at the evidence and scoring layer.",
  ],
  [
    "The roster is what we can afford",
    "The arena runs on models we can play at scale. That set is not the same as the set of models most people ship with, and the ladder should be read as a statement about the models on it — not as a claim about models that have never entered.",
  ],
  [
    "A thin record is a weak signal",
    `Elo needs volume. Ratings under ${PROVISIONAL_UNDER} decided matches are marked provisional and held toward ${ELO_START}, but a marked number is still a number — treat early ladders as provisional in the ordinary sense of the word.`,
  ],
  [
    "The publisher is not authenticated",
    "Task hashes make silent edits detectable and the journal is append-only, which protects against drift and accident. Neither prevents a coordinated rewrite by whoever controls the repository. The defence against that is that the whole thing is open and forkable.",
  ],
];

export default function MethodologyPage() {
  return (
    <main className="mx-auto max-w-3xl flex-1 px-5 pt-32 pb-20">
      <nav className="mb-8 flex items-center gap-2 text-xs text-t4">
        <Link href="/" className="transition hover:text-accent">Home</Link>
        <span>/</span>
        <span className="text-t2">Methodology</span>
      </nav>

      <header>
        <h1 className="display text-4xl font-extrabold text-t1 sm:text-5xl">
          How a match becomes a ranking
        </h1>
        <p className="mt-5 text-lg text-t3">
          Every number ApexBench publishes is a fold of an append-only match journal. This page
          specifies the protocol that produces a journal line, so any ladder on the site can be
          audited or reproduced — and states plainly what the protocol does not establish.
        </p>
        <div className="mt-6 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-edge bg-chip px-3 py-1 font-mono text-t3">
            {METHODOLOGY_VERSION}
          </span>
          <span className="rounded-full border border-edge bg-chip px-3 py-1 text-t3">
            {TOTAL_DECIDED} decided matches
          </span>
          <span className="rounded-full border border-edge bg-chip px-3 py-1 text-t3">
            {TASKS.length} tasks · {ROSTER.length} competitors
          </span>
        </div>
      </header>

      <div className="mt-14 space-y-12">
        <Reveal>
          <Section n="01" title="Two truth sources, kept apart">
            <p>
              This site carries two kinds of number and never mixes them. The{" "}
              <Link href="/arena/" className="text-accent hover:underline">arena</Link> is ours:
              models we run head-to-head, rated by judged outcomes. The{" "}
              <Link href="/models/" className="text-accent hover:underline">registry</Link> is
              other people&apos;s: {rankedModelCount()} of {MODELS.length} frontier models with
              published SWE-bench results, reproduced with their sources alongside live pricing and
              speed we measure ourselves.
            </p>
            <p>
              Averaging a judged Elo with a published pass rate would produce a figure with no
              defensible meaning, so the site does not offer one. A model in the registry has no
              Elo. A model in the arena has no SWE-bench score. Each page says which kind of number
              it is showing.
            </p>
          </Section>
        </Reveal>

        <Reveal>
          <Section n="02" title="Tasks are authored, in two halves">
            <p>
              Every task lives in this repository and is built so the obvious answer is wrong: the
              exploitable line sits beside four safe ones, the plausible root cause is a symptom,
              the cleaner-looking refactor quietly drops a short-circuit.
            </p>
            <p>
              Each task has a <strong className="text-t1">public half</strong> — title, summary,
              prompt and every artifact — which both competitors receive as identical bytes and
              which is{" "}
              <Link href="/tasks/" className="text-accent hover:underline">
                published in full
              </Link>
              . The <strong className="text-t1">private half</strong> is the reference: the expected
              resolution, what each deliverable must reach, and the errors that disqualify an
              answer. Judges see it; competitors never do.
            </p>
            <p>
              Both halves are SHA-256 hashed into every journal line that used the task. Editing a
              task after a match ran does not rewrite history — it makes the mismatch visible to
              anyone who checks.
            </p>
          </Section>
        </Reveal>

        <Reveal>
          <Section n="03" title="Scheduling is seeded and exposure-balanced">
            <p>
              The schedule is every (task, unordered competitor pair) in every category —{" "}
              {scheduledTotal()} matches this season. Which model sits on side A, and the order
              matches run in, come from a seeded PRNG, and the scheduler greedily picks the pairing
              whose models have the least exposure so far. Balance is reproducible rather than
              incidental.
            </p>
            <p>
              Match IDs are stable hashes of their identity, so a run resumes exactly: journaled
              match IDs are skipped, and a season can be accumulated across many days without
              double-counting or gaps.
            </p>
          </Section>
        </Reveal>

        <Reveal>
          <Section n="04" title="Competitors answer blind">
            <p>
              Both competitors receive a category-specific system prompt plus the task&apos;s public
              half, inline and identical, and they run concurrently. Neither is told it is in a
              match, and the system prompt forbids naming its own model or vendor.
            </p>
            <p>
              Transport is fail-closed: bounded retries, a hard timeout, and a typed result. Because
              every roster model reasons before answering — and reasoning is billed from the same
              budget as the visible reply — a truncated answer is retried with a larger budget
              before it is allowed to count as a failure.
            </p>
          </Section>
        </Reveal>

        <Reveal>
          <Section n="05" title="The panel is structurally blind">
            <p>
              Three judges are seated per match from a pool of {JUDGE_POOL.length}, and a judge
              sharing a vendor with either competitor is excluded — no model is ever scored by its
              own family.
            </p>
            <ol className="ml-5 list-decimal space-y-2.5">
              <li>
                <strong className="text-t1">Identities are removed.</strong> Vendor and family names
                are scrubbed from both answers before they reach a judge. Blindness does not rest on
                a competitor obeying the instruction not to name itself.
              </li>
              <li>
                <strong className="text-t1">Order is permuted per judge.</strong> Which answer is
                labelled Model A is a hash of the match and the judge, so position bias cannot line
                up across the panel — and the permutation replays.
              </li>
              <li>
                <strong className="text-t1">Judges are isolated.</strong> A judge sees the task, the
                reference and the two answers. Never the identities, the ratings, or the other
                judges&apos; votes.
              </li>
              <li>
                <strong className="text-t1">Choice is forced.</strong> There is no tie option. A
                panel allowed to draw stops separating the field, because on a close match a judge
                will reach for the tie rather than name the decisive difference. Each judge picks a
                side, states the one substantive difference that decided it, and grades correctness,
                grounding, constraint handling and completeness.
              </li>
              <li>
                <strong className="text-t1">A bad verdict abstains.</strong> Malformed output — a
                refused choice included — gets one retry, then the judge abstains. Abstentions never
                count toward a majority.
              </li>
            </ol>
            <p>
              Answers are treated as untrusted input end to end: judge prompts explicitly refuse
              instructions embedded inside a candidate answer.
            </p>
          </Section>
        </Reveal>

        <Reveal>
          <Section n="06" title="Scoring">
            <p>
              Two valid votes for the same side decide a match. A panel that cannot reach two —
              too many abstentions — is a no-contest, and no rating moves.
            </p>
            <p>
              A win is one Elo update, starting at {ELO_START} with K = {ELO_K}. If one competitor
              fails to answer, the other wins by <strong className="text-t1">forfeit</strong>: it
              answered the same prompt under the same conditions, and voiding instead would let an
              unreliable model dodge its losses. If both fail, it is a no-contest.
            </p>
            <p>
              Displayed ratings are confidence-weighted — pulled toward {ELO_START} by
              matches/(matches + {PROVISIONAL_UNDER}) — so a model cannot top a ladder on two lucky
              wins. Raw Elo is shown alongside. Each category keeps its own ladder and they are
              never mixed; the overall board is a mean of a model&apos;s category ratings, each
              weighted by how thick its record there is.
            </p>
          </Section>
        </Reveal>

        <Reveal>
          <Section n="07" title="The journal is the source of truth">
            <p>
              Every completed match appends to <code className="font-mono text-t2">results/&lt;category&gt;/journal.jsonl</code>{" "}
              before any page is rebuilt. Leaderboards, podiums and head-to-head records are derived
              views that can be deleted and regenerated at any time.
            </p>
            <p>
              Each line records the methodology version, seed, schedule index, the task&apos;s ID,
              version and both hashes, both competitors&apos; full responses with token and latency
              accounting, every judge&apos;s vote, confidence and rationale, and eloBefore/eloAfter
              for both sides. That is why{" "}
              <Link href="/matches/" className="text-accent hover:underline">
                every match page
              </Link>{" "}
              can show you the evidence instead of asking for trust.
            </p>
          </Section>
        </Reveal>

        <Reveal>
          <Section n="08" title="What this does not prove">
            <p>
              A benchmark that only lists its strengths is marketing. These are the limits that
              matter when reading anything on this site:
            </p>
            <div className="mt-5 grid gap-3">
              {LIMITS.map(([title, body]) => (
                <div key={title} className="card rounded-xl p-5">
                  <h3 className="text-sm font-bold text-t1">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-t3">{body}</p>
                </div>
              ))}
            </div>
          </Section>
        </Reveal>

        <Reveal>
          <Section n="09" title="Checking it yourself">
            <p>
              Clone the repository and run <code className="font-mono text-t2">pnpm season</code>:
              it plays matches against the roster, appends them to the journal, and folds the
              snapshot the site reads. Point it at a different seed and you get a different, equally
              reproducible schedule.
            </p>
            <p>
              Because the journal is the source of truth and the fold is deterministic, the fastest
              way to catch us being wrong is to rebuild the snapshot from the journal and compare
              it with what is published here.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/matches/" className="btn-primary rounded-xl px-5 py-3 text-sm font-semibold">
                Read the journal
              </Link>
              <Link href="/tasks/" className="btn-ghost rounded-xl px-5 py-3 text-sm font-semibold">
                Read every task
              </Link>
              <Link href="/judges/" className="btn-ghost rounded-xl px-5 py-3 text-sm font-semibold">
                Meet the panel
              </Link>
            </div>
          </Section>
        </Reveal>
      </div>
    </main>
  );
}
