# Exact ordinary domestic FEC (unreleased source candidate)

The additive source exports are `ExactFecInputSchema`, `ExactFecReferenceSchema`,
`ExactFecInput` and `ExactFecCalculated`; SDK exports are `calculateExactFec` and
`buildExactFacturaCompraXml`. This is one source slice of [SDK #85](https://github.com/DojoCodingLabs/hacienda-cr/issues/85),
not complete FEC coverage or a published package version.

The named case `FEC-domestic-ordinary-iva13-v1` requires real domestic supplier
and buyer identities 01–04. The supplier remains XML Emisor; the buyer remains
Receptor and owns the 08 clave/consecutive and signing authority. Do not swap
headers or supply fictitious parties. Supplier activity is optional; actual buyer
activity is required. Supplier email may be absent under native FEC/annex p.22;
there is no fallback email. Issuer names 5–100, receiver 3–100 and supplied
commercial names 3–80 count Unicode characters without trim/normalization.

Only conditions 01/02 are supported by this first API ; 02 requires positive 1–5
digit credit days, preserving lexemes such as 00030. Any supplied term must be
positive. This is a deliberate case restriction, not a claim that native FEC
prohibits every other condition. CRC/USD and explicit ordinary IVA13 lines are
calculated independently by the existing BigInt monetary-only kernel. Each
payment allocation is positive and their sum must equal the exact total. An
allocation does not establish a cash receipt. Caller totals/Number amounts,
foreign/special/non-subject/exempt/exonerated/assumed/factory tax, gifts/free lines
and unsupported transactions are rejected, not converted to ordinary 13.

The FEC projection uses its own native tree, omitting the FE-only line element
`ImpuestoAsumidoEmisorFabrica`. Existing FE/TE/ND/NC/current/retained math, XML,
errors and legacy Number APIs remain unchanged. The common actual-party XML
helper's internal input type permits FEC's absent supplier email; existing family
schemas continue to govern their own email requirements and outputs.

## Supporting references and independent eligibility

Require 1..10 unique actual supporting tuples: type 06 Contract, 07 Procedure,
14 document from special-regime taxpayer or 99 Other; code 04 “Reference to another
document”, real nonblank number 1–50, emission timestamp and reason 3–180 Unicode
characters. Type 99 requires an additional 5–100 character document-type description;
that companion is rejected on other types. No invented 50-digit reference clave,
default number or evidence is generated. Exact chronology preserves all accepted
fractional digits and rejects declared future evidence. Actual 10-year
issuance/submission eligibility needs a separate reviewed trusted-calendar policy;
there is no Date.now or implicit age approval in reproducible source calculation.

This reference subset does not declare all other FEC references illegal; it
limits this named evidence-documentation case. It does not implement cancellation,
replacement, contingency, foreign-provider processing or FEC corrections.

Supplier 05 is a separate foreign-service/intangible case requiring reference 16.
Supplier 06 is limited to used goods from a non-contributor with sale condition 13.
Both remain explicitly unsupported and required backlog work. Condition 13 does
not automatically establish zero/exempt/non-subject/13% tax treatment. Source
syntax cannot establish supplier qualification, fiscal regime, VAT liability,
exigibility/tax period, credit deductibility, legal age or Hacienda acceptance.
The app must keep these eligibility gates closed until separately reviewed.

## Primary evidence

See the full field matrix in
[OpenSpec design](../openspec/changes/add-exact-domestic-fec/design.md).
The [current official 99-page annex](https://www.hacienda.go.cr/docs/ANEXOS_Y_ESTRUCTURAS_V4.4.pdf)
SHA256 is `6e093226b29b38c5c8de825f70c1b1cb8ed81e2f4a6eb0b3ff52708fc1eb2769`:
pp. 18–25 cover activities/parties/terms, p. 56 positive supplied allocations,
pp. 57–58 required references, p. 60 buyer signing, pp. 69–70 supplier 05/06 and
condition 13, Nota 9/p. 73 reference 04 and Nota 10/p. 74 reference types/companions.
The unchanged current native FEC XSD SHA256 is
`57e4cedb12d5045884670ff2e4795d2027e69b96d45752f60cd1a1930e2768a3`.
Official vendor bytes are never edited to accommodate output.

## Response protocol and release gates

Synthetic signing validates XML mechanics with a caller-selected synthetic buyer
credential; it cannot prove real certificate ownership/authority. The pinned
response test exercises generic explicit context binding with two declared
synthetic party orders. **Neither order establishes Hacienda's live FEC response
party mapping.** No production expected-party helper is added from a fixture.
The actual FEC response oracle, reviewed trust pins and real acceptance remain
separate app gates; the verifier does not invent a signed currency field.

CLI/MCP exact wrappers, proof/allocation/worker/original custody/PDF/accountant/
delivery/UI integration and full remaining FEC cases remain open. SDK #69's Forge
advisory is an independent unresolved security prerequisite. No release, target,
provider, cloud or app activation is authorized by source conformance tests.

## Executed verification

Full `pnpm verify` completed with exit 0: shared 246, SDK 1,127, CLI 75 and MCP 49
unit tests passed (1,497 total); four live credential tests intentionally skipped.
All 118 script regressions and fresh installed consumers of all four packed
packages passed, including public FEC TypeScript/runtime imports and native XML.
Formatting, lint, types, builds and source manifest checks passed. Strict OpenSpec
also passed. Log: `/private/tmp/sdk-fec-verify.log`; focused 7 native/Decimal/
response/published 0.9 compatibility tests: `/private/tmp/sdk-fec-focused.log`.
Node 26.8.2, pinned pnpm 9.15.4 and native xmllint/Python were available.

Initial focused assertions assumed compact pretty-printed XML and looked for an
identity detail in the top-level exception; they were corrected without changing
the identity validator. An initial typecheck found an unrelated-condition branch
left in the new dedicated projection; it was removed because this named schema
cannot admit condition 99. An initial offline install lacked a cached package;
the exact frozen lockfile was installed from the registry, with no dependency
changes. Those diagnostic runs are not counted as passing verification. Independent
exact-head source review, coherent release and app gates remain pending.

## Independent source review

Root reviewed exact `e7c4fdc70eabb2071d47195b445502f5fb2f2ae5`: primary reference/companion matrix, actual supplier/buyer and buyer-owned 08 identity, strict new source schema, independent monetary calculation, dedicated FEC field order without the FE-only assumed-tax node, optional supplier email type boundary, exports and caller responsibilities. A separate four-file run passed 12 tests covering native FEC/signing, exact amounts, party bounds, generic explicit response contexts and published FE/NC byte/math compatibility (`/private/tmp/root-sdk-fec-review-tests.log`). No source integration blocker remains for this named case. Supplier eligibility, special FEC cases, live response-party oracle and all release/app activation gates remain open.
