# Exact ordinary FE-reference ND (unreleased source candidate)

Tracking: [SDK #85](https://github.com/DojoCodingLabs/hacienda-cr/issues/85). Additive shared exports: `ExactNdInputSchema`, `ExactNdReferenceSchema`, input/calculated types. SDK exports: `calculateExactNd` and `buildExactNotaDebitoXml`. This source slice contributes to one eventual cohesive linked release; no package version or app activation changes here.

The named case `ND-domestic-ordinary-fe-increment-iva13-v1` contains:

- `original`: actual unchanged current exact ordinary FE source; caller independently binds its immutable bytes, company and accepted evidence.
- Own `clave`, `numeroConsecutivo` and `fechaEmision` for ND02, distinct from the referenced FE identity.
- `adjustments`: ordered `{originalLineNumber,line}` entries. Each original line may appear at most once in this bounded API. The line retains the selected source CABYS/classification/unit/commercial/ordinary-transaction metadata. Its quantity, price, description and permitted ordinary discount are explicit incremental facts. Caller-provided ND line numbers must be 1..n in that order; the SDK does not sort or silently renumber them. Correlation metadata is not invented XML content.
- Independent `medioPago`: every supplied allocation is positive, and their exact sum matches the delta total. This is not evidence of cash received, bank settlement or a REP.
- Exactly one `informacionReferencia` entry: `tipoDoc:'01'`, exact original clave/timestamp lexeme, `codigo:'02'` and required nonblank reason of 3–180 Unicode characters with no trim/normalization.

```ts
import { ExactNdInputSchema } from "@dojocoding/hacienda-shared";
import { calculateExactNd, buildExactNotaDebitoXml } from "@dojocoding/hacienda-sdk";

const source = ExactNdInputSchema.parse(actualIncrementalSource);
const delta = calculateExactNd(source);
const xml = buildExactNotaDebitoXml(source);
```

Original current ordinary FE identity/math must be coherent, but its total is **not** the debit amount. The new positive increment is calculated separately using the reviewed integer kernel (ordinary IVA13, CRC/USD). There is no arbitrary original-total ceiling. Party/currency/header overrides are not accepted; incompatible original conditions 09/11/12/13 and foreign/unreviewed parties reject instead of being rewritten. Current 02/10 positive credit lexemes remain unchanged. Unsupported fiscal regimes, charges, gifts/free lines or exoneration are not silently projected into ordinary IVA13. Existing FE/NC/current/retained and Number APIs stay unchanged; the unreleased TE issuer-name refinement below is the only existing additive-source follow-up; no historical ND signing/XML/POST builder is added.

## Primary evidence and responsibility

[Current official v4.4 annex](https://www.hacienda.go.cr/docs/ANEXOS_Y_ESTRUCTURAS_V4.4.pdf), 99 pages, SHA256 `6e093226b29b38c5c8de825f70c1b1cb8ed81e2f4a6eb0b3ff52708fc1eb2769`: pages 57–58 cover required ND references, source correspondence and reason bounds; Nota 9/p. 73 specifies 02 amount correction. The unchanged native ND XSD lines 880–946 admits the code but its older documentation calls 02 text correction, and makes some reference fields optional. The stricter named contract follows the current annex rather than treating weaker structural validation as the complete business rule. Page 56 supplies the positive-allocation rule; existing FE/TE zero-allocation behavior is not changed by this additive API and remains recorded for the coherent release review.

Timestamp equality binds the reference to the exact supplied original lexeme. Separately, declared ND chronology uses the existing exact UTC-second/fraction comparator; accepted fractional precision never round-trips through floating-point milliseconds. This comparison is **not** the actual ten-year reference-age gate. The caller must independently enforce that eligibility at actual issuance/submission with a reviewed trusted-time/calendar policy. No hidden wall clock, leap-day policy or automatic age approval is invented. A reproducible historical source may calculate while remaining blocked for actual issuance. App original acceptance, ownership, cumulative/concurrent correction policy and account effects are also caller responsibilities, not SDK booleans.

Native XSD, signature authenticity, reviewed trust and Hacienda acceptance are separate layers. Synthetic P12/response tests are not real institutional acceptance. SDK #69 and the recipient status protocol oracle in #85 stay open. FEE and the US entity remain outside domestic V1. CLI/MCP exact ND wrappers and app proof/series/worker/archive/PDF/delivery/UI integration are separate source slices/gates.

## Native copied-party bounds and unreleased TE follow-up

ND copied issuer names require 5–100 Unicode characters, receiver names 3–100,
and supplied commercial names 3–80. Values are never trimmed or normalized.
The unchanged current ND XSD issuer restriction is at lines 987–995; TE has the
same issuer minimum at lines 938–946. Review reproduced both builders accepting
`abcd` before native validation rejected its length of four. This source PR
therefore also tightens the unreleased exact TE issuer minimum from three to five.
It does not alter existing FE/current/retained schemas or Number APIs. Their
pre-existing minimum-name/business-schema mismatch remains a separate #85 item;
installed Zod already counts their maximum in Unicode characters.

Independent tests cover issuer 4/5, receiver 2/3, commercial 2/3 and Unicode
100/101 (commercial 80/81), unchanged whitespace, both native XSD generations,
and existing FE acceptance/maximum behavior. ND retains all original FE business
refinements and original-math validation; no original source fact is repaired.

## Executed verification

Initial candidate `a59d968` passed full `pnpm verify`: 1,486 units, four deliberate
live skips, 118 scripts and fresh all-four packed consumers. That historical run
preceded the independent native name finding and does not establish the corrected
candidate's verification. The corrected focused native/name/TE/ND/published 0.9
compatibility run passed 19 tests (`/private/tmp/sdk-nd-name-focused.log`). Full corrected `pnpm verify` completed with exit 0: shared 246, SDK 1,121,
CLI 75 and MCP 49 units passed (1,491 total), with four intentional live skips;
118 scripts and fresh all-four packed consumers passed. Formatting, source
manifest, lint, types, builds and strict OpenSpec also passed. Corrected full
log: `/private/tmp/sdk-nd-name-verify-final.log`; native finding reproduction:
`/private/tmp/sdk-nd-name-repro.log`. The initial newly added FE maximum test
incorrectly assumed UTF-16 counting; actual dependency inspection disproved that
assumption and the corrected regression preserves existing Unicode behavior. No live provider, package publication or app
activation is implied; official schemas, versions and lockfile remain unchanged.
