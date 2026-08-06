/* ============================================================
   ApexBench live-data refresh
   ------------------------------------------------------------
   Pulls real, current numbers for every model on the roster and
   writes src/data/live.json, which the site merges at build time.

     node scripts/refresh-live.mjs            # pricing/ctx/uptime only
     OPENROUTER_API_KEY=... node scripts/...  # + measured speed probes

   Sources:
   - Pricing, context window:  GET https://openrouter.ai/api/v1/models   (public)
   - Uptime (last 30 min):     GET .../api/v1/models/{id}/endpoints      (public)
   - Speed (tok/s) and TTFT:   one short streamed completion per model,
     timed client-side. Requires OPENROUTER_API_KEY (reads .env too).
   ============================================================ */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'src', 'data', 'live.json');

/** OpenRouter ids for every roster model that is served there. */
const ROSTER = [
  'anthropic/claude-fable-5',
  'anthropic/claude-opus-4.8',
  'anthropic/claude-opus-4.7',
  'anthropic/claude-opus-4.6',
  'anthropic/claude-opus-4.5',
  'anthropic/claude-sonnet-5',
  'anthropic/claude-sonnet-4.5',
  'anthropic/claude-haiku-4.5',
  'anthropic/claude-3.7-sonnet',
  'anthropic/claude-3.5-sonnet',
  'anthropic/claude-3.5-haiku',
  'anthropic/claude-3-opus',
  'google/gemini-3.1-pro-preview',
  'google/gemini-3.5-flash',
  'google/gemini-2.0-flash-001',
  'google/gemini-2.0-flash-thinking-exp',
  'google/gemini-pro-1.5',
  'google/gemini-flash-1.5',
  'deepseek/deepseek-v4-pro',
  'deepseek/deepseek-v4-flash',
  'deepseek/deepseek-r1',
  'deepseek/deepseek-chat',
  'deepseek/deepseek-coder',
  'minimax/minimax-m2.5',
  'minimax/minimax-m3',
  'openai/gpt-5.2',
  'openai/gpt-5.3-codex',
  'openai/gpt-5.4',
  'openai/gpt-5.5',
  'openai/gpt-5.6-sol',
  'openai/gpt-5.6-terra',
  'openai/gpt-5.6-luna',
  'openai/o1',
  'openai/o3-mini',
  'openai/gpt-4o',
  'openai/gpt-4o-mini',
  'openai/gpt-4-turbo',
  'z-ai/glm-5',
  'z-ai/glm-5.2',
  'moonshotai/kimi-k2.5',
  'moonshotai/kimi-k2.6',
  'moonshotai/kimi-k3',
  'qwen/qwen3-coder',
  'qwen/qwen3.7-max',
  'qwen/qwen3.7-plus',
  'qwen/qwen-2.5-coder-32b-instruct',
  'qwen/qwen-max',
  'qwen/qwen-2.5-72b-instruct',
  'x-ai/grok-4.5',
  'x-ai/grok-4.20',
  'x-ai/grok-3',
  'x-ai/grok-2',
  'sakana/fugu-ultra',
  'mistralai/mistral-large-2512',
  'mistralai/codestral-2501',
  'mistralai/mistral-large-2411',
  'mistralai/mistral-small-2402',
  'mistralai/pixtral-large-2411',
  'meta-llama/llama-3.3-70b-instruct',
  'meta-llama/llama-3.1-405b-instruct',
  'meta-llama/llama-3.1-70b-instruct',
  'meta-llama/llama-3.1-8b-instruct',
  'cohere/command-r-plus',
  'cohere/command-r',
  'amazon/nova-pro-v1',
  'amazon/nova-lite-v1',
  'nvidia/llama-3.1-nemotron-70b-instruct',
  'perplexity/sonar-reasoning-pro',
];

const PROBE_PROMPT =
  'Explain binary search in about 120 words. Plain prose, no code block.';
// generous budget so reasoning models still emit visible output
const PROBE_MAX_TOKENS = 900;
// fewer streamed chunks than this means the provider buffered the
// response and a tokens/sec figure would be meaningless
const MIN_CHUNKS_FOR_TPS = 8;

function loadEnvKey() {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;
  const envFile = path.join(ROOT, '.env');
  if (existsSync(envFile)) {
    const m = readFileSync(envFile, 'utf8').match(/^OPENROUTER_API_KEY=(.+)$/m);
    if (m) return m[1].trim();
  }
  return null;
}

async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

/** { id: { priceIn, priceOut, ctx } } — $/M tokens, ctx in K tokens */
async function fetchPricing() {
  const { data } = await getJson('https://openrouter.ai/api/v1/models');
  const map = {};
  for (const m of data) {
    if (!ROSTER.includes(m.id)) continue;
    map[m.id] = {
      priceIn: Math.round(Number(m.pricing.prompt) * 1e6 * 1000) / 1000,
      priceOut: Math.round(Number(m.pricing.completion) * 1e6 * 1000) / 1000,
      ctx: Math.round(m.context_length / 1000),
    };
  }
  return map;
}

/** best uptime_last_30m across a model's serving endpoints, percent */
async function fetchUptime(id) {
  try {
    const { data } = await getJson(`https://openrouter.ai/api/v1/models/${id}/endpoints`);
    const ups = (data.endpoints ?? [])
      .map((e) => e.uptime_last_30m)
      .filter((u) => typeof u === 'number');
    if (ups.length === 0) return null;
    return Math.round(Math.max(...ups) * 100) / 100;
  } catch {
    return null;
  }
}

/** streamed probe: returns { tps, ttft } or null on failure */
async function probeSpeed(id, key, attempt = 1, maxTokens = PROBE_MAX_TOKENS) {
  const t0 = performance.now();
  let tFirst = null;
  let tLast = null;
  let completionTokens = null;
  let chars = 0;
  let chunks = 0;
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://apexbench.dev',
        'X-Title': 'ApexBench speed probe',
      },
      body: JSON.stringify({
        model: id,
        stream: true,
        max_tokens: maxTokens,
        temperature: 0,
        usage: { include: true },
        messages: [{ role: 'user', content: PROBE_PROMPT }],
      }),
      signal: AbortSignal.timeout(90_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ') || line.includes('[DONE]')) continue;
        let payload;
        try { payload = JSON.parse(line.slice(6)); } catch { continue; }
        const delta = payload.choices?.[0]?.delta?.content;
        if (delta) {
          if (tFirst === null) tFirst = performance.now();
          tLast = performance.now();
          chars += delta.length;
          chunks += 1;
        }
        if (payload.usage?.completion_tokens) completionTokens = payload.usage.completion_tokens;
      }
    }
    if (tFirst === null) throw new Error('no content streamed');
    // TTFT = wait until the first *visible* token, reasoning time included —
    // that is what a user actually experiences.
    const ttft = Math.round(((tFirst - t0) / 1000) * 100) / 100;
    if (chunks < MIN_CHUNKS_FOR_TPS) {
      console.warn(`  ${id}: response buffered (${chunks} chunks) — keeping TTFT, skipping tok/s`);
      return { tps: null, ttft };
    }
    const genSeconds = Math.max((tLast - tFirst) / 1000, 0.001);
    // usage counts reasoning tokens too; visible chars/4 is the honest floor
    const visibleTokens = Math.round(chars / 4);
    const tokens = completionTokens
      ? Math.min(completionTokens, Math.max(visibleTokens, 1))
      : visibleTokens;
    return { tps: Math.round((tokens / genSeconds) * 10) / 10, ttft };
  } catch (err) {
    // 402 = key can't afford this budget: retry with what it CAN afford
    const afford = err.message.match(/can only afford (\d+)/);
    if (afford) {
      const clamped = Number(afford[1]) - 40;
      if (clamped >= 120 && clamped < maxTokens) {
        console.warn(`  ${id}: low credits — retrying with max_tokens=${clamped}`);
        return probeSpeed(id, key, attempt, clamped);
      }
      console.warn(`  probe skipped for ${id}: insufficient OpenRouter credits`);
      return null;
    }
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 2000 * attempt));
      return probeSpeed(id, key, attempt + 1, maxTokens);
    }
    console.warn(`  probe failed for ${id}: ${err.message}`);
    return null;
  }
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      for (;;) {
        const idx = i++;
        if (idx >= items.length) return;
        out[idx] = await fn(items[idx]);
      }
    }),
  );
  return out;
}

const key = loadEnvKey();
console.log('Fetching OpenRouter pricing + context…');
const pricing = await fetchPricing();
const missing = ROSTER.filter((id) => !pricing[id]);
if (missing.length) console.warn('Not on OpenRouter right now:', missing.join(', '));

console.log('Fetching per-model uptime…');
const uptimes = await mapLimit(ROSTER, 6, fetchUptime);

let speeds = new Array(ROSTER.length).fill(null);
if (key) {
  // PROBE_ONLY=a,b,c limits spend to the listed models; others keep old data
  const only = process.env.PROBE_ONLY?.split(',').map((s) => s.trim());
  console.log('Measuring speed (streamed probe per model)…');
  speeds = await mapLimit(ROSTER, 2, (id) =>
    only && !only.includes(id) ? null : probeSpeed(id, key),
  );
} else {
  console.warn('OPENROUTER_API_KEY not set — skipping speed probes, keeping old measurements.');
}

const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { models: {} };
const models = {};
ROSTER.forEach((id, i) => {
  const old = prev.models[id] ?? {};
  models[id] = {
    ...pricing[id],
    uptime: uptimes[i],
    tps: speeds[i]?.tps ?? old.tps ?? null,
    ttft: speeds[i]?.ttft ?? old.ttft ?? null,
  };
});

const snapshot = {
  updatedAt: new Date().toISOString(),
  speedMeasuredAt: key ? new Date().toISOString() : prev.speedMeasuredAt ?? null,
  source: 'openrouter.ai public API; speed/TTFT measured via streamed completions',
  models,
};
writeFileSync(OUT, JSON.stringify(snapshot, null, 2) + '\n');
console.log(`Wrote ${OUT}`);
for (const [id, m] of Object.entries(models)) {
  console.log(
    `  ${id.padEnd(34)} $${String(m.priceIn ?? '—').padEnd(6)}/$${String(m.priceOut ?? '—').padEnd(6)} per M · ${String(m.ctx ?? '—').padEnd(5)}K ctx · up ${m.uptime ?? '—'}% · ${m.tps ?? '—'} tok/s · TTFT ${m.ttft ?? '—'}s`,
  );
}
