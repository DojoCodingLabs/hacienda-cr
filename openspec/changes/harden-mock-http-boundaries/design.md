## Context

See `proposal.md` — Why. Constraints that shape the approach, verified against the current source:

- `packages/mock/src/server.ts` dispatches from a single `createServer` listener (line 467) and starts three handlers as bare `void (async () => { ... })()` IIFEs: `handleToken` (265), `handleSubmit` (299), `handleStatus` (433). Nothing catches their rejections, and `packages/mock/src/cli.ts` registers no `unhandledRejection`/`uncaughtException` listener anywhere in the repo. Node's default (`--unhandled-rejections=throw`) turns the first rejection into `process.exitCode = 1`.
- `readBody` (246) rejects for two expected HTTP conditions: body over `MAX_BODY_BYTES` and `req` stream error (client abort → `ECONNRESET`).
- Only `handleSubmit` wraps `readBody` in `try/catch`; `handleToken` does not.
- `JSON.parse(raw) as Record<string, unknown>` (316) narrows by assertion only; `JSON.parse("null")` succeeds and the next line dereferences `null`.
- The listener builds `new URL(req.url ?? "/", \`http://${req.headers.host ?? "localhost"}\`)`(468) and then uses only`url.pathname`. The untrusted `Host` header therefore contributes nothing to routing but can throw synchronously.
- The suite is colocated Vitest (`packages/mock/src/server.spec.ts`), uses real `fetch` against a loopback server, and asserts observable HTTP results. `pnpm verify` is the gate.

## Goals / Non-Goals

**Goals:**

- Every hostile input in the spec delta produces a deterministic HTTP status and leaves the process serving.
- Each fix is preceded by a failing test that reproduces exactly one observed crash.
- Keep the existing observable contract intact: 201/400/401/409/429/404, `X-Error-Cause`, `X-Ratelimit-*`, callbacks, state machine, `reset()`.

**Non-Goals:**

- No process-wide error handlers. `cli.ts` stays without `unhandledRejection`/`uncaughtException` listeners; the containment lives in the request path.
- No changes to the unbounded `tokens`/`windows` maps, rate-limit policy, auth semantics, callback retry logic, or recording projection.
- No new `MockServer` options or exported methods; no API break.
- No claim of parity with real Hacienda behavior beyond the error codes already specified.

## Decisions

**D1 — Contain errors at the dispatch boundary, not globally.**
A single `dispatch(req, res, handler)` helper wraps each handler call: it invokes the async handler, and on rejection or synchronous throw responds `500` with `X-Error-Cause` when headers are still unsent, otherwise destroys the socket. Rejected: `process.on("unhandledRejection", ...)` in `cli.ts`. It would keep a process alive with corrupted per-request state, hide real logic bugs, and contradict the spec scenario that forbids depending on global handlers. Also rejected: per-handler `.catch()` in three places — one boundary is fewer places to forget, and the routing code (URL parse) needs the same protection synchronously.

**D2 — Validate the parsed JSON root before dereferencing.**
Guard with an explicit "is a non-null, non-array object" check immediately after `JSON.parse`, returning `400` with its own `X-Error-Cause` message ("The request body must be a JSON object."). Rejected: reusing the existing invalid-JSON message — `X-Error-Cause` is diagnostic contract, and `null` is valid JSON. Rejected: a Zod schema for the whole submission body — larger behavioral surface than this fix needs and would change error messages that existing tests assert.

**D3 — Make `readBody` return a result instead of rejecting.**
Resolve a discriminated union: `{ ok: true; body } | { ok: false; reason: "too-large" } | { ok: false; reason: "aborted" }` (plus the stream `error` path mapped to `aborted`). Callers answer `400` and stop consuming; `aborted` writes nothing because the peer is gone. Rationale: both failures are expected HTTP conditions, not exceptional states, and turning them into values removes the reject-into-nowhere path entirely instead of adding catches. Rejected: keeping the reject and adding `try/catch` in `handleToken` — fixes the symptom, still leaves a rejected promise as the primary control flow, and the abort case resolves to a needless 400 write on a dead socket.

**D4 — Ignore `Host` when building the URL.**
Parse with a constant base (`new URL(req.url ?? "/", "http://mock.invalid")`) because only `pathname` is consumed. Rejected: validating `Host` and returning `400`. It adds a branch for a header the mock never uses and makes routing depend on client-supplied data; ignoring it is both simpler and strictly more robust. The spec delta freezes this as "malformed `Host` routes by path".

**D5 — Guard writes to a response that may already be gone.**
Before any `sendError`/`sendJson`, skip when `res.writableEnded || res.destroyed`, and attach a no-op `res.on("error", ...)` in the dispatch boundary so a `write`/`end` on an aborted socket cannot surface as an unhandled `'error'` event. Rejected: relying on Node's default silence — `ERR_STREAM_WRITE_AFTER_END` and socket `EPIPE` are emitted asynchronously and would reintroduce a process-level failure.

**D6 — Prove each vector with a failing test first, using the transport that can express it.**
`fetch` cannot send an invalid `Host` nor abort mid-body deterministically, so those two tests use a raw `node:net` socket and write partial request bytes directly. The `null`/scalar body and oversize tests use `fetch`. Each test asserts both the response and a follow-up request on the same server instance, so liveness is part of the assertion rather than an afterthought. RED is expected to be violent: pre-fix the Vitest worker dies from the same unhandled rejection, which is exactly the bug; the observed stack is recorded in the task checklist before the fix lands. Rejected: asserting liveness only via a spawned child process — it duplicates the production entry point for little added signal and would require building `dist` inside the unit run.

**D7 — Order of work follows the observed severity order.**
Unauthenticated vectors first (`Host`, oversize `/token`, aborted `/token`), then the authenticated `null`/scalar body the report described. Each commit-sized step is a test plus its minimal fix, so a bisect never lands on a half-hardened handler.

## Risks / Trade-offs

- **Replying `400` while the client is still uploading can surface as `ECONNRESET` to the client instead of a clean status.** Some clients abort the upload when they see an early response. → Mitigation: end the response and set `Connection: close` before dropping the request stream, and assert liveness (not just the status) in the oversize test; the spec requires the 400 and the survival, not that a slow uploader observes it.
- **The dispatch boundary could swallow genuine bugs into opaque 500s.** → Mitigation: log every contained error through the existing `logger` option, and keep the known cases returning their specific 400 so they never reach the 500 path; tests assert the specific causes, not just "not a crash".
- **`readBody` signature change touches all three handlers.** → Mitigation: TypeScript narrows the union at each call site; the existing tests must keep passing untouched apart from new cases.
- **Raw-socket tests are timing-sensitive if written with fixed sleeps.** → Mitigation: drive the socket on `connect`/`data` events and resolve on the observed response bytes or socket close; no arbitrary waits.
- **The spec's "no global handlers" scenario is enforced by absence, which a test can only approximate.** → Mitigation: the containment tests run in a process with no such listeners and assert a subsequent request succeeds; the absence in `cli.ts` stays reviewable in the diff.
