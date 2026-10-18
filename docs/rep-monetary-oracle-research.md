# REP monetary oracle: source research and implementation decision

Research on 18 October 2026, SDK main
`43feefa835e93d5139379e291305956ef0034566` (after PR #92). No source, schema,
package, version, provider or application change is made by this checkpoint.

The missing oracle is specific: mapping a real partial payment and its recovered
IVA into the reduced REP line and summary. Native validity cannot select that
mapping. A newly located primary rule also rules out a generic proportional
cash-to-IVA algorithm for the condition 10 deferred-tax register.

## Primary evidence, scope and retrieval

| Source                                                                                                                                                                                                         | Exact reviewed location                                                               | What it establishes                                                                                                                                                                              |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Current Hacienda annex](https://www.hacienda.go.cr/docs/ANEXOS_Y_ESTRUCTURAS_V4.4.pdf), 99 pages, SHA256 `6e093226b29b38c5c8de825f70c1b1cb8ed81e2f4a6eb0b3ff52708fc1eb2769`                                   | pp. 23–26, 35–36, 42, 46, 53–58; Nota 5 p. 70, Nota 9 p. 73                           | Own REP 10 identity; original FE 08→REP 09 and FE 10→REP 11; reduced detail, reference, payment and monetary constraints.                                                                        |
| [Decree 44392-H, official Gaceta 47, 12 March 2024](https://www.imprentanacional.go.cr/pub/2024/03/12/COMP_12_03_2024.html)                                                                                    | article 1, added RLIVA 40 bis, especially calculation operations 2–3; sole transitory | Partial advances/payments first discharge outstanding deferred tax. Maximum 90 natural days and tax/payment special records; transition requires an administrative implementation communication. |
| [Law 10144, official Gaceta 96, 25 May 2022](https://www.imprentanacional.go.cr/pub/2022/05/25/COMP_25_05_2022.html)                                                                                           | articles 1–2, amended LIVA 3(8)/27                                                    | Credit-sale accrual differs from permitted tax-payment deferral; eligibility/exclusions and tax-credit timing are separate.                                                                      |
| [Official regulation 44739-H](https://www.hacienda.go.cr/docs/REGLAMENTO_DE_COMPROBANTES_ELECTRONICOS.pdf), SHA256 `32da4200481b6c21522d4ace59e5255e15aae0624be077594dc65195189fe4fc`                          | definition 23, p. 8                                                                   | REP supports actual partial payment in the prescribed deferred-credit circumstances. It does not establish every receipt as REP-eligible.                                                        |
| [Official March 2025 presentation](https://www.hacienda.go.cr/docs/ComprobantesElectronicos-GeneralidadesyVersion4.4.marzo2025.pdf), SHA256 `632e42dbc1a1d1da74873a0505b51042d1e90214ade3c7895b819f1c90a6f1de` | slides 18–19, visually inspected                                                      | The two regimes and original-reference linkage; no worked monetary/XML example.                                                                                                                  |

The consolidated [official SCIJ register](https://sinalevi.go.cr/ResultadosNormativa/Informacion?param1=88953&param2=144903&param3=1&param4=)
indexes the same article 40 bis. Its interactive current body did not render through
the text browser; the full official Gaceta text was read instead. This is not a
claim that every subsequent amendment or operational activation was verified.
The old PGR 166C51 endpoint returned 404 on direct retrieval. The public-consultation
`BORRADOR_RLIVA-VTAS_A_CREDITO-CP.pdf` is a draft, not the enacted rule.

Search also found the official indexed
[Example 16](https://www.hacienda.go.cr/docs/FACTURAELECTRONICAEJEMPLO16.pdf),
listed in [Facturacion.pdf](https://www.hacienda.go.cr/docs/Facturacion.pdf)
with an indexed 2 December 2024 update. Its search extract prescribes a second FE
with CABYS 9090000000000, not the new reduced REP 10. Direct current fetch returned
404; no PDF was obtained or visually verified. It must not become a current REP
oracle, and no current XML may copy its CABYS. Search excerpts/third-party
summaries, Mexican CFDI payment complements and arbitrary native-valid fixtures
are not authoritative Costa Rican REP worked examples.

## Concrete XML contradiction

The current 99-page annex was read with original table layout; p. 56 was rendered
and inspected visually. Its REP exceptions specify a tax-exclusive line
`MontoTotal`, an editable payment `SubTotal`, IVA from tariff×`SubTotal`,
`TotalVenta=ΣMontoTotal`, and `TotalComprobante=TotalVenta`. Supplied positive
payment amounts must reconcile with the document total. There is no quantity,
unit price, CABYS, discount or `BaseImponible` in the reduced native REP line.

For an actual gross receipt 113 and ordinary base 100/IVA 13, plausible mappings
cannot all satisfy those meanings. The existing legacy fixture uses
`MontoTotal=100`, `SubTotal=100`, line total 113, sale 100 and document total 113.
Another candidate changes sale/document totals to 113; another also changes
`MontoTotal` to 113. The independent native audit below accepts these contradictory candidates in both generations using reference code 04, a catalog value present in both. This is deliberately not a proposed current reference policy. None is an official oracle;
the third contradicts the tax-exclusive line instruction. Picking one because
it validates, or subtracting/re-adding VAT until the fields reconcile, invents
a rule. `TotalVentaNeta` introduces another general formula despite no REP
discount node. This requires an actual current worked REP 10 or written competent
clarification, not a new public configuration knob selecting a preferred formula.

Current vendored schemas are unchanged:

- 2024 REP SHA256 `81d7be9cd9fc3792c2bb3822079784b8d62a3e643e708df0c99bc67d1edcbdfa`.
- 2026 REP SHA256 `86e3aa5f0615b757a3b2e9c300973d573ac321f76adba7b4b05e59d854da82b7`.

The reproducible [native counterexample audit](../audit/rep-monetary-oracle.mjs) and [saved output](../audit/rep-monetary-oracle.json) independently test four contradictory mappings against both vendored generations. Reference 17 passes 2026 and fails 2024: the initial audit exposed that catalog difference, so cross-generation monetary counterexamples deliberately use 04. The current named case must target reviewed 2026 reference 17; 2024 is an explicit unsupported generation for that reference, never silently rewritten to 04. The repo legacy builder/fixture were independently read
at this checkpoint. Their Number DTO and synthetic expectations are compatibility
evidence, not fiscal authority. This research does not silently change them.

## Tax recovery is not proportional payment splitting

The enacted 40 bis calculation operation 2 gives priority to unpaid deferred tax
when partial advances/payments arrive. Therefore a proposed condition 10 register
can use exact integer money units to calculate `min(received,remainingTax)` as
its recovered-tax component. For original base 100/VAT 13, receipts 5, 5, 3, 100 recover
5, 5, 3, 0 respectively; multiplying every receipt by 13/113 is a different policy.
These are arithmetic consequences for the register, not approved REP XML values.

Keep four independently sourced facts: actual money received, tax recovered from
that money, tax already declared/paid to the Treasury, and eligible input credit.
A 90-day tax obligation without cash is not a fabricated receipt. Later cash must
not cause already recognized tax to be declared twice. A customer's deductible
credit is not inferred from REP acceptance or supplier cash records. Condition 08
state-service timing has its own LIVA 3 payment trigger; do not apply the 10/11
90-day convention to 09 automatically. Actual operational eligibility and the
transitory implementation communication still need explicit current evidence.

## Proposed complete source boundary

Use two explicit proposed cases, never a generic REP percentage mode:
`REP-state-service-fe-iva13-v1` (original 08/REP 09) and
`REP-deferred-fe-iva13-v1` (original 10/REP 11). Both require one immutable exact
ordinary FE, actual original parties, original currency and its own distinct 10
identity. State-service requires actual service lines; deferred requires actual
qualification/current regime evidence in the application. Ordinary 02, cash 01,
TE/FEC/FEE, promises of payment, mixed tax, exoneration, already adjusted source
or unknown prior REP/cash outcomes are not silently admitted.

Proposed source envelope, subject to final oracle review:

```ts
{
  caseCode,
  original, // exact frozen FE source; reviewed producer tuple remains external
  clave, numeroConsecutivo, fechaEmision, proveedorSistemas,
  payment: { id, receivedAt, amount, currency, methods },
  allocation: { // explicit frozen source-line allocation, never an inferred %
    sourceRevision, previousReceived, previousRecoveredTax,
    taxPreviouslyDeclared, taxPreviouslyPaid, lines
  },
  informacionReferencia: [{
    tipoDoc: '01', numero: original.clave,
    fechaEmision: original.fechaEmision, codigo: '17', razon
  }]
}
```

All financial values stay bounded decimal text through JSON, scaled BigInt,
calculation, XML and installed consumers. No `eligible:true` or `accepted:true`
field grants authority. The SDK parses source facts; the application independently
binds original signature/response, company/environment, payer/currency, verified
cash evidence and immutable payment/allocation revision under locks. Exactly one
reference/code 17 is the named-case boundary, not a claim that native max 10 or
all alternative references are universally invalid.

Retain original parties separately from current authority. Preserve all original
and receipt timestamp lexemes. Independently compare original emission ≤ actual
payment ≤ REP emission with full fractions/offsets, no hidden `Date.now`, legal
calendar or fresh date invented by the builder. The tax deadline/current legal
qualification comes from a reviewed policy, not from local timezone guesses or
user metadata. Explicit late/backdated/unknown events require their own evidence.

Start with same-currency CRC. USD needs an independently sourced, frozen exchange
rate/date/conversion rule before current fiscal readiness; do not copy an original
rate as though it were a payment-date conversion. Cross-currency receipts,
withholding, noncash offsets, overpayments, refunds, source corrections and late
tax recovery remain explicit separate cases until their policies are reviewed.

The final source calculator must derive all REP fields from that one source
under a single reviewed projection; callers cannot override total/subtotal/tax.
Only after the XML oracle is fixed should shared/SDK export consistent schema,
input/calculated types, BigInt calculation and `buildExactReciboPagoXml`. Preserve
legacy Number builders and all frozen 0.9/current FE/NC APIs. Do not publish an
unused permissive context validator as a completed producer, nor introduce an
unreviewed default tax mode merely to unblock an example.

## Application transaction and operational acceptance

Reuse the current fiscal queue and source-bound archive, with an independent REP
case/purpose/policy/current issue grant. Before allocation, lock operation,
verified source and the source account/payment allocation projection, then
configuration/series/child. Same payment+request replays one identity; a different
request conflicts. Existing pending/unknown REP, reversed/unverified cash, unclear
NC/ND effects or insufficient remaining amounts block new allocation. Preserve
cash and tax audit rows; no state change manufactures a second sale/account.
Do not release payment authority on an HTTP timeout or raw rejection alone.

Freeze and archive the first signed 10 bytes before one owner-bound POST marker;
unknown outcomes reconcile the same key with GET-only recovery. Current party,
case, credential and source guards are required for new effects. Original custody,
response authenticity, REP fiscal status, cash, tax register, input credit and
mail delivery remain separate. No provider sending is part of this research.

## Acceptance matrix and required oracle artifact

1. Actual accepted-source fixtures 08→09 and 10→11; wrong family/parties/reference,
   wrong own key/type/date, 02 ordinary, missing evidence and unknown history deny.
2. Tax-first 5/5/3/100 versus false proportional counterexample; repeat payment,
   concurrent requests, partial payment across CR civil months and exact remaining
   balance. Distinguish tax recovered from tax declared/paid and customer credit.
3. Full/partial/last-cent examples, bounded 13-integer/5-fraction maxima, independent
   Python Decimal and JSON/native signed/unsigned tests against current 2026. Explicit legacy structural diagnostics may use 2024, whose catalog rejects reference 17.
   Mixed rates, FX and rounding residuals need their own approved expected results.
4. Tax-paid-at 90 without customer money must not create zero-value receipt/REP.
   Later customer money cannot create a second tax debit.09 timing is independently
   tested rather than copying the 11 deadline policy.
5. Immutable old Number output and 0.9 FE/NC/current/retained package consumers;
   actual all-four fresh tarballs, no monetary `.toNumber()` bridge or CLI/MCP
   coercion. Native shape is never the business oracle.
6. App source/payment races, rollback, revoked session/credential, first bytes,
   lost upload/POST ACK and same-key GET with bounded scoped cleanup. Independent
   actual local UI/Storage acceptance precedes any separately authorized sandbox.

To approve the complete producer, obtain a current official REP 10 worked XML or
competent written rule with: original 08/10 amounts; an actual partial payment
smaller than remaining IVA; a second payment crossing that balance; each reduced
line and summary value; positive payment amounts; final payment; tax already paid
at 90 days; period/FX treatment if applicable. Record artifact URL/date/hash,
expected fields and independent review. Clarification must resolve both p. 35
net-amount/p. 56 total exceptions and tax-first register mapping, not just show
another file accepted by XSD. No such current monetary artifact was retrieved
in this bounded research. #85 and release REP completion remain open.
