# Architecture

Hacienda CR exposes one domain implementation through a library and two adapters.
All four packages are ESM TypeScript targeting Node.js 22+.

| Package        | Owns                                                   | Workspace dependencies |
| -------------- | ------------------------------------------------------ | ---------------------- |
| `shared`       | Common types, Zod schemas, enums, constants            | None                   |
| `packages/sdk` | Auth, clave, taxes, XML, signing, state, HTTP          | shared                 |
| `packages/cli` | Command arguments, files, text/JSON output, exit codes | SDK, shared            |
| `packages/mcp` | Tool/resource schemas, responses, stdio transport      | SDK, shared            |

CLI and MCP are sibling adapters. Put domain rules in the SDK or shared so both
adapters use the same behavior. Root and module barrels define public exports;
workspace consumers resolve package `dist` artifacts. Turbo handles build order.

## Document lifecycle

1. Validate typed input with shared schemas and applicable business rules.
2. Calculate line totals and summaries with SDK tax helpers; assign a unique
   clave/consecutive number using the appropriate sequence management.
3. Build the document-specific XML and validate its structure against the
   bundled official XSD. Unsigned drafts may omit a signature.
4. Sign with the taxpayer PKCS#12 key/certificate. Validate signed XML with
   the signature required before submission.
5. Submit the Base64 signed document through the authenticated HTTP client.
6. Poll by clave until accepted, rejected, canceled, or timed out. A successful
   HTTP submission is not final acceptance.

The CLI submit command coordinates validation, signing, submission, and polling.
MCP `create_invoice` stops at unsigned XML while consuming a persisted sequence;
`draft_invoice` supplies a template. SDK callers compose the stages themselves.
`submitAndWait` submits and polls an already prepared request; it does not sign.

Input validation, XSD conformance, cryptographic authenticity, certificate trust,
and Hacienda acceptance are separate guarantees. See
[security boundaries](security-hardening.md) and [migration notes](../packages/sdk/MIGRATION-v4.4.md)
for limits, retries, cancellation, and deadlines.

## Configuration and schemas

Profiles and sequences default to `~/.hacienda-cr`. Secrets are provided separately
through environment variables; `.env` is not automatically loaded by the SDK.
Tests use temporary directories and synthetic data. Sequence locking protects
increments and resets; ambiguous network failures require checking status with
the original clave before resubmitting.

The SDK vendors official XSDs in `packages/sdk/schemas` and embeds the 2026 set
at build time. Runtime validation uses WASM; independent conformance tests use
native xmllint. See [schema provenance](../packages/sdk/schemas/README.md) and
[v4.4 compliance](specs/v4.4-compliance.md) before changing document structures.

For development, read [testing](testing.md), [contributing](../CONTRIBUTING.md),
and the relevant package AGENTS.md. Publishing uses the separate
[release runbook](releasing.md).
