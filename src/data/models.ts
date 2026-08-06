/* ============================================================
   ApexBench model registry
   ------------------------------------------------------------
   The registry is the FIELD: frontier models and what third parties
   have published about them. It is a different truth source from the
   ApexBench arena (src/data/arena.ts), which is the ladder we run
   ourselves. The site keeps them apart on purpose — a published
   SWE-bench score and a judged Elo answer different questions, and
   averaging them would produce a number that means nothing.

   REAL data, with provenance on every number:

   - "overall" = published benchmark results; per-model `bench` says
     which one (SWE-bench Verified for the earlier generation,
     SWE-bench Pro for the July-2026 wave — vendors stopped publishing
     Verified). Sources: llm-stats.com and benchlm.ai snapshots of
     2026-07-18; morphllm.com/claude-benchmarks. Models with no
     published comparable score are UNRANKED (overall = null) rather
     than given an invented one.
   - price / context / uptime = live from the OpenRouter public API
     (src/data/live.json — regenerate with `pnpm refresh`).
   - speed / TTFT = measured by us: one streamed completion per model
     via OpenRouter, timed client-side (same snapshot).

   No per-category score lives here. Per-category standing is earned
   in the arena, by the arena roster, and is served from arena.ts.
   ============================================================ */

import LIVE from './live.json';

export type Bench = 'SWE-bench Verified' | 'SWE-bench Pro';

export interface Model {
  name: string;
  slug: string;
  provider: string;
  /** OpenRouter model id; null when not served there */
  orId: string | null;
  /** published benchmark score — null = no comparable published result */
  overall: number | null;
  /** which benchmark `overall` comes from */
  bench: Bench | null;
  /** one-line provenance for the overall score */
  scoreSource: string;
  /** vendor-published claim shown for unranked models */
  vendorClaim?: string;
  /** measured output tokens/sec (streamed probe) — null = not yet measured */
  speed: number | null;
  /** measured seconds to first visible token, reasoning time included */
  ttft: number | null;
  /** live $ per million input tokens */
  priceIn: number | null;
  /** live $ per million output tokens */
  priceOut: number | null;
  /** context window, thousands of tokens */
  ctx: number;
  /** live uptime %, last 30 min, best serving endpoint */
  uptime: number | null;
  /** entered the board this cycle */
  isNew?: boolean;
}

const slugify = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

interface RawModel {
  name: string;
  provider: string;
  orId: string | null;
  overall: number | null;
  bench: Bench | null;
  scoreSource: string;
  vendorClaim?: string;
  ctx: number;
  isNew?: boolean;
}

const raw: RawModel[] = [
  { name: 'Claude Fable 5',    provider: 'Anthropic', orId: 'anthropic/claude-fable-5',      overall: 95.0, bench: 'SWE-bench Verified', scoreSource: 'llm-stats.com · morphllm.com, Jul 2026', ctx: 1000 },
  { name: 'Claude Mythos 5',   provider: 'Anthropic', orId: null,                            overall: 93.9, bench: 'SWE-bench Verified', scoreSource: 'morphllm.com/claude-benchmarks, Jul 2026', ctx: 1000 },
  { name: 'Claude Opus 4.8',   provider: 'Anthropic', orId: 'anthropic/claude-opus-4.8',     overall: 88.6, bench: 'SWE-bench Verified', scoreSource: 'morphllm.com/claude-benchmarks, Jul 2026', ctx: 1000 },
  { name: 'Claude Opus 4.6',   provider: 'Anthropic', orId: 'anthropic/claude-opus-4.6',     overall: 80.8, bench: 'SWE-bench Verified', scoreSource: 'morphllm.com/claude-benchmarks, Jul 2026', ctx: 1000 },
  { name: 'Gemini 3.1 Pro',    provider: 'Google',    orId: 'google/gemini-3.1-pro-preview', overall: 80.6, bench: 'SWE-bench Verified', scoreSource: 'llm-stats.com, Jul 18 2026',               ctx: 1049 },
  { name: 'DeepSeek V4 Pro',   provider: 'DeepSeek',  orId: 'deepseek/deepseek-v4-pro',      overall: 80.6, bench: 'SWE-bench Verified', scoreSource: 'llm-stats.com, Jul 18 2026',               ctx: 1049 },
  { name: 'MiniMax M2.5',      provider: 'MiniMax',   orId: 'minimax/minimax-m2.5',          overall: 80.2, bench: 'SWE-bench Verified', scoreSource: 'llm-stats.com, Jul 18 2026',               ctx: 205 },
  { name: 'GPT-5.2',           provider: 'OpenAI',    orId: 'openai/gpt-5.2',                overall: 80.0, bench: 'SWE-bench Verified', scoreSource: 'llm-stats.com, Jul 18 2026',               ctx: 400 },
  { name: 'GLM 5',             provider: 'Zhipu',     orId: 'z-ai/glm-5',                    overall: 77.8, bench: 'SWE-bench Verified', scoreSource: 'llm-stats.com, Jul 18 2026',               ctx: 203 },
  { name: 'Claude Sonnet 4.5', provider: 'Anthropic', orId: 'anthropic/claude-sonnet-4.5',   overall: 77.2, bench: 'SWE-bench Verified', scoreSource: 'morphllm.com/claude-benchmarks, Jul 2026', ctx: 1000 },
  { name: 'Kimi K2.5',         provider: 'Moonshot',  orId: 'moonshotai/kimi-k2.5',          overall: 76.8, bench: 'SWE-bench Verified', scoreSource: 'llm-stats.com, Jul 18 2026',               ctx: 262 },
  { name: 'Gemini 3 Pro',      provider: 'Google',    orId: null,                            overall: 76.2, bench: 'SWE-bench Verified', scoreSource: 'llm-stats.com, Jul 18 2026',               ctx: 1000 },
  { name: 'Claude Haiku 4.5',  provider: 'Anthropic', orId: 'anthropic/claude-haiku-4.5',    overall: 73.3, bench: 'SWE-bench Verified', scoreSource: 'llm-stats.com, Jul 18 2026',               ctx: 200 },
  { name: 'Qwen3 Coder 480B',  provider: 'Alibaba',   orId: 'qwen/qwen3-coder',              overall: 69.6, bench: 'SWE-bench Verified', scoreSource: 'Alibaba (vendor-reported, at release)',    ctx: 1049 },
  { name: 'Grok 4.5',          provider: 'xAI',       orId: 'x-ai/grok-4.5',                 overall: 64.7, bench: 'SWE-bench Pro',      scoreSource: 'benchlm.ai swePro board, Jul 18 2026',     ctx: 500, isNew: true },
  { name: 'GPT-5.6 Sol',       provider: 'OpenAI',    orId: 'openai/gpt-5.6-sol',            overall: 64.6, bench: 'SWE-bench Pro',      scoreSource: 'benchlm.ai swePro board, Jul 18 2026',     ctx: 1050, isNew: true },
  { name: 'GPT-5.5',           provider: 'OpenAI',    orId: 'openai/gpt-5.5',                overall: 58.6, bench: 'SWE-bench Pro',      scoreSource: 'benchlm.ai swePro board, Jul 18 2026',     ctx: 1050 },
  { name: 'GPT-5.4',           provider: 'OpenAI',    orId: 'openai/gpt-5.4',                overall: 57.7, bench: 'SWE-bench Pro',      scoreSource: 'benchlm.ai swePro board, Jul 18 2026',     ctx: 1050 },
  { name: 'Kimi K3',           provider: 'Moonshot',  orId: 'moonshotai/kimi-k3',            overall: null, bench: null,                 scoreSource: 'no SWE-bench score published yet (launched Jul 16 2026); independent: Artificial Analysis Intelligence Index 57, top-4', vendorClaim: 'Vendor claims FrontierSWE 81.2 · Terminal-Bench 2.1 88.3 · DeepSWE 67.5, on Moonshot’s own KimiCode harness', ctx: 1049, isNew: true },
  { name: 'Mistral Large 3',   provider: 'Mistral',   orId: 'mistralai/mistral-large-2512',  overall: null, bench: null,                 scoreSource: 'no published SWE-bench result',            ctx: 262 },
  /* July expansion — every overall is a published SWE-bench Pro result
     from the benchlm.ai board (Jul 18 2026 snapshot). */
  { name: 'Sakana Fugu-Ultra', provider: 'Sakana',    orId: 'sakana/fugu-ultra',             overall: 73.7, bench: 'SWE-bench Pro',      scoreSource: 'benchlm.ai swePro board, Jul 18 2026', ctx: 1000 },
  { name: 'Claude Opus 4.7',   provider: 'Anthropic', orId: 'anthropic/claude-opus-4.7',     overall: 64.3, bench: 'SWE-bench Pro',      scoreSource: 'benchlm.ai swePro board, Jul 18 2026', ctx: 1000 },
  { name: 'GPT-5.6 Terra',     provider: 'OpenAI',    orId: 'openai/gpt-5.6-terra',          overall: 63.4, bench: 'SWE-bench Pro',      scoreSource: 'benchlm.ai swePro board, Jul 18 2026', ctx: 1050, isNew: true },
  { name: 'Claude Sonnet 5',   provider: 'Anthropic', orId: 'anthropic/claude-sonnet-5',     overall: 63.2, bench: 'SWE-bench Pro',      scoreSource: 'benchlm.ai swePro board, Jul 18 2026', ctx: 1000 },
  { name: 'GPT-5.6 Luna',      provider: 'OpenAI',    orId: 'openai/gpt-5.6-luna',           overall: 62.7, bench: 'SWE-bench Pro',      scoreSource: 'benchlm.ai swePro board, Jul 18 2026', ctx: 1050, isNew: true },
  { name: 'GLM 5.2',           provider: 'Zhipu',     orId: 'z-ai/glm-5.2',                  overall: 62.1, bench: 'SWE-bench Pro',      scoreSource: 'benchlm.ai swePro board, Jul 18 2026', ctx: 1049 },
  { name: 'Qwen3.7 Max',       provider: 'Alibaba',   orId: 'qwen/qwen3.7-max',              overall: 60.6, bench: 'SWE-bench Pro',      scoreSource: 'benchlm.ai swePro board, Jul 18 2026', ctx: 1000 },
  { name: 'MiniMax M3',        provider: 'MiniMax',   orId: 'minimax/minimax-m3',            overall: 59.0, bench: 'SWE-bench Pro',      scoreSource: 'benchlm.ai swePro board, Jul 18 2026', ctx: 1049 },
  { name: 'Kimi K2.6',         provider: 'Moonshot',  orId: 'moonshotai/kimi-k2.6',          overall: 58.6, bench: 'SWE-bench Pro',      scoreSource: 'benchlm.ai swePro board, Jul 18 2026', ctx: 262 },
  { name: 'Qwen3.7 Plus',      provider: 'Alibaba',   orId: 'qwen/qwen3.7-plus',             overall: 57.6, bench: 'SWE-bench Pro',      scoreSource: 'benchlm.ai swePro board, Jul 18 2026', ctx: 1000 },
  { name: 'Claude Opus 4.5',   provider: 'Anthropic', orId: 'anthropic/claude-opus-4.5',     overall: 57.1, bench: 'SWE-bench Pro',      scoreSource: 'benchlm.ai swePro board, Jul 18 2026', ctx: 200 },
  { name: 'GPT-5.3 Codex',     provider: 'OpenAI',    orId: 'openai/gpt-5.3-codex',          overall: 56.8, bench: 'SWE-bench Pro',      scoreSource: 'benchlm.ai swePro board, Jul 18 2026', ctx: 400 },
  { name: 'Gemini 3.5 Flash',  provider: 'Google',    orId: 'google/gemini-3.5-flash',       overall: 55.1, bench: 'SWE-bench Pro',      scoreSource: 'benchlm.ai swePro board, Jul 18 2026', ctx: 1049 },
  { name: 'Grok 4.20',         provider: 'xAI',       orId: 'x-ai/grok-4.20',                overall: 51.8, bench: 'SWE-bench Pro',      scoreSource: 'benchlm.ai swePro board, Jul 18 2026', ctx: 2000 },
  { name: 'DeepSeek V4 Flash', provider: 'DeepSeek',  orId: 'deepseek/deepseek-v4-flash',    overall: 49.1, bench: 'SWE-bench Pro',      scoreSource: 'benchlm.ai swePro board, Jul 18 2026', ctx: 1049 },
];

/* ---------- merge the live OpenRouter + arena snapshots ---------- */

interface LiveEntry {
  priceIn?: number;
  priceOut?: number;
  ctx?: number;
  uptime?: number | null;
  tps?: number | null;
  ttft?: number | null;
}
const liveModels = LIVE.models as Record<string, LiveEntry | undefined>;

export const LIVE_UPDATED_AT: string = LIVE.updatedAt;
export const SPEED_MEASURED_AT: string | null = LIVE.speedMeasuredAt;

export const MODELS: Model[] = raw.map((m) => {
  const live = m.orId ? liveModels[m.orId] : undefined;
  return {
    ...m,
    slug: slugify(m.name),
    priceIn: live?.priceIn ?? null,
    priceOut: live?.priceOut ?? null,
    ctx: live?.ctx ?? m.ctx,
    uptime: live?.uptime ?? null,
    speed: live?.tps ?? null,
    ttft: live?.ttft ?? null,
  };
});

export const PROVIDERS = [...new Set(MODELS.map((m) => m.provider))];

export const PROVIDER_COLORS: Record<string, string> = {
  Anthropic: '#d97757', OpenAI: '#10a37f', Google: '#4285f4', MiniMax: '#ff5b3a',
  Alibaba: '#615ced', Moonshot: '#7c3aed', DeepSeek: '#4d6bfe', Zhipu: '#2563eb',
  Mistral: '#fa520f', xAI: '#8b98a5', Sakana: '#e11d48',
};

/* ---------- derived helpers ---------- */

export const bySlug = (slug: string) => MODELS.find((m) => m.slug === slug);

/** blended $ per million tokens at a 3:1 input:output mix (typical
    agentic-coding traffic); null when the model has no live pricing */
export const blendedPrice = (m: Model): number | null =>
  m.priceIn === null || m.priceOut === null
    ? null
    : Math.round(((3 * m.priceIn + m.priceOut) / 4) * 100) / 100;

/** by published score, ranked models first (unranked sink to the bottom) */
export const rankBy = () =>
  [...MODELS].sort((a, b) => (b.overall ?? -1) - (a.overall ?? -1));

/** 1-based rank; null when the model carries no published score */
export const rankOf = (model: Model): number | null => {
  if (model.overall === null) return null;
  return rankBy().findIndex((m) => m.slug === model.slug) + 1;
};

/** ranked models where nothing cheaper (blended $/M) scores higher */
export const paretoFrontier = () => {
  const priced = MODELS.filter((m) => m.overall !== null && blendedPrice(m) !== null);
  return new Set(
    priced
      .filter(
        (m) =>
          !priced.some(
            (o) =>
              o !== m && blendedPrice(o)! <= blendedPrice(m)! && o.overall! > m.overall!,
          ),
      )
      .map((m) => m.slug),
  );
};

/** how many registry models carry a published, comparable score */
export const rankedModelCount = (): number =>
  MODELS.filter((m) => m.overall !== null).length;

export const fmtCtx = (k: number) => (k >= 1000 ? `${Math.round(k / 100) / 10}M` : `${k}K`);

export const fmtPrice = (m: Model) =>
  m.priceIn === null ? '—' : `$${m.priceIn}/$${m.priceOut}`;

/** short label for the benchmark behind a model's overall score */
export const benchTag = (m: Model) =>
  m.bench === 'SWE-bench Verified' ? 'SWE-V' : m.bench === 'SWE-bench Pro' ? 'SWE-Pro' : 'unranked';
