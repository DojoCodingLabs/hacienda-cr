# Current exact FE credit terms and retained source compatibility

Current exact FE inputs require `plazoCredito` for sale conditions 02 and 10. A
present term in any condition must be positive and contain one to five decimal
digits. Valid lexemes such as `00030` remain unchanged through JSON and XML;
there is no Number coercion, 90-day default or silent normalization. Missing,
zero/all-zero, negative, fractional and over-width terms are refused before
current exact arithmetic/XML generation.

Primary source: [Hacienda current v4.4 annex](https://www.hacienda.go.cr/docs/ANEXOS_Y_ESTRUCTURAS_V4.4.pdf),
pages 25 and 70 (Nota 5, footnotes 20, 22 and 24), inspected 2026-10-18 (99 pages; adjustments 22/04/2026), SHA256
`6e093226b29b38c5c8de825f70c1b1cb8ed81e2f4a6eb0b3ff52708fc1eb2769`.
The XSD's optional integer/five-digit shape does not enforce that conditional
business rule or positivity. Native XSD conformance is therefore separate from
current business readiness and from Hacienda acceptance. The name of condition 10
identifies a tax regime, not a universal contractual 90-day account maturity.

Current exact FE also rejects sale conditions 09 and 11 (REP-only) and 13
(FEC-only), as specified by those page 70 footnotes. Other valid FE sale conditions
retain their existing behavior. The shared regular-document enum already rejected
09/11; that denial remains unchanged in current, retained and legacy FE APIs.
Current exact FE now additionally rejects 13. The retained schema/calculator and
legacy Number FE APIs preserve their former acceptance of 13, without authorizing
a new document in the wrong family.

## Current versus historical APIs

`ExactFeInputSchema`, `calculateExactFe` and `buildExactFacturaXml` enforce the
current rule. The existing legacy Number schemas/builders retain their former
behavior intentionally; their unchanged acceptance is not a declaration of
current business compliance. Generic XML signing, transport and historical
custody also remain distinct from current exact FE input validation.

`RetainedExactFeInputSchema` and `calculateRetainedExactFe` are explicitly
read-only compatibility helpers. They preserve the former 0.6–0.8 exact-source
term shape while reusing the same bounded BigInt arithmetic, numeric/schema,
CABYS, ordinary-tax and full-payment checks. They neither verify that an original
was signed/accepted nor establish the truth of its claimed producer. They do not
provide a retained XML builder, signing API, transport path or permissive flag on
the current APIs. A bad historical term must still fail `buildExactFacturaXml`.

A consumer must select these helpers only after independently binding a reviewed
immutable producer tuple and exact original identity/hash/source. Preserve the
actual signed bytes, key, emitted field presence and original term lexeme;
never regenerate, re-sign, silently fill or rewrite an original as a migration.
Source-only arithmetic is not a substitute for byte/hash/native-XSD concordance,
current authorization or institutional-response verification. Keep that
historical selection separate from all fresh signing/submission authority.

The Facturador consumer needs a separately reviewed adoption: align new FE
assessment/mapping for 02/10, allow positive leading-zero terms, version the new
producer rules/proof tuple, and explicitly select retained decoding/calculation
for reviewed historical 0.6/0.7/0.8 bindings. Its old mapper omitted a condition 10
wire field even if an unused payload value existed; do not reconstruct that
omission from a mutable or unused field. Already committed GET/archive recovery
must keep its exact identity and bytes. Fresh NC original eligibility retains its
independent credit-term guard. A receivable's explicit reviewed contractual date
is separate internal accounting evidence, not a repair of fiscal credit days.

## Verification and release boundary

Shared schema and exact-builder tests cover 02/10 missing/zero/all-zero/1/00001/
00030/99999/overflow plus malformed input and unaffected valid other conditions.
Builder tests compare exact totals with Python Decimal and validate valid XML
through native xmllint. Synthetic unsigned historical byte fixtures were produced
by the actual published SDK 0.8.0, with exact integrity/source and SHA256 recorded;
read-only calculation leaves them unchanged while current construction rejects
them. They are not certificate or fiscal-acceptance evidence.

Packed NodeNext/Bundler/ESM consumers exercise the exported current/retained
contracts and maximum financial bounds. No private keys, real records, live
credentials, actual Hacienda request, app adoption or target activation belongs
to this patch. The minor Changeset plans the coordinated linked 0.9.0 family;
versioning, exact artifact review and authorized provenance publication remain
separate release stages. Existing dependency advisories are not suppressed.

## Executed source checks

The complete `pnpm verify` exits 0: all 16 lint/type/build/test tasks pass, with
1465 unit tests passing and four explicitly skipped live-auth tests. All 118
script regressions and actual packed NodeNext/Bundler/ESM/CLI/MCP consumers pass.
The initial credit-term candidate’s `pnpm test:coverage` also exits 0; SDK coverage is 95.31% statements and 90.59%
branches (coverage across other packages is reported separately, not a universal
coverage claim). The subsequent family-guard delta passed a fresh complete `pnpm verify`, including packed consumers; coverage was not rerun for that delta. No real credential/live-test environment was present.

`pnpm audit --json` exits 1 with the existing high node-forge RSA verification
advisory [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv)
and moderate uuid advisory
[GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq).
The registry listed no patched node-forge version at this check. No override,
dependency change, suppression or clean-security assertion follows. These checks
are local source/artifact tests, not a published 0.9.0 release or app adoption.
