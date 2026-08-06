/* Refactoring pack — several candidate rewrites, one of which quietly
   changes behavior. Wins by keeping behavior intact and naming the rewrite
   that breaks it — the correct rewrite, not the cleanest-looking one. */

/** @type {import('./schema.mjs').Task[]} */
const tasks = [
  {
    id: 'refactoring/debounce-equivalence',
    version: 1,
    cluster: 'behavior-preservation',
    difficulty: 'hard',
    title: 'Which Debounce Rewrite Preserves Trailing-Edge Behavior?',
    summary:
      'Three "cleaner" debounce rewrites of one original; exactly one changes when the callback fires.',
    prompt: `[original] is a working debounce used across the app. Three rewrites — [rw-a], [rw-b], [rw-c] — each claim to be an equivalent, cleaner version. Exactly one changes observable behavior. Identify the behavior-preserving rewrite(s) and the one that breaks, describe a concrete call sequence that distinguishes the broken one from the original, and state what the user-visible difference is. Cite artifact ids. The cleanest-looking rewrite is not automatically correct.`,
    artifacts: [
      {
        id: 'original',
        kind: 'code',
        label: 'debounce.js (original, correct)',
        body: `function debounce(fn, wait) {
  let t = null;
  return function (...args) {
    if (t) clearTimeout(t);
    t = setTimeout(() => {
      t = null;
      fn.apply(this, args);        // trailing edge: last args, after quiet period
    }, wait);
  };
}`,
      },
      {
        id: 'rw-a',
        kind: 'code',
        label: 'rewrite A',
        body: `const debounce = (fn, wait) => {
  let t;
  return function (...args) {
    clearTimeout(t);               // clearTimeout(undefined) is a safe no-op
    t = setTimeout(() => fn.apply(this, args), wait);
  };
};`,
      },
      {
        id: 'rw-b',
        kind: 'code',
        label: 'rewrite B',
        body: `const debounce = (fn, wait) => {
  let t;
  return (...args) => {            // arrow: 'this' is captured from definition site
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
};`,
      },
      {
        id: 'rw-c',
        kind: 'code',
        label: 'rewrite C',
        body: `function debounce(fn, wait) {
  let t = null;
  return function (...args) {
    if (t) clearTimeout(t);
    t = setTimeout(function () {
      t = null;
      fn.apply(this, args);        // note: plain function, called by timer
    }, wait);
  };
}`,
      },
    ],
    reference: {
      resolution:
        'A preserves behavior. B breaks behavior: it returns an ARROW function, so `this` is lexically bound to the definition site rather than the call site; when debounced methods are invoked as obj.method(...), the original forwards the caller\'s `this` (via the normal function receiver) but B forwards the outer/module `this` (undefined in strict mode), so fn runs with the wrong receiver. C is also equivalent to the original: setTimeout invokes its callback with `this` = undefined (or the timer/global object) in BOTH the original and C — the original\'s callback is likewise a function called by the timer, not by the returned wrapper — so C\'s inner `function(){ fn.apply(this,args) }` behaves identically. Distinguishing sequence: const o = { v:1, m: debounce(function(){ return this.v }, 10) }; o.m() — original/A/C forward `this` from the wrapper\'s call; B loses it and throws / reads undefined.v.',
      deliverables: [
        {
          id: 'd1',
          ask: 'which rewrite breaks',
          expected: 'Rewrite B breaks; A and C are behavior-preserving.',
          artifacts: ['rw-a', 'rw-b', 'rw-c'],
          disqualifiers: ['Naming A as broken', 'Naming C as broken'],
        },
        {
          id: 'd2',
          ask: 'why B breaks',
          expected:
            'B returns an arrow function, so `this` is captured lexically at definition rather than from the call site; obj.method() no longer forwards obj as the receiver.',
          artifacts: ['rw-b', 'original'],
        },
        {
          id: 'd3',
          ask: 'why C is safe (not the trap)',
          expected:
            'The original\'s timer callback is invoked by setTimeout with `this`=undefined already; C\'s inner plain function is likewise invoked by the timer, so both apply fn with the same receiver — identical behavior.',
          artifacts: ['rw-c', 'original'],
        },
        {
          id: 'd4',
          ask: 'a distinguishing call',
          expected:
            'Bind the debounced fn as a method and rely on `this`: const o={v:1,m:debounce(function(){return this.v},10)}; o.m() works under original/A/C but B reads the wrong `this`.',
          artifacts: ['original', 'rw-b'],
        },
      ],
      requiredEvidence: ['rw-b', 'original'],
      disqualifiers: ['Concluding all three are equivalent', 'Flagging C solely because it "looks less clean"'],
    },
  },
  {
    id: 'refactoring/reduce-vs-loop-short-circuit',
    version: 1,
    cluster: 'semantic-equivalence',
    difficulty: 'standard',
    title: 'A Loop With an Early Return, Rewritten as a Reduce',
    summary:
      'The original short-circuits on the first match; one rewrite silently keeps the last match instead.',
    prompt: `[original] finds the first enabled plugin that can handle an event. Two rewrites [rw-a] and [rw-b] claim equivalence. Identify which rewrite changes behavior, give an input where the outputs differ, and state the difference. Cite artifact ids.`,
    artifacts: [
      {
        id: 'original',
        kind: 'code',
        label: 'original',
        body: `function firstHandler(plugins, event) {
  for (const p of plugins) {
    if (p.enabled && p.canHandle(event)) return p;   // first match wins
  }
  return null;
}`,
      },
      {
        id: 'rw-a',
        kind: 'code',
        label: 'rewrite A',
        body: `const firstHandler = (plugins, event) =>
  plugins.find(p => p.enabled && p.canHandle(event)) ?? null;`,
      },
      {
        id: 'rw-b',
        kind: 'code',
        label: 'rewrite B',
        body: `const firstHandler = (plugins, event) =>
  plugins.reduce(
    (acc, p) => (p.enabled && p.canHandle(event) ? p : acc),
    null);   // keeps the LAST match, not the first`,
      },
    ],
    reference: {
      resolution:
        'A preserves behavior: Array.prototype.find returns the first element that matches and stops, matching the original\'s first-match short-circuit. B changes behavior: reduce visits every element and overwrites acc on each match, so it returns the LAST matching plugin, not the first. Distinguishing input: two enabled plugins that both canHandle(event) — original/A return plugins[0], B returns plugins[1]. (B also loses the short-circuit: canHandle is called for every plugin even after a match, which can matter if canHandle has side effects or is expensive.)',
      deliverables: [
        {
          id: 'd1',
          ask: 'which rewrite breaks',
          expected: 'Rewrite B (reduce) breaks; A (find) preserves behavior.',
          artifacts: ['rw-a', 'rw-b'],
          disqualifiers: ['Naming A as broken'],
        },
        {
          id: 'd2',
          ask: 'distinguishing input',
          expected:
            'Two enabled, capable plugins [p0, p1]: original and A return p0; B returns p1 (last match).',
          artifacts: ['original', 'rw-b'],
        },
        {
          id: 'd3',
          ask: 'the difference',
          expected:
            'B returns the last match instead of the first, and evaluates canHandle for all plugins (no short-circuit / possible side effects).',
          artifacts: ['rw-b', 'original'],
        },
      ],
      requiredEvidence: ['rw-b'],
      disqualifiers: ['Claiming find and reduce are equivalent here'],
    },
  },
  {
    id: 'refactoring/extract-default-param',
    version: 1,
    cluster: 'extract-and-inline',
    difficulty: 'standard',
    title: 'Extracting a Default: Shared Mutable vs Fresh Each Call',
    summary:
      'Hoisting a default array out of the signature turns a per-call fresh value into shared mutable state.',
    prompt: `[original] appends to a per-call list. A rewrite [rw] extracts the default to a constant "to avoid re-allocating." Decide whether [rw] is behavior-preserving; if not, give a call sequence that exposes the difference and explain the bug class. Cite artifact ids.`,
    artifacts: [
      {
        id: 'original',
        kind: 'code',
        label: 'original',
        body: `function collect(item, into = []) {
  into.push(item);           // default [] is created fresh on each call that omits it
  return into;
}`,
      },
      {
        id: 'rw',
        kind: 'code',
        label: 'rewrite',
        body: `const SHARED = [];
function collect(item, into = SHARED) {   // "reuse one array to avoid allocation"
  into.push(item);
  return into;
}`,
      },
    ],
    reference: {
      resolution:
        'The rewrite is NOT behavior-preserving. In the original, a call that omits `into` gets a brand-new [] each time, so collect(1) and later collect(2) return independent [1] and [2]. In the rewrite, both calls share the module-level SHARED array, so collect(1) returns [1] then collect(2) returns [1,2], and every caller mutates the same list — a shared-mutable-default / global-state aliasing bug. Distinguishing sequence: const a = collect(1); const b = collect(2); original → a=[1], b=[2]; rewrite → a and b are the SAME array [1,2].',
      deliverables: [
        {
          id: 'd1',
          ask: 'is it behavior-preserving',
          expected: 'No — it introduces shared mutable state across calls.',
          artifacts: ['rw', 'original'],
          disqualifiers: ['Concluding it is equivalent / just an optimization'],
        },
        {
          id: 'd2',
          ask: 'a distinguishing sequence',
          expected:
            'a=collect(1); b=collect(2): original gives a=[1], b=[2]; rewrite gives a===b===[1,2].',
          artifacts: ['original', 'rw'],
        },
        {
          id: 'd3',
          ask: 'the bug class',
          expected: 'Shared/aliased mutable default (module-global state) causing cross-call contamination.',
          artifacts: ['rw'],
        },
      ],
      requiredEvidence: ['rw'],
      disqualifiers: ['Endorsing the rewrite as a safe allocation optimization'],
    },
  },
];

export default tasks;
