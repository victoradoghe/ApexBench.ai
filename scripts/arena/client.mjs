/* ============================================================
   ApexBench arena — OpenRouter client
   ------------------------------------------------------------
   Fail-closed: bounded retries on transient errors, a hard timeout,
   and a typed result so a failed response voids a match as a
   no-contest rather than scoring off an opponent's outage.

   Two kinds of 429 are distinguished, because they mean opposite
   things for a run:

   - UPSTREAM throttle (the provider behind a free endpoint is busy;
     the body carries `metadata.provider_name`) — transient. Backs off
     and retries; only once the backoff budget is spent does the call
     fail, voiding that one match.
   - ACCOUNT quota (our own daily free-model allowance) — terminal.
     Surfaced as RateLimited so the runner stops cleanly and the
     journal stays consistent.

   Every roster model is a reasoning model: tokens spent thinking come
   out of the same budget as the visible answer, so a truncated reply
   arrives as `content: ""` with finish_reason "length". That is
   retried with a doubled budget before the call is failed.
   ============================================================ */

import { readFileSync } from 'node:fs';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

/** account-level quota — the run cannot continue */
export class RateLimited extends Error {}

/** upstream 429 backoff schedule, ms */
const BACKOFF = [3000, 8000, 20000, 45000, 90000];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** an account-level quota 429 looks different from a provider throttle */
function isAccountQuota(body) {
  if (body?.error?.metadata?.provider_name) return false; // upstream provider said no
  const msg = String(body?.error?.message || '').toLowerCase();
  return msg.includes('per-day') || msg.includes('daily') ||
    msg.includes('credits') || msg.includes('rate limit exceeded');
}

/**
 * One non-streamed completion.
 *
 * A failure is classified, because the two kinds mean different things for a
 * match. `kind: 'model'` is the model itself producing nothing usable — that
 * is a genuine loss and the runner scores it as a forfeit. `kind: 'infra'` is
 * the endpoint being unreachable or throttled, which says nothing about the
 * model and must void the match instead. Anything ambiguous (a timeout, a
 * transport error) is classified 'infra': awarding a win on infrastructure
 * noise is a much worse error than dropping a match.
 *
 * @returns {{ ok: true, text, tokens, reasoningTokens, ms, genId }
 *          | { ok: false, error: string, kind: 'model' | 'infra' }}
 * @throws {RateLimited} when our own account quota is exhausted
 */
export async function complete(slug, messages, key, { maxTokens = 3000, timeoutMs = 180000 } = {}) {
  const t0 = performance.now();
  const ceiling = maxTokens * 4;
  let budget = maxTokens;
  let throttles = 0;
  let attempt = 0;
  let lastError = 'no attempt made';
  let lastKind = 'infra';

  // attempts are bounded separately from throttles: a request that never
  // reached the model should not burn one of the three real tries
  while (attempt < 3) {
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://apexbench.dev',
          'X-Title': 'ApexBench arena',
        },
        body: JSON.stringify({
          model: slug,
          max_tokens: budget,
          temperature: 0,
          usage: { include: true },
          messages,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (res.status === 429) {
        const body = await res.json().catch(() => ({}));
        if (isAccountQuota(body)) throw new RateLimited('account free-model quota exhausted');
        if (throttles < BACKOFF.length) {
          await sleep(BACKOFF[throttles++]);
          continue;
        }
        lastError = 'upstream rate-limited (backoff exhausted)';
        lastKind = 'infra';
        break;
      }

      attempt++;
      if (!res.ok) {
        const body = (await res.text()).slice(0, 200);
        throw new Error(`HTTP ${res.status}: ${body}`);
      }

      const json = await res.json();
      const choice = json.choices?.[0] ?? {};
      const text = choice.message?.content?.trim() || '';

      if (!text) {
        // reasoning consumed the whole budget — retry with a larger one
        if (choice.finish_reason === 'length' && budget * 2 <= ceiling) {
          budget *= 2;
          attempt--; // a truncation is a budget problem, not a failed try
          continue;
        }
        // the endpoint answered; the model just had nothing to say
        lastKind = 'model';
        throw new Error(`empty completion (finish_reason: ${choice.finish_reason ?? 'unknown'})`);
      }

      const usage = json.usage || {};
      return {
        ok: true,
        text,
        tokens: usage.completion_tokens ?? Math.round(text.length / 4),
        reasoningTokens: usage.completion_tokens_details?.reasoning_tokens ?? 0,
        ms: Math.round(performance.now() - t0),
        genId: json.id ?? null,
      };
    } catch (err) {
      if (err instanceof RateLimited) throw err;
      lastError = err.message;
      // classify from the error that actually ended this attempt, so an HTTP
      // failure after an earlier empty completion is not misfiled as the
      // model's fault
      lastKind = err.message.startsWith('empty completion') ? 'model' : 'infra';
      if (attempt >= 3) break;
      await sleep(1500 * Math.max(attempt, 1));
    }
  }
  return { ok: false, error: lastError, kind: lastKind };
}

export function loadKey(root) {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;
  try {
    const m = readFileSync(`${root}/.env`, 'utf8').match(/^OPENROUTER_API_KEY=(.+)$/m);
    if (m) return m[1].trim();
  } catch {
    /* ignore */
  }
  return null;
}
