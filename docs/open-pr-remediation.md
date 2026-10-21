# Open PR remediation — 2026-10-21

Based on published 0.11.0 (`12a2fed`). This change consolidates the useful work of
12 pending PRs after reviewing contracts, actual code and adversarial examples.
Legacy Number APIs and the four-package public release boundary are preserved.
No live credentials, submissions, customer records or user configuration are used.

## Disposition map

| PR          | Retained and corrected work                                                                                                                                                                                                                                                                                     |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #57         | Catalog generation, frozen export parity and regeneration gate. The blanket digit-literal lint is removed; it cannot distinguish a code from an ordinary number. Curated catalogs and aliases remain explicit.                                                                                                  |
| #58         | Historical conformity report, with the old “current main” section dated and linked to this reconciliation. Historical hashes/citations are not rewritten.                                                                                                                                                       |
| #59         | Offline PDF-policy digest check and weekly drift schedule, included once. This proves vendored consistency, not current institutional acceptance.                                                                                                                                                               |
| #98 / #104  | One private loopback transport simulator. Responses are synthetic, with consistent keys, no invented Codigo XSD element, no claimed sandbox provenance, destructive recording projection and no redirect-following callbacks. No fifth npm publication is implied.                                              |
| #99         | Opt-in bounded shared decimal text, explicit Number conversion and independent property oracle. Variable-scale parsing now enforces grammar, bounds and scale; the SDK arithmetic kernel remains internal.                                                                                                      |
| #100        | A concise planning-status contract, preserving a link to the complete proposal history rather than importing 12,854 lines as implemented authority.                                                                                                                                                             |
| #101        | Property generation, golden bytes and a strict inverse of supported unsigned legacy-builder XML. Unknown fields/namespace, alternate serialization, signed input and lossy Number conversion are rejected; specific-tax factors are preserved. It is not a general received-document importer.                  |
| #102        | Native pinned document verifier with policy bound to referenced SignedProperties, invalid-clock rejection and independent libxml2/OpenSSL comparisons. The signer keeps its generated Id/Target consistent. Optional external checks are explicit injected implementations, not environment-triggered binaries. |
| #103        | Bounded hostile XML and secret-output regressions; separate mutation workflow with native tools, built workspace dependencies, offline environment and an explicit 45% initial regression floor. This percentage is not proof of security.                                                                      |
| #106 / #108 | One corrected set of calendar, delivery and issuance contracts. The two PRs shared a head and were not independent changes. See operational limits below.                                                                                                                                                       |

## Trust and precision

Signature, XSD, identity, API state and fiscal acceptance remain separate facts.
The document verifier requires a reviewed leaf pin, the signed policy reference
and the matching QualifyingProperties Target. It neither validates CA trust nor
revocation nor asserts Hacienda acceptance. Historical signatures with the old
mismatched Target fail this stricter new EPES check; do not mutate historical
fiscal records to force them through.

The legacy XML inverse deliberately accepts only bytes it can reconstruct without
loss through the corresponding legacy builder. Use exact APIs and raw source bytes
for financial values outside Number precision. Passing the inverse does not
establish authenticity or fiscal acceptance.

## Calendar boundary

The embedded 2026 civil calendar is transcribed from the preserved official MTSS
CARTA-MTSS-DAJ-AER-1076-2025 PDF, page 1. All twelve dates remain on their listed
calendar dates. No Monday transfers or 2027–2030 dates are invented. Civil instants
are converted to America/Costa_Rica; malformed dates/counts and unreviewed years
fail explicitly, including a zero-day calculation. Returned data is copied.

This does not establish exceptional administrative closures, the legal start event
or legal infringement. A contingency deadline cannot be inferred from generation.
The returned Date is a civil-date carrier at noon UTC, not a legal expiry instant.
The calculation helper leaves the deadline day available; callers must establish
which deadline rule actually applies.

## Persistence and recovery

`assignSequenceWithDocument(type, build, {configDir, branch, pos})` holds the same
process lock as legacy sequence increments and resets. The callback builds and
signs locally for the reserved number; it must not call sequence APIs or send
network requests. Before commit, the SDK checks XSD/signature structure and binds
XML identity, metadata, type, branch, POS and consecutive. This does not authenticate
the signature; use reviewed pins when authentication is required.

All writers of an upgraded config directory must use the new SDK. Older binaries
only understand flat counters and must not share it. Back up local state before
deliberate adoption; no automatic downgrade, replay or counter reset is performed.

The canonical `sequences.json` becomes a versioned ledger containing counters and
immutable issued document bytes in one replacement. Legacy files are read under
the lock; legacy increments preserve ledger records. A failed builder leaves the
counter unchanged. After durable commit, a sequence cannot be reused by reset;
a discard only adds an audit reason, never deletes bytes or cancels at Hacienda.
`getAssignedDocument` returns original issuance bytes, not current delivery truth.

The local file implementation uses mode 0600, file fsync, rename and directory
fsync before acknowledgement. Guarantees cover process interruption and local
POSIX filesystem semantics; network filesystems, hardware controllers and power
loss are not certified. Tests include independent processes and SIGKILL after
commit. If a process dies while holding a lock, timeout does not steal it. An
operator must establish that no writer is alive before removing that isolated
lock directory and inspecting the canonical ledger. No automatic counter reset.

`FileDocumentStore` binds immutable bytes per clave and serializes state changes
with a process lock and compare-and-set. Corrupt files and state conflicts are
reported, not ignored. Cleanup is opt-in and never deletes unresolved documents.
The issuance ledger is authoritative for the original bytes; a delivery-store copy
can be reconstructed from it without allocating a new consecutive.

Persistent `submitAndWait` requires an explicit store. It persists bytes and intent
before POST, polls through intermediate API states, and reads response XML as XML.
After a failed or interrupted POST, the stored intent remains ambiguous. Resume
queries the same clave and does not POST again; a 404 is not permission to replay.
The caller must reconcile institutional status before any deliberate new send.
HTTP errors, lost responses, 409/429 and `procesando` are not fiscal rejection.
Only observed accepted/rejected states become those persisted terminal states;
response authentication still belongs to the pinned response verifier.

## Evidence

Regressions cover unsigned-policy insertion, invalid clocks, actual signed corpus
under native oracles, precision/namespace/field loss, official dates and installed
calendar data, concurrent store CAS, immutable bytes, actual XML status polling,
ambiguous delivery without replay, unified legacy/new counters and process recovery.
`pnpm verify` checks source, generated catalogs and fresh packed consumers; mutation
runs separately. The private mock's source tests use only loopback.

This is source preparation. The current published release remains 0.11.0 until a
separate version/tag/publication is verified. No source test proves live Hacienda
acceptance or authorizes application activation.
