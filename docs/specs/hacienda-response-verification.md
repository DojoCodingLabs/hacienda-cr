# Authenticated Hacienda response XML

`verifyHaciendaResponseXml` is an offline authentication boundary, separate from
XSD validation, transport JSON and taxpayer document signing. It verifies a
bounded `MensajeHacienda` against an explicit reviewed leaf-certificate pin set.
It does not fetch certificates, send requests, accept arbitrary embedded keys,
or claim that a self-signed test certificate represents Hacienda.

## Contract

```ts
const response = await verifyHaciendaResponseXml(originalUtf8Xml, {
  expectedClave: frozen.clave,
  expectedIssuer: { type: frozen.issuer.type, number: frozen.issuer.number },
  expectedReceiver: frozen.receiver
    ? { type: frozen.receiver.type, number: frozen.receiver.number }
    : null,
  expectedTotal: frozen.totalDecimalText,
  trustedSignerCertificates: reviewedPublicLeafCertificates,
});
```

All expected facts are required. Party strings compare exactly, with no guessed
zero-padding or foreign-ID normalization. Decimal totals compare exact values at
five places without converting through Number; the maximum 18-digit response
amount is preserved in the result. A `null` receiver explicitly requires absent
or empty receptor identity. Name/detail strings are neither trusted identifiers
nor returned as diagnostics. `Mensaje`1 + `EstadoMensaje`Aceptado and `Mensaje`3 +
Rechazado are the only terminal pairs accepted. Applications must also compare
transport status with the authenticated result and retain a mismatch as unknown.

Keep the exact original response bytes/hash before verification; callers must
strictly decode UTF-8. The function never rewrites the source. Schema checks use
the unchanged vendored 2026 `MensajeHacienda_V4.4.xsd` with bundled XMLDSig schema
and no network. Existing 8MiB/depth/element/concurrency limits apply. DTD/entity
inputs, foreign roots, wrapping, duplicate or ambiguous IDs are rejected.

The supported profile is one direct root signature, RSA >=2048 with SHA-256,
inclusive C14N1.0 or exclusive C14N1.0 without comments, exactly one empty-URI
whole-root reference with enveloped transform, and at most two additional
same-signature SignedProperties/KeyInfo references. Metadata references may use
the standard implicit C14N1.0 or one explicit permitted C14N transform. XPath,
XSLT, remote/detached URI references, alternate KeyValue/key resolvers, nested
manifests and unsupported profiles fail closed before library resolution.

## Trust and time

`trustedSignerCertificates` is a bounded explicit set of reviewed **leaf** PEM
certificates. Exact DER pin matching selects a signer, and its native WebCrypto
public key verifies every reference and RSA signature; embedded KeyInfo does not
supply authorization or override the selected key. CA certificates and weak or
non-RSA keys are rejected. Certificates must be currently valid; the default
clock is current verification time, not an untrusted XML signing-time field.
An optional `now` only supports deterministic application tests and must never be
controlled by request input.

This is a leaf-pin trust policy, not automatic PKIX chain/revocation validation.
Production must independently establish institutional certificate provenance,
approve rotation and overlap/expiry, and enforce revocation/distrust updates in
its reviewed public trust store. No institutional pin is guessed, downloaded
from KeyInfo, or bundled as production authority in this change. Historical
reverification requires an explicit audited evidence policy; setting `now` to an
old date cannot by itself prove trusted signing time or revocation status.

Failures throw `ResponseVerificationError` with a bounded `reason`; no raw XML,
certificate, key, parser diagnostic or underlying exception is attached. Preserve
unknown/unverified evidence for investigation rather than treating a failure as
Hacienda rejection. A successful return has `valid:true`, exact clave/party/total,
accepted/rejected state, signer SHA-256 fingerprint and certificate validity.

## Evidence and limits

The schema is the unchanged recorded official source at
[Hacienda MensajeHacienda V4.4](https://www.hacienda.go.cr/docs/MensajeHacienda_V4.4.xsd).
The signature processing/trust separation follows
[W3C XML Signature1.1](https://www.w3.org/TR/xmldsig-core1/) sections3.2,4.4,8:
a valid signature is not an institutional authorization decision by itself.
On 2026-10-17 the public OVI URL returned bytes identical to the vendored file:
7799bytes, SHA-256 `b2606156042b7aa7b7f7f61945f0ff1323661b43b5a1489ad5eafad1c52fd25e`.
The CDN namespace path returned HTTP403; this is not evidence of a schema change.
Schema bytes and provenance remain governed by `packages/sdk/schemas/manifest.json`.

Tests use newly generated synthetic pins. They cover exact max decimal binding,
accepted/rejected and absent receiver, tampered signed data/signature, foreign
pins, invalid time/context, wrapping/duplicate IDs, unsupported references and
algorithms, hostile XML, and errors without source leakage. A separate fixture
uses native libxml2 exclusive canonicalization and OpenSSL signing, with no
xadesjs signing, then verifies the result with this API. The A2 native oracle
separately checks SDK-generated signatures. Installed-consumer verification
executes this public API from the actual fresh npm tarball and rejects tampering.
No real institutional response, cloud activation or live fiscal acceptance is
claimed. The node-forge advisory remains tracked separately in SDK issue69;
verification here uses native WebCrypto and Node X509, not Forge verification.
