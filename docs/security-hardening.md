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
