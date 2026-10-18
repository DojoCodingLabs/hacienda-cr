# Additive exact total credit note for one ordinary FE

Shared exports `ExactNcTotalInputSchema`, `ExactNcTotalReferenceSchema`,
`ExactNcTotalInput` and `ExactNcTotalCalculated`. SDK exports
`calculateExactNcTotal(source)` and `buildExactNotaCreditoTotalXml(source)` plus
the types. Existing 0.6 numeric and exact FE APIs remain unchanged.

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
Original 01 and own NC 03 identities are checked; NC emission cannot precede the
valid original timestamp. Chronology compares exact UTC whole seconds plus every
fractional digit, not millisecond-rounded timestamps; equivalent timezone
offsets compare equally. Original date/fraction lexemes are preserved. The
reference preserves the exact original clave and emission lexeme, type 01 and
code 01. Reason text is not normalized or invented.

NC-only source eligibility rejects sale conditions 09/11 (REP-only), 12 (FE-only)
and 13 (FEC-only), and requires domestic party identification types 01–04,
excluding 05 foreign/special and 06 purchase-issuer-only. Credit conditions 02/10
require explicit positive 1–5-digit credit days. No incompatible original fact
is dropped, replaced or reinterpreted to manufacture an eligible NC; the existing
FE 0.6 schema and builder remain unchanged. Other copied fields are still bound
to the strict original: parties/activities, ordinary CABYS/IVA/transaction and
discount case, positive monetary lines, currency/rate, commercial metadata and
payments. NC permits payment declarations, which do not prove a refund.

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

Unmodified official 2026 NC XSD:
`packages/sdk/schemas/2026/v4.4/NotaCreditoElectronica_V4.4.xsd`, SHA256
`b7ed3347c5599e78e5683d9ae83842695ab9497e173df9cd3be8d77c0851f556`.
Its recorded [official public URL](https://www.hacienda.go.cr/docs/NotaCreditoElectronica_V4.4.xsd)
was downloaded read-only and matched that hash exactly. No schema bytes or
provenance manifest were changed.

`InformacionReferencia` at line 880 has default minOccurs 1/maxOccurs 10. `Numero`
and `Codigo` are optional, and `Razon` optional with maxLength 180 and no
minLength (lines 898–941). This named case deliberately requires exactly one
complete reference. The current official annex adds a business rule requiring
a nonblank reason of 3–180 Unicode codepoints; XSD conformance alone does not
enforce it. Native tests
show empty reason and ten references are structurally admitted, while missing
reference, eleven references and 181-character reasons fail. UTF-16 code units
are not confused with Unicode character count.

Code 01 at line 2886 means cancellation of the referenced document. The unchanged
official base annex PDF SHA256
`2e36bd1101bbcabbb391ab1ec8ffc3773b93031341c7d98a05a5d0f0887d4305`,
Nota 9/page 72 and Nota 10/page 73, corroborates reason 01 and referenced FE type 01.
The existing type 10 catalog comment is corrected without changing enum values.

Current primary business-rule evidence was separately inspected from the
[official 99-page annex](https://www.hacienda.go.cr/docs/ANEXOS_Y_ESTRUCTURAS_V4.4.pdf),
SHA256 `6e093226b29b38c5c8de825f70c1b1cb8ed81e2f4a6eb0b3ff52708fc1eb2769`.
Rendered tables at pages 24/25, 58 and notes 4/5 at 69/70 establish the copied sale,
party, credit-term and reason restrictions above. This newer read-only evidence
does not replace or modify the 98-page vendored PDF or official XSD bytes.

## Mandatory caller reference-age gate

Current annex page 58 requires reference age not exceeding ten years. A
reproducible source builder only knows declared document dates, not a trusted
issuance/submission time. It therefore supplies **no reference-age eligibility**
and has no hidden `Date.now`, accepted-source boolean or fabricated policy.
The application's trusted server must enforce this mandatory gate when issuing
and again before actual submission, alongside accepted immutable source,
previous adjustments and applicable limits. A valid schema, calculated total,
native XSD or builder result must not authorize that operation on its own.

The annex does not define exact anniversary handling of 29 February, leap-year
boundaries, civil-time versus instant-age comparison, or clock/queue grace.
Those operational boundaries require reviewed primary/calendar evidence and
explicit application tests before case activation. No arbitrary 365-day duration,
Feb 28/Mar 1 rollover, or blanket rejection of a valid Feb 29 source is invented by
this API. An unresolved boundary must remain blocked in the caller. Source
chronology still rejects an NC earlier than its reference at full precision.

Rejected-FE replacement remains a separate exact FE-reference slice. Type 10
describes a Hacienda-rejected electronic document; revised 2026 reason 16 means
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
separate review. Do not adopt unpublished source or alter existing 0.6 artifacts.

The initial pre-review candidate passed its then-current gate (1,084 SDK and
235 shared tests), but that historical result did not cover the independent
review findings below and is not the corrected candidate's evidence.

Final corrected verification passed: `pnpm verify` completed format/spec
integrity, lint, types, builds, 1,087 SDK tests, 236 shared, 71 CLI and 47 MCP
tests, 118 script regressions and fresh installed-tarball consumers. Four
existing live-credential tests remained skipped by the offline gate. Focused
checks include three shared chronology/schema tests, ten NC calculator/XML
tests, seven unchanged exact FE tests and two policy-oracle tests. Installed
consumers additionally reject the submillisecond inversion, two-character
reason and NC-inapplicable sale condition. A generated fixture initially lost
regex escapes; an explicit precision-fixture assertion now protects that test.
No version preparation, tag, publication or live fiscal operation was performed.

Independent review of the initial candidate reproduced three business-boundary
gaps despite XSD success: submillisecond chronology, annex reason minimum and
NC-only sale applicability. They were corrected in the source schema with
additional chronology/offset/Unicode/family/credit-term regressions and explicit
trusted-clock age-rule ownership. Native libxml2 also rejects the extreme
`.999999999999999999` fractional-second lexeme at a second boundary; the API
does not round or silently truncate such input. Exact comparator tests preserve
all digits, while positive native checks cover submilliseconds, 18-digit small
fractions and 9-digit midnight boundaries. Actual emitted XML still needs the
applicable runtime validation; source comparison is not fiscal acceptance.
