# Additive exact-decimal ordinary FE

This API is additional to `FacturaElectronica`, `buildFacturaXml`,
`calculateLineItemTotals` and `calculateInvoiceSummary`. Those legacy Number
contracts and CLI/MCP adapters are unchanged. It is not the broad unmerged
PR59 monetary rewrite, and no release, tax-case enablement or fiscal call occurs
as part of this implementation.

## Supported source contract

Shared exports `ExactFeInputSchema` and `ExactFeCalculatedSchema` plus their
inferred `ExactFeInput`/`ExactFeCalculated` types. SDK exports
`calculateExactFe(input)` and `buildExactFacturaXml(input)`.

Every input must explicitly name `caseCode: "FE-domestic-ordinary-iva13-v1"`.
This case supports domestic FE parties, explicit service/goods classification,
one ordinary IVA01/tariff08/13% tax per line, positive price/gross/net, existing nonfinancial line metadata,
up to five explicit discounts, sale metadata, declared currency/exchange rate
and up to four completely allocated payment entries. No party, provider,
currency, payment, classification or tax is fabricated/defaulted. CRC requires
an explicit exchange rate equal to1; other currencies retain the supplied
positive rate without automatic conversion or an assertion of official-rate
provenance. Payments must sum exactly to the computed total, including for a
credit sale in this specifically fully allocated contract. Payment allocation
is a declared invoice fact, not proof of collection. Credit requires explicit
days; code99 sale/discount/payment entries require their companion text.

Quantity, price, monetary discount, percentage discount, tax rate, exchange
rate and payment amounts use decimal strings. The only supported tax-rate
lexeme is the explicit string `"13"`. A discount has either `montoDescuento`
or `porcentaje`, never both. Each percentage applies to the line's gross
amount, not a silently assumed sequential discount base. Discount nature is
optional and is omitted when absent. Gift/bonus discount codes01/02/03 are excluded; supported discount codes are04–09 and99. Transaction type may be omitted or explicitly01, never02–13. Declared service/goods classification must match CABYS prefix5–9/0–4 respectively; this does not establish actual CABYS existence or its applicable rate. Unknown root/nested fields, additional
taxes, exonerations, other charges, references, foreign parties and unsupported
regimes fail instead of being projected away. This scope is not all domestic
FE and does not claim independent CABYS or tax-treatment acceptance.

## Precision and rounding

The source is the unchanged vendored official2026
`packages/sdk/schemas/2026/v4.4/FacturaElectronica_V4.4.xsd` and its recorded
schema manifest (FE file SHA256 `926ba81325bc21102755bd8e4e570a63caaca086e680a877c3a6d15d6ee8a62f`). `DecimalDineroType` has totalDigits18, fractionDigits5,
minInclusive0 and maxInclusive9999999999999.99999. Quantity has totalDigits16
and fractionDigits3; the API requires a positive ordinary quantity and supports
the full16-significant-digit range, including16-digit integers. It does not
incorrectly limit quantity to13 integer digits just because three fractional
digits are possible.

Decimal input text is bounded, unsigned, nonexponential and without leading
integer zeroes. Precision beyond the supported field scale is rejected, not
silently rounded. No monetary value passes through Number, `parseFloat`,
`toFixed` or a Money-toNumber conversion. Internal arithmetic uses scaled BigInt:

1. Quantity×unit price is rounded HALF_UP to five monetary decimal places; zero rounded gross is outside this case.
2. Each percentage discount of the gross line amount is independently rounded
   HALF_UP to five places; explicit monetary discounts are already exact.
3. Subtotal is gross minus the sum of discounts; zero or negative net fails. A100% discount or free line needs separate semantics, not automatic zero assumed-tax emission.
4. Ordinary IVA is subtotal×13/100, rounded HALF_UP per line to five places.
5. Aggregates sum the quantized integers without further floating-point steps.

Computed money and rates-of-exchange serialize with five decimal places.
Every line and aggregate output is checked against the monetary bound; a valid
input price does not imply its multiplied/taxed aggregate fits. These are
explicit deterministic calculation semantics for the named case, tested
against an independent Python Decimal oracle; they are not a claim that one
rounding rule settles every special fiscal regime.

## XML and persistence

`calculateExactFe` returns a JSON-safe calculated-lines/summary DTO containing
strings, with no BigInt escaping into JSON. `buildExactFacturaXml` accepts only
source facts, validates identity and recalculates all totals; caller-supplied
computed totals are rejected. Exact strings go directly to the escaping XML
builder. Existing party mappers and identity checks are reused without casting
money into the legacy Number DTO.

Canonical decimal XML means stable SDK field order and exact fixed-decimal
text for the same source, not XMLDSig canonicalization or signed-byte equality.
JSON stringify/parse preserves source and calculated monetary text. The
separate signing/archive workflow must retain first signed bytes.

## Evidence and limits

Focused tests cover JSON/public schema parity, schema-max price and computed
total, full quantity range, minimum fractional amount, half ties at all three
rounding boundaries, amount/percentage discounts, mixed services/goods,
currency/payments and coercion/unsupported/overflow failures. Thirty-six mixed
cases are compared against native Python Decimal with precision90 and
ROUND_HALF_UP. Native xmllint validates generated unsigned XML with only a
schema-valid signature placeholder; this is structural conformance, not
cryptographic authenticity or Hacienda acceptance. Python3 and xmllint are
required for these independent checks.

Fresh packed consumers check native ESM exports, strict NodeNext/Bundler types,
JSON roundtrip and exact maximum XML through installed package bytes. No local
workspace import may substitute for that check. Publication/adoption and
application immutable schema/version/case attestations remain separate review
steps; independent fiscal acceptance and operational signing authority remain
required before any external activation.

## Local verification checkpoint

On17 October2026, `pnpm verify` passed the complete repository format,
spec-integrity, lint, types, build, offline package tests,118 script regressions
and fresh installed-tarball consumers (native ESM and strict NodeNext/Bundler).
Four existing live-credential tests remained skipped by the offline gate.
Final focused exact tests passed: three shared schema checks and six SDK tests,
including independent Python Decimal, native2026 XSD, explicit code99 companion
and split-payment/credit metadata. A final test-only addition was rechecked with
SDK lint/types and its focused suite, without repeating unrelated suites.

During development, the first full check caught repository lint violations;
these were fixed rather than suppressed. A new negative fixture initially
aliased an existing issuer object, contaminating a later assertion; fixture
cloning fixed that setup failure. Invalid-string safeParse handling was also
hardened before final verification. No skip or fiscal assertion was weakened.
No release/tag, registry publication, real credential, fiscal network, shared
application database or server port was used.

## Ordinary-case fiscal scope review

Primary source: the unchanged vendored official annex PDF
`packages/sdk/schemas/2024/v4.4/ANEXOS Y ESTRUCTURAS_V4.4.pdf`, SHA256
`2e36bd1101bbcabbb391ab1ec8ffc3773b93031341c7d98a05a5d0f0887d4305`. Its pages50–52 classify
services by CABYS5–9 and goods by0–4; the exact input schema rejects a conflicting
`esServicio` declaration instead of silently putting an amount into the wrong
summary category. This is classification consistency, not full catalog lookup.

Nota22/page81 identifies transaction01 as normal sale and the remaining codes
as special/self-consumption/capital/free-transfer cases. Nota20/page80 identifies
01/02/03 discounts as gifts/bonuses, and page46 describes issuer-assumed tax for
relevant gifts/bonuses and factory-tax cases. Those situations cannot safely
reuse this case's net-based IVA and zero assumed-tax field. They are explicitly
excluded, including zero price, rounded-zero gross and zero/negative net. The
builder never guesses their taxable base or issuer-assumed tax. Legacy numeric
APIs are unchanged; the application ordinary mapper needs its own matching
reviewed boundary when adopting this API.

Maximum-money XML proof now uses a positive0.001 quantity with the exact maximum
unit price; maximum quantity uses positive0.00001 unit price. No accepted maximum
fixture relies on a100% gift discount or a free line. Seven SDK focused tests
and three shared tests cover normal transaction omission/01, every special
transaction02–13, gift/bonus01–03, zero cases and both CABYS mismatch directions.

After the ordinary-case scope review, the complete `pnpm verify` passed again:
1076 SDK,233 shared,71 CLI and47 MCP tests passed, with the same four live
credential skips,118 script regressions and fresh installed consumer checks.
The final supported maximum fixtures remain exact and native-XSD-valid under
the positive-price/net restrictions. No fiscal rule was added for the excluded
special/free transactions.
