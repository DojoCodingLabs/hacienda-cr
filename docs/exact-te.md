# Exact ordinary domestic TE (source candidate)

Tracking: [SDK domestic V1 umbrella #85](https://github.com/DojoCodingLabs/hacienda-cr/issues/85). This additive source API is not yet published, does not enable a family in Facturador and does not establish Hacienda acceptance. It is intended for the single cohesive future linked release after the other required reviewed feature slices. Existing 0.9 versions, current/retained FE, total NC and Number APIs remain unchanged.

`ExactTeInputSchema` / `ExactTeInput` are exported by shared. SDK exports `calculateExactTe`, `buildExactTiqueteXml` and the input/calculated types. Source facts use decimal strings; the SDK recomputes derived amounts using the existing BigInt ordinary IVA13 monetary kernel. The kernel has no document identity/receiver/case authority. FE and retained FE still parse their unchanged respective schemas before invoking the same math. No retained TE signing/XML/POST API is added.

```ts
import { ExactTeInputSchema } from "@dojocoding/hacienda-shared";
import { calculateExactTe, buildExactTiqueteXml } from "@dojocoding/hacienda-sdk";

// actualSource is a caller-supplied TE04 source; do not invent taxpayer facts.
const source = ExactTeInputSchema.parse(actualSource);
const calculated = calculateExactTe(source);
const xml = buildExactTiqueteXml(source);
```

The named case is `TE-domestic-ordinary-iva13-v1`: CRC/USD, ordinary IVA13 lines, explicit CABYS goods/services classification, ordinary transaction and supported discounts. Gross and net line amounts must be positive; unsupported special/free/gift/exoneration/other-charge cases fail instead of being approximated. Currency/rate and payment allocation remain exact; allocation is not an assertion of cash collection or bank payment. Conditions 09/11/12/13 are outside this TE case. Positive 1–5 digit credit days are required for 02/10 and for any supplied term; valid `00030` remains unchanged. No rule infers a universal 90-day contractual due date from condition 10.

A missing receiver remains missing in XML. A provided receiver has its actual name (3–100 Unicode characters), optional actual domestic identification 01–04 and supported contact/location data. Provided identification is validated; no placeholder name/identity/email is generated. Foreign/unreviewed identity variants are explicit unsupported input. TE has no receiver activity field; supplying `codigoActividadReceptor` is rejected, not silently discarded. FE's required receiver is not weakened.

The builder uses genuine TE root/namespace/consecutive04 and verifies taxpayer/date/series/embedded consecutive identity through the existing identity helper. It never builds an FE and renames the root or supplies a fake FE receiver. Source-only schema and arithmetic are not business eligibility, certificate authority or acceptance. The ordinary line source/schema remains a bounded supported case, not a claim to cover all TE tax regimes. Native official XSD and applicable business/case validation remain separate required gates; the synchronous builder does not execute native XSD on each call.

## Evidence and compatibility boundary

Tests exercise absent, named-unidentified and identified receivers, actual source immutability, maximum decimal/quantity boundaries, independent Python Decimal gross/discount/tax vectors, split/mixed totals, family/term/unknown-field rejections, native base/current TE XSD, real synthetic P12 signing and pinned legitimately signed TE responses. The response verifier's explicit null receiver is tested separately from an identified receiver; wrong identity/total/pin and changed bytes reject. Synthetic signed responses do not prove institutional trust/production acceptance or resolve node-forge advisory #69.

A small regression fixture hashes actual published SDK 0.9 FE/NC XML and calculation output plus read-only retained 0.8-source math. The test reuses the unchanged synthetic `exactNcFixture` and actual retained source asset. Producer SRI is recorded in `exact-ordinary-090-baseline.json`; no new signing or historical relabel is involved. Existing native FE/NC and packed tests continue to run.

The app still needs its own reviewed TE current proof/case/series/worker/response/original custody/PDF/delivery, permission/recovery/mobile/desktop and real acceptance evidence before activation. CLI/MCP wrappers for new exact TE are not added by this SDK/shared slice; existing legacy wrappers retain their existing contract and do not constitute new exact TE support. The remaining family/partial correction/recipient contracts and independent protocol/security prerequisites remain open in #85 and #69. FEE and the US entity remain outside domestic V1.

Official sources: unchanged `schemas/2026/v4.4/TiqueteElectronico_V4.4.xsd` (receiver optional at line 49, receiver name/identification at lines 990–1003); [current official annex](https://www.hacienda.go.cr/docs/ANEXOS_Y_ESTRUCTURAS_V4.4.pdf), 99 pages, SHA256 `6e093226b29b38c5c8de825f70c1b1cb8ed81e2f4a6eb0b3ff52708fc1eb2769`. Names/identification/terms, family applicability and exact arithmetic are independently checked; official vendor bytes are not edited.

## Executed local verification

On the frozen source candidate, full `pnpm verify` completed with exit 0: shared
244, SDK 1,108, CLI 75 and MCP 49 unit tests passed (1,476 total), with four live
credential tests intentionally skipped. All 118 script tests and fresh consumers
of all four actual packed packages passed, including public TE TypeScript/runtime
exports and native offline XML. Formatting, source manifest verification, lint,
types and builds passed. Log: `/private/tmp/sdk-te-verify-final.log`; Node
26.8.2, pinned pnpm 9.15.4, native xmllint/Python available. This is local evidence,
not hosted CI or acceptance of live TE submissions.

Initial development checks found a zero-percent discount fixture outside the
existing supported schema and new-test lint assertions; both were corrected
without weakening validators. A restricted verification attempt could not bind
its existing loopback transport fixtures; the approved isolated full rerun
completed successfully with live credential tests disabled. Those earlier runs
are not counted as passing evidence. No package version, lockfile, vendor schema,
provider credentials or production activation changed.

Independent root review of `6381143748663cadab6d48145ba3b2771c9c6e1a` found no merge blocker in the TE schema, genuine TE04 builder/identity, monetary-only extraction or preserved FE/NC contracts. A separate focused run passed 25 tests covering native TE XML/signing, response binding and published 0.9 FE/NC byte/math compatibility (`/private/tmp/root-sdk-te-review-tests.log`). This review authorizes source integration only; release and app activation remain separate.
