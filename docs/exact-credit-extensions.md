# Exact partial NC and rejected-FE replacement

These additive, unreleased source APIs preserve existing FE, total NC, TE, ND,
FEC, Number and read-only retained contracts. They do not authorize issuance,
allocate sequences, attest acceptance or change account balances.

## Partial amount correction

Shared exports `ExactNcPartialInputSchema`, `ExactNcPartialReferenceSchema` and
`ExactNcPartialInput`; SDK exports `calculateExactNcPartial` and
`buildExactNotaCreditoPartialXml` for `NC-domestic-ordinary-fe-partial-iva13-v1`.

Supply a valid ordinary original FE, an independent NC 03 identity/emission,
positive exact adjustment lines with explicit `originalLineNumber`, positive
payment allocations, and one FE 01 reference with code 02 and a real reason.
Reference key/date, parties, currency, exchange rate and selected line
classification/unit/commercial facts remain bound to the unchanged source.
Each original line can occur once in this named correction; output numbers are
sequential in caller order. Quantities/prices are explicit decimal strings; no
negative signed financial values, Number conversion or editable derived totals.
The result contains only the independently calculated credit, not the original FE.

There is deliberately no unrelated original-total cap: a previous verified ND
may have increased the amount available to credit. The caller must atomically
prove actual remaining credit from the immutable accepted original, related ND
and prior NC ledger, including concurrency, source ownership and applicable
eligibility. Valid source math alone grants none of that authority. Total
cancellation code 01 remains the separate existing total-NC API.

## Replacement of an institutionally rejected FE

Shared exports `ExactFeReplacementInputSchema`,
`ExactFeReplacementReferenceSchema` and `ExactFeReplacementInput`; SDK exports
`calculateExactFeReplacement` and `buildExactFacturaReplacementXml` for
`FE-domestic-ordinary-rejected-replacement-iva13-v1`.

`replacement` is an independently valid new ordinary FE with positive supplied
payment allocations (allocation is not cash-receipt evidence). `rejected` contains
only the retained old FE clave and emission timestamp. An old rejected document
need not satisfy a valid FE input/math schema: preserving malformed facts as
reference evidence must not require copying them into a new invoice. One
mandatory reference uses type 10 (rejected by Hacienda), code 16 (replacement),
exact old key/date and a nonblank reason of 3–180 Unicode characters. New parties
may contain actual corrections, but this first named case requires the same
issuing taxpayer, a retained old FE identity layout, and a fresh own key and
consecutive. Different security bytes cannot make the old consecutive reusable.

The caller proves genuine institutional rejection, exact retained bytes and
scope, current user authority and a new idempotent issuance intent. Recipient
rejection, pending/unknown JSON and an accepted original are not grounds for
this contract. No status boolean, old signing/resubmission or financial effect
is supplied by the SDK. Malformed old reference key/date cases require a
separate reviewed policy; they are not silently repaired.

## Primary evidence and limits

The [current official annex](https://www.hacienda.go.cr/docs/ANEXOS_Y_ESTRUCTURAS_V4.4.pdf)
(99 pages, SHA256 `6e093226b29b38c5c8de825f70c1b1cb8ed81e2f4a6eb0b3ff52708fc1eb2769`)
pp. 57–58 and Notes 9/10 distinguish amount correction, retained facts, reason
bounds, cumulative credit and rejected-document replacement. The
[official regulation](https://www.hacienda.go.cr/docs/REGLAMENTO_DE_COMPROBANTES_ELECTRONICOS.pdf)
(SHA256 `32da4200481b6c21522d4ace59e5255e15aae0624be077594dc65195189fe4fc`)
articles 10/19 separate correction of valid documents from new issuance after
institutional rejection.

Reference chronology compares complete accepted ISO fractions and offsets
without millisecond truncation; exact reference lexemes are preserved. Trusted
issuance/submission-time ten-year eligibility and its calendar-boundary policy
remain caller requirements. There is no hidden wall clock or guessed leap-day
rule. Native 2026 permits replacement reason 16; the unchanged base 2024 schema
does not. Its expected rejection is not a reason to edit vendor schemas.

Independent Decimal/native/signing and fresh packed consumers check source
behavior. Synthetic pinned response tests check explicit context and signature
binding, not live Hacienda acceptance or an institutional trust oracle. SDK #69
and the existing FE minimum-name/zero-payment-allocation gaps remain independent
release prerequisites. Retained 0.9 producer tuples must not be silently
reinterpreted when those current contracts are tightened. REP monetary semantics,
special FEC 05/06–13 and recipient lifecycle remain required unfinished work.

See [the corrected source verification checkpoint](testing-exact-credit-extensions.md)
for exact test counts, prior diagnostic failures and unverified operational gates.
