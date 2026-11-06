# Security hardening scope and verification

This pass addresses standalone ESM packaging, availability under hostile XML or
HTTP inputs, cancellation/deadlines, submission replay, credential diagnostics,
certificate readiness, and dependency advisories. It does not claim universal
security or replace a production penetration test.

## Behavior changes

- MCP imports the published SDK/shared packages as ESM dependencies. Packed
  installation tests run the actual MCP executable over stdio on Node 22 and 24.
- `submitAndWait` now applies its timeout to submission **and** polling. It accepts
  an `AbortSignal`, rejects late results, and cancels all SDK waits and I/O.
- HTTP calls have a 30-second budget (configurable with `requestTimeoutMs`), and
  token requests have a 30-second cap. SDK response reads are bounded: 8 MiB for
  API responses, 64 KiB for token responses, including streamed decoded bytes.
- Cancellation covers SDK waits and aborts fetch. A caller-provided transport
  that ignores AbortSignal may continue its own work, although the SDK rejects
  promptly and stops subsequent retries/polls. Shared token refresh may continue
  for other callers; it retains its independent 30-second budget.
- POST/PATCH operations are not retried automatically. `submitDocument` explicitly
  disables replay. After an ambiguous submission failure, check status by the
  same clave before deciding whether to resubmit. GET/PUT/DELETE retain retries.
- Authenticated API and token calls reject redirects. Caller-supplied environment
  URLs and custom transports remain trusted configuration, not remote input.
- XML validation/signing rejects DTDs/entities before parsing, malformed signing
  input, documents above 8 MiB or 128 nesting levels, and more than 100,000 elements.
  Runtime validation uses bundled schemas and `--nonet`, with four concurrent
  workers maximum, each capped at 64 MiB. Excess calls receive a busy result
  rather than creating an unbounded worker queue. Size/worker caps are scoped
  availability controls, not a guarantee against every CPU exhaustion input.
- PKCS#12 input is capped at 1 MiB; signing requires RSA >=2048, a currently valid
  certificate, and a matching private key. Certificates/PINs are trusted local
  credentials; untrusted uploads would need separate isolation for PKCS#12 KDF
  and ASN.1 work. Signing does not establish issuer-chain trust or revocation.
- Structured logs redact nested passwords, PINs, tokens, authorization/cookies,
  private keys, API keys and secrets. This does not sanitize arbitrary free-form
  messages; callers must keep secrets out of message text. IDP error descriptions
  and invalid-token payloads are not copied into diagnostic messages.
- MCP caps line counts, taxes/discounts per item, and string inputs; it validates
  the document before allocating a persistent sequence.

## Test suites

- `api/security.spec.ts`: deadline boundaries, hung submission/response/auth,
  cancellation during backoff/rate limits, no POST replay, redirect policy,
  response-size limits, listener/timer cleanup and credential-safe errors.
- `api/lifecycle.integration.spec.ts`: actual local HTTP authentication,
  build/sign/strict XSD/submission/polling, and rejected redirect following.
- `xml/security.spec.ts`: XXE/DTD/billion-laughs inputs, inherited schema names,
  external schemaLocation/XInclude, UTF-8 byte caps, depth/element and worker caps.
- `signing/security.spec.ts`: native WebCrypto signature verification, tampering,
  weak keys, expired certificates and certificate/private-key mismatch.
- `logging/security.spec.ts`: text/JSON nested redaction and cyclic inputs.
- `config/sequence-process.integration.spec.ts`: independent processes race
  sequence allocation and unrelated resets using an isolated temporary directory.
- `scripts/verify-packages.mjs`: installs all four local tarballs into a fresh
  consumer and runs native ESM imports, SDK XSD, CLI commands and MCP stdio.

## Dependency audit, 2026-10-03

Compatible dependencies and the test/build tooling were updated. The audit now
reports one high-severity advisory, with no patched release:
[GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv), affecting
node-forge RSA PKCS#1 v1.5 **signature verification** through 1.4.0.

Production code uses Forge for PKCS#12/ASN.1 decoding and RSA key/certificate
extraction, then imports the key into native WebCrypto for signing. It does not
call Forge's RSA signature verification or certificate-chain verification.
The tamper regression uses the configured native WebCrypto engine. This is a
call-path assessment, not proof that every Forge behavior is safe. Keep the
advisory visible, re-audit changes, and upgrade when an upstream patch exists.
No audit advisory is suppressed by configuration.

## Release audit, 2026-10-17

The exact 0.5.0 lockfile audit reports one high finding (the unchanged, unpatched
node-forge advisory above, tracked in SDK issue 69) and one moderate finding:
[uuid GHSA-w5hq-g745-h8pq](https://github.com/uuidjs/uuid/security/advisories/GHSA-w5hq-g745-h8pq).
The additional path is root **development** dependency ExcelJS 4.4.0 → uuid 8.3.2;
`pnpm --recursive why uuid` finds no uuid runtime dependency in any of the four
published packages. The advisory affects v3/v5/v6 calls with caller-supplied
output buffers/offsets. The installed ExcelJS source imports only v4 in
`lib/xlsx/xform/sheet/cf-ext/cf-rule-ext-xform.js` and calls it without a buffer.
This call-path assessment does not erase the dependency finding or establish
universal safety. Track compatible development-tool remediation separately;
do not force a major transitive override or suppress audit results in a version PR.

The new response verifier uses Node X509 and native WebCrypto for verification;
it does not add Forge RSA/chain verification to the affected runtime path. Pin
provenance, revocation/distrust and production response acceptance remain separate
from this dependency audit and the synthetic verification tests.

## 0.6.0 release audit recheck

On17 October2026 the exact0.6.0 version-family lockfile was re-audited with
`pnpm audit --json`: one high Forge finding and one moderate development-only
ExcelJS→uuid finding remain, with no critical findings. Dependency versions and
those assessed call paths are unchanged from the0.5.0 release audit above.
The additive exact FE path uses native BigInt and adds no dependency or Forge
RSA verification path. No advisory override, audit suppression, clean-audit
claim or universal safety claim is introduced by the version bump.

## Research and remaining boundaries

- [Node cancellation APIs](https://nodejs.org/download/release/latest-jod/docs/api/globals.html)
- [HTTP replay semantics](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2)
- [OWASP XML security](https://cheatsheetseries.owasp.org/cheatsheets/XML_Security_Cheat_Sheet.html)
- [OWASP XXE prevention](https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html)

No real Hacienda documents are submitted by these offline suites. The sandbox lifecycle test is explicitly opt-in through
HACIENDA_SANDBOX_E2E=1 and pnpm test:sandbox; it uses an operator-supplied invoice
and real sandbox credentials. Live acceptance has not been executed during this
hardening/release-preparation work. XSD checks establish
structure, not signature authenticity; the crypto regression checks integrity
with a self-signed test certificate, not institutional trust.

### Scoped Forge reachability checkpoint

The [SDK 0.6.0 call-path audit](forge-reachability-audit.md) records exact P12,
native signing and pinned response-verification paths, 39 existing passing
regressions and the unchanged runtime audit finding. Issue #69 remains open;
the specific adversarial regression criterion is explicitly uncompleted.

### Optional PKCS#12 parser boundary

Since 2026-10-23 the PKCS#12 parser is an optional peer dependency resolved on
first use. The default install has no parser, so the Forge advisory does not
appear in a non-signing consumer's production audit. The trust boundary is
unchanged: PKCS#12 input remains capped at 1 MiB, RSA keys must be at least 2048
bits, the certificate must be currently valid, and key/certificate must match
before WebCrypto imports the key.

A missing parser is a configuration error, not a fallback: `loadP12` rejects with
a `SigningError` that names the package and install command, and never echoes the
PIN. The packed-consumer check covers both the opt-in signing path and the
no-parser path. Issue #69 remains open; no advisory is suppressed and no
replacement parser is claimed.
