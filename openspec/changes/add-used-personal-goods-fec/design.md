# Explicit non-subject personal-used-goods FEC proposal

Approved implementation design, 2026-10-18, SDK base43feefa. No version, app or activation changes.
No live account, submission, shared DB, callback or tax-status query. Existing
ordinary/foreign FEC and FE/TE/ND/NC APIs remain unchanged. SDK85 stays open.

## Economic case and primary chain

Proposed first named case: a domestic buyer acquires actual used personal goods
from an actual non-contributor through a nonhabitual personal-property disposal,
independently classified as non-subject to IVA with no input VAT credit. It is
not a producer for every supplier 06 purchase, registered used-goods resale,
imports, transformed goods, vehicles, services, investment-property transfers,
or any exemption/other levy. Choosing the API is a caller declaration of this
case, not proof of qualification or a substitute for current app authority.

The following evidence supports a reviewable encoding; it does not establish
that a particular customer/source satisfies the economic facts:

- [Current Hacienda annex](https://www.hacienda.go.cr/docs/ANEXOS_Y_ESTRUCTURAS_V4.4.pdf),
  99 pages, SHA256 `6e093226b29b38c5c8de825f70c1b1cb8ed81e2f4a6eb0b3ff52708fc1eb2769`:
  p. 69 Nota 4 footnote 18 restricts supplier 06 to FEC acquisitions of used goods
  from a non-contributor, condition 13. p. 70 Nota 5 footnote 24 says the buyer uses
  this purchase to support accounting. Those are identity/purpose rules, not a
  universal tax-rate rule.
- [Hacienda worked used-goods presentation](https://www.hacienda.go.cr/docs/IVAenBienesUsados28_7_21.pdf),
  dated 30 July 2021, 20 pages, SHA256
  `ac8a806d4bc60a5786c200f76ed17965683faee3adebebf6109a6a846c7253ec`:
  pp. 9–10 separately show a retired individual's personal TV acquisition at 80000,
  zero IVA / 80000 total, followed by resale 100000 with 2600 IVA on 20000 margin.
  This supports the acquisition-versus-resale distinction; it does not itself
  prescribe modern tariff codes or prove all used sellers non-subject.
- LIVA Article 2 habitual-sale rule is reproduced in the primary
  [PGR 2025 legal analysis](https://www.pgrweb.go.cr/DOCS/DICTAMENES/1/P/J/2020-2029/2025-2029/2025/173420.HTML):
  habitual commercial sale by a taxpayer is the general taxable event. The
  proposed nonhabitual personal-property case is a deliberate bounded selection;
  unregistered habitual merchants cannot be reclassified automatically as
  non-contributors. This source is not a used-FEC XML ruling.
- [LIVA Article 31, latest indexed version 3/3](https://sinalevi.go.cr/ResultadosNormativa/Informacion?param1=32526&param2=141080&param3=3&param4=147828)
  and [RLIVA Articles 51–55](https://sinalevi.go.cr/ResultadosNormativa/Informacion?param1=88953&param2=144903&param3=1&param4=)
  establish the _reseller's_ optional regime and net/margin methods. Current
  indexed text was inspected; direct retrieval was403 and the web-open document
  only exposed navigation. Do not describe a complete fresh consolidated
  download as verified. In particular, the purchase case must not calculate a
  reseller's later margin or factor.
- Fresh [Hacienda v4.4 March 2025 presentation](https://www.hacienda.go.cr/docs/ComprobantesElectronicos-GeneralidadesyVersion4.4.marzo2025.pdf),
  SHA256 `632e42dbc1a1d1da74873a0505b51042d1e90214ade3c7895b819f1c90a6f1de`,
  confirms supplier 06 FEC use for used-goods acquisitions and required actual
  reference. It contains no worked used-FEC tax-node/summary example.

This is a primary-rule synthesis, not a claim that Hacienda published this exact
XML example. Root reviewed and approved this named economic boundary before implementation;
final source review remains required.

## Current XML mapping once this non-subject case is selected

| Area                 | Concrete bounded contract                                                                                                                                                                                                                                                                                      | Primary basis / limit                                                                                                                                                                                                                                                          |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Identity and signing | Buyer owns actual 08 clave/consecutive and signs. XML Emisor is actual supplier 06; Receptor is actual buyer 01–04 with location/activity. No header swap.                                                                                                                                                     | Annex pp. 19–22/60/69; actual signer/qualification external.                                                                                                                                                                                                                   |
| Supplier facts       | Actual alphanumeric ID 1–20, name 5–100 Unicode, supplied commercial 3–80; actual known local location optional, no invented address or taxpayer activity. Foreign-address field forbidden.                                                                                                                    | Supplier06 native/annex exceptions.                                                                                                                                                                                                                                            |
| Sale condition       | Literal 13; no automatic cash-received or credit maturity conclusion. Do not emit PlazoCredito: condition 13 cannot be rewritten 02 and no day term is invented.                                                                                                                                               | Nota 5, pp. 25/70; positive 02/10 requirement is separate. A contractual due date belongs to the caller's accounting policy, not this XML case.                                                                                                                                |
| Lines                | Actual used tangible goods only, CABYS first digit 0–4, declared goods classification, unit/description/positive exact quantity and price. Ordinary commercial discounts are supported. This slice excludes services, surtidos, gifts/bonuses, other charges, factory tax, exonerations and additional levies. | Avoid unsupported regime and no borrowed 13% core. These exclusions are named-case limits, not claims of full FEC coverage.                                                                                                                                                    |
| Tax node             | Required Impuesto: Codigo **01** (IVA), CodigoTarifaIVA **11**, Tarifa 0, Monto 0; ImpuestoNeto 0. No factor or exoneration node.                                                                                                                                                                              | p. 37 mandatory Impuesto, p. 38 IVA code/tariff consistency, Nota 8 IVA 01, Nota 8.1 tariff 11 explicitly non-subject/no-credit. It is not tariff 01 full-credit0%, tariff 10 exemption, tax 07 special base or tax 08 used-resale factor.                                     |
| Base field           | Native-required BaseImponible holds the exact line subtotal for this bounded ordinary-discount source; it does not establish legally taxable turnover or create IVA.                                                                                                                                           | Native FEC field requirement and p. 37 source-base rule. No editable reseller margin.                                                                                                                                                                                          |
| Line money           | MontoTotal=round5(quantity×unit price), SubTotal=MontoTotal−ordinary discounts, MontoTotalLinea=SubTotal. All exact strings and current maximum 18,5 bounds.                                                                                                                                                   | Existing quantization primitives; independent Decimal oracle required.                                                                                                                                                                                                         |
| Summary              | TotalMercNoSujeta=sum line MontoTotal; TotalNoSujeto=same; TotalVenta=same; TotalVentaNeta=same; total IVA 0, TotalComprobante=same. No amount in gravado/exento/exonerado/service buckets.                                                                                                                    | p. 52 goods CABYS 0–4 with tariff 11 → TotalMercNoSujeta; p. 53 aggregates. Optional zero buckets may be omitted consistently.                                                                                                                                                 |
| Tax breakdown        | If emitted, exact Codigo 01 / CodigoTarifaIVA 11 / TotalMontoImpuesto 0; TotalImpuesto 0. No credit inference from these source facts.                                                                                                                                                                         | p. 54 aggregation; all entries agree with line tax.                                                                                                                                                                                                                            |
| Payment fields       | Actual selected method entries, every supplied allocation positive exact amount, sum equals source total, preserve lexemes. No claim of cash receipt or statutory due date.                                                                                                                                    | Annex pp. 55–56/source payment contract; no default payment invented for condition 13.                                                                                                                                                                                         |
| Supporting reference | 1–10 actual references, first scope types 06 contract, 07 procedure, 99 other, reason 04. Actual number 1–50/date/nonblank reason 3–180 Unicode. 99 requires real type description 5–100. Preserve full fractional chronology.                                                                                 | pp. 57–58 and Nota 9/10 pp. 73–74. Supplier06 is not a registered special-regime contributor, so type 14 is excluded from this named case; 16 / reason 11 belongs to foreign supplier 05. No fabricated source clave/date/evidence. Legal age/eligibility remains caller gate. |
| Currency             | CRC with exact exchange 1, or USD with actual positive exact exchange. No automatic FX conversion or invented official rate.                                                                                                                                                                                   | Existing scoped exact FEC currency contract.                                                                                                                                                                                                                                   |

The summary is deliberately different from the earlier research's zero-tax
native-valid counterexample, which retained a _gravado_ bucket. That earlier
counterexample demonstrated XSD weakness, not an acceptable source projection.

## Suggested additive public surface

`ExactFecUsedPersonalGoodsNonSubjectInputSchema`,
`ExactFecUsedPersonalGoodsNonSubjectInput` and a specifically typed calculated
result; `calculateExactFecUsedPersonalGoodsNonSubject` and
`buildExactFacturaCompraUsedPersonalGoodsNonSubjectXml`.

Discriminator: `FEC-used-personal-goods-non-subject-v1`. Never add a permissive
flag to the IVA13 APIs or relabel an existing producer. No eligibility boolean,
caller totals, caller tax/summary overrides, resale price, acquisition-credit
claim or source-current authority token. Reuse exact parse/round/limit primitives
and safe header/reference projection; do not create a dummy taxable source to
calculate zero tax. Existing ordinary/foreign output goldens must stay identical.

## Reproducible shape probe and required implementation tests

The private audit-only native probe used the owned 55046ffa SDK build and
unchanged native helper. Its corrected non-subject summary passed both generations,
an incorrect gravado summary also passed, and missing mandatory tax node failed.
These are schema-shape observations, not an eligibility oracle. No production
validator or signing authority was added by that probe. The committed source
regression is reproducible with:

```sh
pnpm --filter @dojocoding/hacienda-sdk exec vitest run src/documents/exact-fec-used-personal.spec.ts src/signing/exact-fec-used-personal-response.spec.ts
```

Before a source PR: independent Python Decimal multi-line/max/fraction/FX totals;
explicit correct no-subject buckets/tariff 11 assertions; negative wrong supplier,
condition, CABYS/service, reference 14/16 / reason 11, future reference, taxable/exempt
or factor override, zero payment, wrong sum, Unicode/native bounds, mixed regimes;
current/base native validation and legitimate buyer-key signing; existing FEC
byte goldens, all-family unchanged regressions, all four fresh packed consumers
and full pnpm verify. Generic synthetic response binding proves only declared
context. Official FEC response party/outcome mapping remains an independent gate.

## Access limitations and unresolved full scope

The indexed GeneralidadesVentaArticulosUsados.pdf and
FundamentoLegal_VentaArticulosusados.pdf currently return 404. PGR/SINALEVI fresh
full-text access returned 403. No repeal/invalidity was inferred from those errors.
Official 2021 example, fresh 2025 slides and current99-page annex are separately
identified. No secondary provider implementation is treated as authority.

Required broader used-goods and V1 scope remains open: actual economic
qualification and regime registration, alternative taxable/exempt cases,
reseller margin/factor producers, historical source custody and app acceptance,
statutory timing/credit/response protocol, SDK 69 dependency risk and coherent
reviewed release. This proposal closes none of those by selecting source syntax.
