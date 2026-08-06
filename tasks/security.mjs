/* Security pack — one real vulnerability hidden among safe look-alikes.
   Wins by proving the exploitable hole with evidence, not by flagging
   everything that looks suspicious. */

/** @type {import('./schema.mjs').Task[]} */
const tasks = [
  {
    id: 'security/jwt-alg-confusion',
    version: 1,
    cluster: 'authz-boundary',
    difficulty: 'hard',
    title: 'A Token Verifier That Trusts the Token to Name Its Own Algorithm',
    summary:
      'Three auth checks look similar; exactly one lets an attacker forge an admin session. Find it and prove the forgery.',
    prompt: `A Node service verifies JSON Web Tokens in three places (see [verify-mw], [refresh], [ws-auth]). Security review flagged "possible auth bypass" but gave no specifics. Using the code and the deploy config [env], identify the ONE endpoint an unauthenticated attacker can exploit to impersonate an admin, and prove the attack end to end.

1. Name the single exploitable verifier and the exact class of vulnerability.
2. Show the concrete forgery steps an attacker takes, referencing the code that makes each step work.
3. Explain why the other two verifiers are NOT exploitable in the same way.
4. Give the minimal one-line fix.

Cite artifact ids for every claim. Flagging a safe verifier as vulnerable is an error.`,
    artifacts: [
      {
        id: 'verify-mw',
        kind: 'code',
        label: 'auth/verify.js — request middleware',
        body: `const jwt = require('jsonwebtoken');
// PUBLIC_KEY is an RSA public key; tokens are signed RS256 by the auth service.
function verify(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  try {
    // algorithms pinned to RS256 — header "alg" cannot downgrade this
    const claims = jwt.verify(token, PUBLIC_KEY, { algorithms: ['RS256'] });
    req.user = claims;
    next();
  } catch (e) {
    res.status(401).json({ error: 'invalid token' });
  }
}`,
      },
      {
        id: 'refresh',
        kind: 'code',
        label: 'auth/refresh.js — token refresh endpoint',
        body: `const jwt = require('jsonwebtoken');
// Verifies the incoming refresh token, then mints a new access token.
function refresh(req, res) {
  const token = req.body.refreshToken || '';
  // BUG SURFACE: no algorithms option is passed, so the library accepts
  // whatever the token's header claims — including HS256 signed with the
  // public key as an HMAC secret (alg-confusion).
  jwt.verify(token, PUBLIC_KEY, (err, claims) => {
    if (err) return res.status(401).json({ error: 'bad refresh' });
    const access = mintAccessToken({ sub: claims.sub, role: claims.role });
    res.json({ access });
  });
}`,
      },
      {
        id: 'ws-auth',
        kind: 'code',
        label: 'ws/auth.js — websocket handshake',
        body: `const jwt = require('jsonwebtoken');
function wsAuth(socket) {
  const token = socket.handshakeQuery.token || '';
  // decode() NEVER verifies a signature — but the result is only used to
  // pick a rate-limit bucket, never to grant privilege. Privilege is
  // re-checked by verify() on every actual command.
  const peek = jwt.decode(token) || {};
  socket.bucket = peek.sub ? 'user' : 'anon';
}`,
      },
      {
        id: 'env',
        kind: 'config',
        label: 'deploy/config.env',
        body: `AUTH_ALG=RS256
# PUBLIC_KEY is distributed to every service and is NOT a secret — it ships
# in the client bundle and is published at /.well-known/jwks.json
PUBLIC_KEY_PATH=/etc/keys/auth.pub
REFRESH_TTL=30d`,
      },
    ],
    reference: {
      resolution:
        'refresh.js is exploitable via RS/HS algorithm confusion: jwt.verify is called with no algorithms whitelist, so an attacker crafts an HS256 token and signs it using the well-known RSA PUBLIC KEY string as the HMAC secret. The library then HMAC-verifies it against that same public string and accepts it, letting the attacker set role:"admin". verify-mw pins algorithms:["RS256"] so an HS256 forgery is rejected. ws-auth uses decode() with no privilege effect (only a rate-limit bucket), and privilege is re-verified elsewhere, so it is not an auth bypass.',
      deliverables: [
        {
          id: 'd1',
          ask: 'the exploitable verifier and vuln class',
          expected: 'refresh.js — RS256/HS256 algorithm-confusion (key confusion) auth bypass',
          artifacts: ['refresh', 'env'],
          disqualifiers: ['naming verify-mw', 'naming ws-auth as the exploitable one'],
        },
        {
          id: 'd2',
          ask: 'the forgery steps',
          expected:
            'Fetch the public RSA key (jwks / client bundle, per [env]); build a JWT with header alg:HS256 and payload role:admin; HMAC-sign it using the PEM public key bytes as the secret; POST it as refreshToken; refresh.js verifies with no alg pin and mints an admin access token.',
          artifacts: ['refresh', 'env'],
        },
        {
          id: 'd3',
          ask: 'why the other two are safe',
          expected:
            'verify-mw pins algorithms:["RS256"], rejecting HS256 forgeries; ws-auth only decode()s (no signature check) and the result picks a rate-limit bucket, never grants privilege.',
          artifacts: ['verify-mw', 'ws-auth'],
        },
        {
          id: 'd4',
          ask: 'the fix',
          expected: 'Pass { algorithms: ["RS256"] } to jwt.verify in refresh.js.',
          artifacts: ['refresh'],
        },
      ],
      requiredEvidence: ['refresh', 'env'],
      disqualifiers: [
        'Claiming all three are vulnerable',
        'Proposing to "rotate the key" as the primary fix without pinning the algorithm',
      ],
    },
  },
  {
    id: 'security/path-traversal-download',
    version: 1,
    cluster: 'taint-flow',
    difficulty: 'standard',
    title: 'A File Download Endpoint With One Un-Neutralized User Path',
    summary:
      'Two handlers take a user-supplied filename; one lets an attacker read /etc/passwd. Trace the taint.',
    prompt: `A file service exposes two download handlers, [avatar] and [export]. One sanitizes the user-controlled path and one does not. Using [routes] for how each is mounted, identify the single handler vulnerable to path traversal, show the exploit input and the file it discloses, and explain precisely why the other handler is safe. Give the minimal fix. Cite artifact ids.`,
    artifacts: [
      {
        id: 'avatar',
        kind: 'code',
        label: 'handlers/avatar.js',
        body: `const path = require('path');
const fs = require('fs');
const ROOT = '/srv/avatars';
function avatar(req, res) {
  const name = req.params.name;
  // resolve then confirm the result is still inside ROOT
  const full = path.resolve(ROOT, name);
  if (!full.startsWith(ROOT + path.sep)) return res.status(403).end();
  fs.createReadStream(full).pipe(res);
}`,
      },
      {
        id: 'export',
        kind: 'code',
        label: 'handlers/export.js',
        body: `const fs = require('fs');
const ROOT = '/srv/exports/';
function exportFile(req, res) {
  const name = req.query.file || '';
  // concatenates directly — "../" segments are never neutralized
  fs.readFile(ROOT + name, (err, buf) => {
    if (err) return res.status(404).end();
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(buf);
  });
}`,
      },
      {
        id: 'routes',
        kind: 'config',
        label: 'routes.js',
        body: `router.get('/avatars/:name', avatar);      // name is a single path segment
router.get('/export', exportFile);          // file is a raw query string`,
      },
    ],
    reference: {
      resolution:
        'export.js is vulnerable: req.query.file is concatenated onto ROOT with no normalization or containment check, so file=../../etc/passwd yields fs.readFile("/srv/exports/../../etc/passwd") = /etc/passwd. avatar.js resolves the path and then verifies the resolved path still begins with ROOT + separator, which rejects traversal. Fix export.js by resolving and containing exactly as avatar.js does (path.resolve(ROOT, name) then startsWith check), or reject any name containing "..".',
      deliverables: [
        {
          id: 'd1',
          ask: 'the vulnerable handler',
          expected: 'export.js — path traversal via unchecked req.query.file',
          artifacts: ['export', 'routes'],
          disqualifiers: ['naming avatar.js'],
        },
        {
          id: 'd2',
          ask: 'exploit input and disclosed file',
          expected: 'GET /export?file=../../etc/passwd reads /srv/exports/../../etc/passwd → /etc/passwd',
          artifacts: ['export'],
        },
        {
          id: 'd3',
          ask: 'why avatar.js is safe',
          expected:
            'It calls path.resolve(ROOT, name) then rejects unless the resolved path still starts with ROOT + path.sep, so ../ escapes are blocked.',
          artifacts: ['avatar'],
        },
        {
          id: 'd4',
          ask: 'the fix',
          expected: 'Apply the same resolve-then-contain check (or reject names containing "..") in export.js.',
          artifacts: ['export'],
        },
      ],
      requiredEvidence: ['export'],
      disqualifiers: ['Claiming avatar.js is exploitable because it uses path at all'],
    },
  },
  {
    id: 'security/sql-in-clause',
    version: 1,
    cluster: 'vuln-discovery',
    difficulty: 'standard',
    title: 'Parameterized Everywhere Except the One Dynamic IN Clause',
    summary:
      'A repository parameterizes its queries — except one that builds an IN (...) list by hand. Find the injection.',
    prompt: `A data-access layer [repo] runs three queries. The team says "everything is parameterized." Using the query builder [db], find the one query where user input reaches SQL unparameterized, show an injection payload and its effect, explain why the other two are safe, and give the minimal fix. Cite artifact ids.`,
    artifacts: [
      {
        id: 'repo',
        kind: 'code',
        label: 'repo/orders.js',
        body: `// findById: parameterized
function findById(id) {
  return db.query('SELECT * FROM orders WHERE id = $1', [id]);
}
// search: parameterized, even the LIKE
function search(term) {
  return db.query('SELECT * FROM orders WHERE note LIKE $1', ['%' + term + '%']);
}
// byIds: builds the IN list by string-joining the raw ids
function byIds(ids) {
  const list = ids.join(',');
  return db.query('SELECT * FROM orders WHERE id IN (' + list + ')');
}`,
      },
      {
        id: 'db',
        kind: 'code',
        label: 'db.js',
        body: `// thin wrapper over pg — $1,$2… are bound server-side and never interpolated
module.exports.query = (text, params = []) => pool.query(text, params);`,
      },
    ],
    reference: {
      resolution:
        'byIds is injectable: ids are join(",")-ed straight into the SQL string, so a value like "1); DROP TABLE orders;--" (or "0 OR 1=1") reaches the engine as SQL. findById and search bind user input as $1 parameters, which pg sends separately from the query text, so they are safe even though search interpolates the % wildcards (those become part of the bound value, not the SQL). Fix byIds by generating placeholders ($1,$2,…) for each id and passing ids as params.',
      deliverables: [
        {
          id: 'd1',
          ask: 'the injectable query',
          expected: 'byIds — SQL injection via string-joined IN list',
          artifacts: ['repo'],
          disqualifiers: ['naming search because it uses LIKE', 'naming findById'],
        },
        {
          id: 'd2',
          ask: 'payload and effect',
          expected:
            'ids containing "1) OR 1=1--" or "1); DROP TABLE orders;--" injects arbitrary SQL / dumps or destroys the table.',
          artifacts: ['repo'],
        },
        {
          id: 'd3',
          ask: 'why the others are safe',
          expected:
            'findById and search pass user input as bound $1 parameters; pg transmits parameters separately from the query text, so the LIKE wildcards in search are data, not SQL.',
          artifacts: ['repo', 'db'],
        },
        {
          id: 'd4',
          ask: 'the fix',
          expected:
            'Build placeholders ids.map((_,i)=>`$${i+1}`).join(",") and pass ids as the params array.',
          artifacts: ['repo'],
        },
      ],
      requiredEvidence: ['repo'],
      disqualifiers: ['Claiming the LIKE query is injectable'],
    },
  },
];

export default tasks;
