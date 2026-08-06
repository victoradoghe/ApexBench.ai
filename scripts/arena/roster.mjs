/* ============================================================
   ApexBench arena roster
   ------------------------------------------------------------
   Competitors and judges are pinned OpenRouter model slugs. This
   season runs entirely on ZERO-COST models so a real journal can
   be produced at $0; funded frontier models drop in by adding
   their slugs here and re-running (the journal is append-only).

   Judge seating rule: a judge is never eligible for a match where
   it, or any model from its vendor, competes. The pool spans five
   distinct vendors, so every pairing has at least three
   conflict-free judges.
   ============================================================ */

/** competitors — display name, provider, pinned OpenRouter slug */
export const COMPETITORS = [
  { name: 'Nemotron 3 Ultra 550B', provider: 'NVIDIA',      slug: 'nvidia/nemotron-3-ultra-550b-a55b:free' },
  { name: 'Nemotron 3 Super 120B', provider: 'NVIDIA',      slug: 'nvidia/nemotron-3-super-120b-a12b:free' },
  { name: 'Gemma 4 31B',           provider: 'Google',      slug: 'google/gemma-4-31b-it:free' },
  { name: 'Gemma 4 26B',           provider: 'Google',      slug: 'google/gemma-4-26b-a4b-it:free' },
  { name: 'GPT-OSS 20B',           provider: 'OpenAI',      slug: 'openai/gpt-oss-20b:free' },
  { name: 'North Mini Code',       provider: 'Cohere',      slug: 'cohere/north-mini-code:free' },
  { name: 'Ling 3.0 Flash',        provider: 'InclusionAI', slug: 'inclusionai/ling-3.0-flash:free' },
  { name: 'Laguna M.1',            provider: 'Poolside',    slug: 'poolside/laguna-m.1:free' },
];

/** five-vendor judge pool; three seated per match, none sharing a
    provider with either competitor */
export const JUDGE_POOL = [
  { name: 'Nemotron 3 Super 120B', provider: 'NVIDIA',      slug: 'nvidia/nemotron-3-super-120b-a12b:free' },
  { name: 'Gemma 4 31B',           provider: 'Google',      slug: 'google/gemma-4-31b-it:free' },
  { name: 'GPT-OSS 20B',           provider: 'OpenAI',      slug: 'openai/gpt-oss-20b:free' },
  { name: 'North Mini Code',       provider: 'Cohere',      slug: 'cohere/north-mini-code:free' },
  { name: 'Ling 3.0 Flash',        provider: 'InclusionAI', slug: 'inclusionai/ling-3.0-flash:free' },
];

export const bySlug = (slug) =>
  COMPETITORS.find((c) => c.slug === slug) ?? JUDGE_POOL.find((j) => j.slug === slug);
