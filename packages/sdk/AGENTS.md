# SDK agent instructions

Read the [root instructions](../../AGENTS.md) first.

## Ownership and contracts

The SDK owns reusable invoicing behavior; CLI and MCP wrap it. Shared owns common
types, Zod schemas, and constants. Keep root and module barrel exports consistent
with public API changes, and verify consumers through `pnpm test:packages`.

Use [migration notes](MIGRATION-v4.4.md), [root migration](../../MIGRATION.md),
and [v4.4 compliance](../../docs/specs/v4.4-compliance.md) when changing document
fields. Update shared types/schemas, relevant builders, fixtures, validation,
and adapter inputs together. Do not invent taxpayer/provider data to satisfy a
required field.

## Domain invariants

- Clave generation uses widths 3/6/12/3/5/2/10/1/8 for country, date, taxpayer,
  branch, POS, document type, sequence, situation, and security code. See
  `src/clave/build-clave.ts` and its tests; preserve leading zeroes.
- Reuse tax rounding helpers. Reconcile gross sales, discounts, net sales,
  taxes, and other charges with detail lines; deduct discounts once.
- XML element order, namespaces, required fields, and document-specific rules
  must conform to the applicable XSD. Cover affected builders and rejection cases.
- `validateDocumentXml` allows unsigned drafts by default. Submission requires
  `{ requireSignature: true }`. XSD signature structure validation does not
  authenticate a signature or establish certificate-chain trust.
- Signing, XML input limits, HTTP response limits, cancellation, and deadlines
  are security boundaries. Preserve them and review the security document before
  changing them. Do not automatically retry an ambiguous document submission.

## Schemas and persistence

Official schemas live in `schemas/`; the SDK build embeds the 2026 set for
runtime validation. Follow [schema provenance](schemas/README.md). Refresh from
recorded official sources and preserve original bytes. Do not edit official
constraints to accommodate invalid output. Review conformance fixtures and the
independent native-xmllint tests when updating schemas.

Sequence increments and resets share a lock and persist via atomic replacement.
Use a temporary `configDir` in tests. Preserve concurrency, overflow, corruption,
and lock-timeout behavior. A timeout must not remove another writer's lock;
confirm no writer is active before any authorized manual recovery.

## Verification

See [testing](../../docs/testing.md). Run focused behavior tests for the module
changed, then `pnpm verify`. Use generated test certificates and mocked HTTP;
live credential tests are a separate, explicitly authorized operation. An offline
suite cannot prove acceptance by Hacienda.
