# Authenticate Hacienda response XML

## Why

The SDK validates XML structure but cannot yet authenticate an institutional
response. Transport JSON and an embedded certificate are insufficient evidence
for a terminal fiscal decision.

## What changes

Add an offline public verifier with explicit reviewed leaf pins, exact expected
clave/party/amount context, bounded schemas/signature references, native RSA and
safe errors. Preserve separate CA/revocation/institutional provisioning gates.

## Impact

SDK additive API and bundled MensajeHacienda schema; synthetic/native and
installed-consumer tests. No endpoint, live fiscal call, Money change, automatic
trust acquisition or release publication.
