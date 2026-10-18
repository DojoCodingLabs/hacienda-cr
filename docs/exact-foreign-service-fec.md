# Explicit foreign-service ordinary IVA13 FEC source

The additive exports published in [0.10.0](release-0100-published.md) are `ExactFecForeignServiceIva13InputSchema`,
`ExactFecForeignServiceIva13ReferenceSchema`, `ExactFecForeignServiceIva13Input`,
`calculateExactFecForeignServiceIva13` and
`buildExactFacturaCompraForeignServiceIva13Xml`. Their named case is
`FEC-foreign-service-ordinary-iva13-v1`. Selecting this case explicitly declares
ordinary taxable services at IVA13; supplier type 05 never selects the tariff.
The SDK does not establish whether a buyer legally owes tax, has already paid it,
can deduct it, qualifies for reverse charge or is eligible to issue an FEC.

## Actual source facts

The foreign supplier remains XML Emisor with actual name, type 05 identification
(alphanumeric, 1–20 Unicode characters) and real foreign address of 5–300 Unicode
characters. Supplier name is 5–100; optional commercial name 3–80. Actual phone
and email may be provided. No local supplier address, RUT activity or email is
fabricated: unsupported local address/activity fields are rejected, not dropped.
This named source accepts only letter/number identifiers, without trimming or
removing punctuation to manufacture a different actual identifier.

The actual domestic buyer stays Receptor with identity 01–04, location and
activity, and owns the distinct 08 clave/consecutive/signing authority. Headers
are never swapped. Supporting evidence is one actual foreign-provider document
reference: type 16, reason code 11, nonblank number of 1–50, exact timestamp and
reason of 3–180 Unicode characters. It is not a fabricated 50-digit Hacienda key.
Reference chronology compares all accepted fractions/offsets without truncation;
trusted-time legal-age eligibility remains external, without a hidden clock or
invented leap-day policy.

Only conditions 01/02 are in this named case; 02 needs positive one-to-five digit
credit days. Any supplied term must be positive, preserving actual leading-zero
lexemes. Currency CRC/USD, exact service lines (declared services with CABYS
service-prefix classification), quantities, unit prices, ordinary IVA13 and
positive payment allocations remain explicit. Every supplied allocation must
reconcile exactly. Allocation does not prove cash receipt or create a REP.
Unsupported goods, non-service intangible classifications, zero/exempt/non-subject
or other tax regimes, condition 13 and extra eligibility/credit booleans fail
closed instead of silently becoming ordinary services. Real CABYS existence and
tax classification remain separately verified caller facts.

## Primary evidence and separate authority

The [current official annex](https://www.hacienda.go.cr/docs/ANEXOS_Y_ESTRUCTURAS_V4.4.pdf)
(99 pages, SHA256 `6e093226b29b38c5c8de825f70c1b1cb8ed81e2f4a6eb0b3ff52708fc1eb2769`)
pp. 19–22 and Note 4/p. 69 bind foreign supplier 05, its document/address and
actual roles. Reference type 16 is FEC-only and required for that supplier;
Note 9/p. 73 names reason 11 for the non-domiciled provider. Pages 57–58/74
define reference fields, p. 60 buyer signing, p. 56 positive supplied allocations
and Note 8.1/p. 72 the distinct ordinary general 13 tariff. These facts do not
make every foreign acquisition ordinary taxable 13.

The unchanged native FEC XSD SHA256 is
`57e4cedb12d5045884670ff2e4795d2027e69b96d45752f60cd1a1930e2768a3`.
Both native 2024/2026 check the explicit source projection. Audit-only experiments
show contradictory tax and condition/reference hypotheses can also pass XSD;
therefore native validity cannot choose tax treatment or replace caller authority.
See the [research matrix](../openspec/changes/special-fec-primary-contracts/design.md)
for sources, failed primary fetches and unresolved used-goods mapping.

## Preservation and verification boundary

The existing exact monetary-only kernel calculates declared IVA13 source math.
A small internal FEC monetary XML projection is shared; ordinary domestic FEC
headers, references and bytes are unchanged. Its approved prior-source golden
is SHA256 `671159f865148076335177ce4a1fef20a2854ceda098f5fc963215258b701d6c`.
Common purchase field refinements are shared without changing their prior rules
or messages. The general issuer XML helper is not relaxed to bypass a missing
local address. FE/TE/ND/NC/legacy/retained APIs remain separate and unchanged.

Synthetic signing and generic pinned-response tests check mechanics and explicit
caller context. Both declared synthetic response party orders are tested;
neither establishes Hacienda's live FEC response-party oracle. No production
expected-party mapper, trust source or live acceptance claim is introduced.
App eligibility/current policy/proof/allocation/worker/custody/UI and actual
acceptance remain independent gates; no provider, version or activation change.

Supplier 06/condition 13 is still required unfinished work. A dated used-goods
purchase example without charged VAT cannot choose a modern XML no-subject,
exempt, factor or zero-tariff representation automatically. Broader foreign
intangible/mixed-tax cases, recipient lifecycle, REP oracle and SDK #69 also
remain open under SDK #85 before the coherent release is considered complete.

## Executed source checks

Final `pnpm verify` completed successfully on 18 October 2026: shared 247,
SDK 1,149, CLI 75 and MCP 49 unit tests passed (1,520 total; four intentional live
SDK skips), 118 script regressions and actual fresh packed consumers for all
four packages. Formatting/lint/types/build/native-schema provenance also passed.
The focused four-file source/sign/response/golden selection passed 13 tests;
those checks overlap the full counts. Strict OpenSpec and diff checks passed.
The first full run stopped at an interface-style lint rule in the extracted
common source checker; its body was unchanged and the corrected full run passed.
No version, official schema, dependency lock, app/shared resource or cloud change
occurred. Exact-head independent review remains required before merge/release.
