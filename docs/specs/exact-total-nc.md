# Additive exact total credit note for one ordinary FE

Shared exports `ExactNcTotalInputSchema`, `ExactNcTotalReferenceSchema`,
`ExactNcTotalInput` and `ExactNcTotalCalculated`. SDK exports
`calculateExactNcTotal(source)` and `buildExactNotaCreditoTotalXml(source)` plus
the types. Existing0.6 numeric and exact FE APIs remain unchanged.

## Source-only contract

```ts
const credit = {
  caseCode: "NC-domestic-ordinary-fe-total-iva13-v1",
  original, // One unchanged strict ExactFeInput from the frozen original FE.
  clave: ncClave,
  numeroConsecutivo: ncConsecutive,
  fechaEmision: ncEmissionWithTimezone,
  informacionReferencia: [
    {
      tipoDoc: "01",
      numero: original.clave,
      fechaEmision: original.fechaEmision,
      codigo: "01",
      razon: "Anulación total solicitada",
    },
  ],
};
```

The original is the sole source of parties, activities, source lines, discounts,
currency/exchange rate, sale metadata and fully allocated payment facts. It must
satisfy the existing strict ordinary IVA13 FE case, further restricted here to
CRC/USD. No independent NC amounts/lines/party overrides, computed totals,
negative money, inferred refund, partial credit or unknown fields are accepted.
Original01 and own NC03 identities are checked; NC emission cannot precede the
valid original timestamp. The reference preserves the exact original clave and
emission lexeme, type01 and code01. Reason text is not normalized or invented.

Calculation reuses existing scaled-BigInt FE arithmetic and five-place HALF_UP
boundaries; the positive credit magnitude equals the full original calculation.
Financial JSON/XML values remain strings. Accounting sign/ledger application is
the caller's job. The internal XML projection is shared with exact FE while
retaining its output/order; no public calculated-input builder is introduced.

Applications independently prove original immutable source/hash/version,
trusted accepted evidence, authorization, previous credits, idempotency and
durable first-byte/attempt state. The SDK cannot prove acceptance, unused credit
authority or a refund, and accepts no boolean asserting those facts.

## Primary evidence and deliberately narrow constraints

Unmodified official2026 NC XSD:
`packages/sdk/schemas/2026/v4.4/NotaCreditoElectronica_V4.4.xsd`, SHA256
`b7ed3347c5599e78e5683d9ae83842695ab9497e173df9cd3be8d77c0851f556`.
Its recorded [official public URL](https://www.hacienda.go.cr/docs/NotaCreditoElectronica_V4.4.xsd)
was downloaded read-only and matched that hash exactly. No schema bytes or
provenance manifest were changed.

`InformacionReferencia` at line880 has default minOccurs1/maxOccurs10. `Numero`
and `Codigo` are optional, and `Razon` optional with maxLength180 and no
minLength (lines898–941). This named case deliberately requires exactly one
complete reference and a nonblank reason of1–180 Unicode codepoints. These are
additional API case constraints, not invented XSD requirements. Native tests
show empty reason and ten references are structurally admitted, while missing
reference, eleven references and181-character reasons fail. UTF16 code units
are not confused with Unicode character count.

Code01 at line2886 means cancellation of the referenced document. The unchanged
official base annex PDF SHA256
`2e36bd1101bbcabbb391ab1ec8ffc3773b93031341c7d98a05a5d0f0887d4305`,
Nota9/page72 and Nota10/page73, corroborates reason01 and referenced FE type01.
The existing type10 catalog comment is corrected without changing enum values.

Rejected-FE replacement remains a separate exact FE-reference slice. Type10
describes a Hacienda-rejected electronic document; revised2026 reason16 means
replacement of a rejected document. That operation needs independent immutable
rejected-source evidence; it is not cancellation of an accepted FE through this
NC case. No ND, replacement, gift/free regime, exoneration or other family is
inferred. Schema applicability, legal eligibility and Hacienda acceptance remain
separate review/activation gates.

## Verification and release

Tests cover strict references/source equality, identities/dates, JSON roundtrip,
immutability, unsupported/coerced input, CRC/USD,16-digit quantities, maximum
money and independent Python Decimal rounding. Native xmllint checks official
NC XSD, actual synthetic signed NC and reference/reason edges. The existing
libxml2/OpenSSL oracle verifies the legitimate NC document/properties digests
and RSA signature. No adversarial signature-construction fixture is added.

Fresh packed ESM and strict NodeNext/Bundler consumers exercise exported schema,
calculator, maximum-money XML and synthetic signing/offline XSD with no workspace
fallback. Local cryptographic/XSD evidence does not establish institutional
trust or fiscal acceptance. A minor Changeset records additive shared/SDK
behavior; linked version preparation, release/tag and publication require
separate review. Do not adopt unpublished source or alter existing0.6 artifacts.

Local verification passed: `pnpm verify` completed format/spec integrity, lint,
types, builds,1084 SDK tests,235 shared,71 CLI and47 MCP tests,118 script
regressions and fresh installed-tarball consumers. The four existing
live-credential tests remained skipped by the offline gate. Focused checks
include two shared NC schema tests, seven NC calculator/XML tests, the existing
seven exact FE tests and two policy-oracle tests. An initial test imported the
runtime validator from the wrong internal module and a full gate caught
test-only non-null assertions; both were corrected without suppressions or
weakened assertions. No version preparation, tag, publication or live fiscal
operation was performed.
