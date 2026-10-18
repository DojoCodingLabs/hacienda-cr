# Exact FEC source boundary (proposal before implementation)

## Reviewed source identities

Base SDK main: `d63da7d56d25d98e8f772bfe2871220e248c43f7` (merged exact TE/ND,
packages still 0.9.0; those additive APIs are not published yet).

Primary current annex: [Hacienda v4.4](https://www.hacienda.go.cr/docs/ANEXOS_Y_ESTRUCTURAS_V4.4.pdf),
99 pages, SHA256 `6e093226b29b38c5c8de825f70c1b1cb8ed81e2f4a6eb0b3ff52708fc1eb2769`.
Preserve the older vendored annex and every official schema byte.
Current native FEC: `packages/sdk/schemas/2026/v4.4/FacturaElectronicaCompra_V4.4.xsd`,
SHA256 `57e4cedb12d5045884670ff2e4795d2027e69b96d45752f60cd1a1930e2768a3`.

[Official electronic-document regulation](https://www.hacienda.go.cr/docs/REGLAMENTO_DE_COMPROBANTES_ELECTRONICOS.pdf),
article 2(13), defines acquisition documentation and excludes specified supplier
categories. A syntactically valid supplier ID is not proof of supplier eligibility.
The SDK must not invent RUT status, qualification, tax liability or deductibility.

## Primary contract matrix

| Concern                    | Evidence                                                            | Proposed bounded behavior                                                                                                                                                                                                                                                           |
| -------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Actual parties             | Annex pp. 19–23 and signature p. 60; native lines 60–70             | Real supplier in Emisor; real buyer in Receptor; no swapping to fit FE. Buyer owns clave taxpayer and signer.                                                                                                                                                                       |
| Identity                   | Existing `validateDocumentIdentity(input,"08")`                     | Genuine own 08 consecutive/clave, buyer tax ID and CR emission date. Wrong supplier-owned clave rejects.                                                                                                                                                                            |
| Activities                 | Annex p. 18; native lines 26–52                                     | Buyer activity required; supplier activity optional actual supplied fact. Never copy buyer activity into supplier.                                                                                                                                                                  |
| Names                      | Native lines 627–731; annex pp. 19–23                               | Issuer 5–100, receiver 3–100, supplied commercial 3–80 Unicode characters; no normalization.                                                                                                                                                                                        |
| Ordinary parties           | Annex pp. 19–21/69                                                  | First case requires domestic supplier/buyer 01–04 with actual domestic addresses. Identity 05/06 not accepted as an ordinary-party alias.                                                                                                                                           |
| Supplier 05                | Annex pp. 19/69/74                                                  | Foreign service/intangible case, required reference 16 and distinct eligibility. Explicitly unsupported here; not an ordinary domestic default.                                                                                                                                     |
| Supplier 06 / condition 13 | Annex pp. 19–20/69–70                                               | Used goods sold by non-contributor, identification06 requires condition13. Distinct mandatory later source case. Do not infer exempt/non-subject/13% classification from the condition alone.                                                                                       |
| Conditions / terms         | Annex pp. 24–25/70                                                  | First case only 01 or02; explicit positive 1–5 digit days for02, preserve leading zeros. Do not infer condition10 tax-exigibility or90-day maturity.                                                                                                                                |
| VAT / exigibility          | Annex detail and summary restrictions, native lines 313–325/410–441 | Caller explicitly selects this named ordinary IVA13 case; calculate declared ordinary13 only. No exemption, exoneration, non-subject, assumed/factory tax, gift/free or special transaction. Eligibility, VAT timing and credit rights remain independent caller gates.             |
| Reference obligation       | Annex pp. 57–58/73–74; native lines 522–588                         | 1..10 explicit original supporting references; bounded first case uses contract06/procedure07/special-regime14/other99 with code04. Required real number, date and3–180 reason;99 additionally requires5–100 document-type description. No fabricated FE clave or supplier receipt. |
| Age / chronology           | Annex p. 58                                                         | Validate exact declared chronology without Date.now or fraction truncation. Actual10-year submission-time eligibility remains caller trusted-calendar gate; no guessed leap-day rule.                                                                                               |
| Allocation                 | Annex p. 56                                                         | 1..4 positive exact allocations reconcile to total; does not attest cash received.                                                                                                                                                                                                  |
| Native FEC lines           | Native lines 313–325 versus FE                                      | Dedicated FEC projection omits FE-only ImpuestoAsumidoEmisorFabrica. Do not mutate FE serialization or use a fake FE source.                                                                                                                                                        |

## Why this reference/condition subset is explicit

Annex Nota10/p.74 names reference06 Contract,07 Procedure,14 document supplied
by a special-regime taxpayer and99 Other. This first API intentionally accepts
only those non-electronic supporting-evidence types, not a new legal assertion
that all other FEC references are invalid. Actual provider eligibility remains
external. Nota9/p.73 names code04 “Reference to another document”; the API requires
that reason because this case is evidence documentation, not cancellation,
correction, contingency, replacement or foreign-provider processing.

Annex pp.57–58 requires FEC references, actual number (the special exception for
reference13 is outside this subset), emission date, code and reason. The named
subset therefore requires number1–50, valid full-precision ISO date, literal04,
reason3–180 nonblank Unicode characters. Type99 additionally requires
`tipoDocOtros`5–100 nonblank characters. The same companion on06/07/14 is rejected
rather than silently dropped. These types have no additional type-specific
companion in the cited catalog. Do not manufacture a document number or force a
non-electronic evidence number into a50-digit clave. Supporting evidence tuple
(kind, number, date) must be unique within the bounded input.

Condition01/02 is an intentionally narrow source API policy, not a statement
that native FEC admits only those values: XSD includes additional conditions.
01 is the ordinary cash term, without proving a receipt;02 requires explicit
positive credit days under annex p.25. Conditions08/10 have separate VAT timing
or public-service eligibility,13 is used-goods/non-contributor,09/11 are REP and12
is FE-only. Other specialty conditions are also outside this first case. Reject
rather than silently translate any of them to01/02.

## Proposed public source shape

Exports: `ExactFecInputSchema`, `ExactFecInput`, `ExactFecCalculated`,
`calculateExactFec`, `buildExactFacturaCompraXml`.

`caseCode: 'FEC-domestic-ordinary-iva13-v1'`, own identity and actual supplier /
buyer objects, optional supplier activity, required buyer activity, condition01/02
and explicit applicable credit-day lexeme, exact current ordinary line inputs,
CRC/USD currency/exchange and independent positive payment allocations, plus
1..10 supporting references under the bounded reference policy above.

Every monetary source is decimal text. Derive all totals through the existing
BigInt monetary-only kernel after this independent strict schema; do not pass
through a FE parser, fake receiver or Number/precomputed totals. Dedicated XML
projection uses the native FEC order and existing safe XML/real-party helpers.
Only document-diagnostic union addition is expected in the monetary kernel;
FE/TE/ND/NC results/errors and published 0.9 compatibility must remain unchanged.

## Authentication and acceptance limits

Source/calculation/XML do not authorize signing or submission. The caller binds
the buyer certificate to its actual authorization; synthetic P12 tests establish
cryptographic mechanics only. Institutionally pinned response tests bind actual
MensajeHacienda fields, clave and exact total. They do not invent currency or
establish the live FEC response-party protocol oracle; real acceptance, current
supplier qualification, VAT eligibility/exigibility, tax credit and age gates
remain app/operator responsibilities. No provider or credential call is included.
SDK #69 remains an independent unresolved dependency security prerequisite.

## Verification plan

Independent schema rejects wrong/missing buyer, supplier-owned clave, wrong family,
missing activity/reference, wrong reference kinds and date, amount overrides,
unsupported condition13/identification06/foreign05/tax regime. Native 2024+2026
unsigned/signed XSD checks prove FEC field order and absence of FE-only line nodes.
Test party Unicode minima/maxima and unchanged actual facts.

Python Decimal oracle covers fractional and maximum amounts/quantities, currency,
discounts, line classification, exact tax aggregation and allocation mismatch.
Synthetic P12 + legitimate pinned response exercises buyer signing and distinct
supplier/buyer/clave/total mismatch failures. No adversarial crypto construction.
Preserve actual published 0.9 FE/NC/current/retained golden compatibility, exact
TE/ND regressions and legacy FEC behavior. Fresh all-four packed consumer tests,
full `pnpm verify` and strict OpenSpec must pass before independent source review.
No version bump, release or app activation is part of this PR.
