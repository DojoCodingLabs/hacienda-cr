# Authenticate Hacienda response XML

## Why

The SDK validates XML structure but cannot yet authenticate an institutional
response. Transport JSON and an embedded certificate are insufficient evidence
for a terminal fiscal decision.

Status: implemented and released as v0.5.0 (PR #71/#72); this change now records
the design and trust boundaries.

## What changes

Add an offline public verifier with explicit reviewed leaf pins, exact expected
clave/party/amount context, bounded schemas/signature references, native RSA and
safe errors. Preserve separate CA/revocation/institutional provisioning gates.
Design details: docs/specs/hacienda-response-verification.md.

## Impact

SDK additive API and bundled MensajeHacienda schema; synthetic/native and
installed-consumer tests. No endpoint, live fiscal call, Money change or
automatic trust acquisition. Package release publication (PR #72, v0.5.0) was a
separate operational gate recorded in tasks.md, not part of this change's scope.
