## Why

The standalone mock server claims to reproduce the Hacienda reception API's error behavior, including `400` for a malformed payload, but four HTTP inputs instead kill the process with an unhandled rejection or uncaught exception. Three of them need no token, so any local process — or a web page the developer has open — can take the mock down mid-suite. Two of the four were confirmed against the built package (`packages/mock/dist`), and `null` as the submission body is the case already covered by the existing "payload inválido devuelve 400" requirement, which the implementation currently violates.

## What Changes

- Guard the submission handler against non-object JSON roots (`null`, scalars), returning `400` with `X-Error-Cause` instead of dereferencing a non-object.
- Contain every asynchronous request handler so a rejection answers `4xx`/`5xx` and logs, instead of escaping the IIFE and terminating the process.
- Answer `400` for an over-limit body instead of rejecting an unread promise, and tolerate a client that disconnects mid-body.
- Stop parsing the request URL from the untrusted `Host` header; a malformed host must produce `400`, not a synchronous throw inside the request listener.
- Add regression tests that fail before each fix, one behavior per test, alongside the existing colocated `*.spec.ts` suite.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `hacienda-mock`: the "Reproducir el API de recepción con fidelidad" requirement gains explicit hostile-input scenarios (non-object JSON root, over-limit body, aborted body, malformed `Host`), and a new requirement binds the server to stay alive and keep serving after any rejected request. The existing sanitized-recording and callback requirements gain no new behavior.

## Impact

`packages/mock/src/server.ts` (request dispatch, `readBody`, both async handlers), `packages/mock/src/server.spec.ts` (regressions), and `openspec/specs/hacienda-mock/spec.md` (delta). No public API change: `MockServer` options and return shape are untouched, the package stays `private: true`, and the server still binds loopback only. No publication, no live Hacienda call, and no SDK/CLI/MCP change follows from implementation.
