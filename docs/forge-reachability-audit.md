# Forge advisory reachability at SDK 0.6.0

Read-only source assessment on 17 October 2026 against released commit
`80dd9e782d52d11c5be87777d0fddc9ae412348f` (`v0.6.0`). This documents the
current call paths and existing regression evidence. It changes no published
behavior, dependency, trust policy or release version.

## Unresolved dependency finding

Runtime `pnpm audit --prod --json` still reports one high finding and no
critical/moderate/low findings: node-forge 1.4.0,
[GHSA-86w9-cpqp-85rv / CVE-2026-85393](https://github.com/advisories/GHSA-86w9-cpqp-85rv).
The advisory affects RSA PKCS#1 v1.5 signature verification through 1.4.0 and lists
no patched release. Its [upstream issue #1149](https://github.com/digitalbazaar/forge/issues/1149)
tracks the nested algorithm-structure validation gap. This source assessment is
not a dependency patch, audit suppression, clean-audit result or issue #69 closure.

`pnpm --recursive why node-forge` resolves SDK → node-forge 1.4.0 and the CLI/MCP
paths through their SDK dependency. No dependency manifest or lockfile was
changed for this assessment.

## Exported APIs and actual call paths

`packages/sdk/src/signing/index.ts` exports `loadP12`, `signXml`,
`signAndEncode` and `verifyHaciendaResponseXml` (plus their types). There is no
exported legacy Forge signature-verification API.

| Entry/path                                                  | Actual implementation at the reviewed commit                                                                                                                                                                                                     |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `loadP12`, `signing/p12-loader.ts`                          | Bounded 1 MiB PKCS#12 input; Forge ASN.1/PKCS#12 parsing, key/certificate bag extraction, key-size/date/modulus/exponent matching and PEM/DER conversion. The resulting private key is imported into native WebCrypto for signing.               |
| PKCS#12 internal integrity                                  | Installed Forge `lib/pkcs12.js` derives a MAC key and checks HMAC. This integrity check is not an RSA certificate/signature verification call. Certificate decoding parses the certificate.                                                      |
| `signXml`, `signing/signer.ts`                              | Loads P12; `ensureInitialized` configures Node native WebCrypto, and XAdES signing uses the imported private key. `signAndEncode` delegates to that signing path.                                                                                |
| `verifyHaciendaResponseXml`, `signing/response-verifier.ts` | Node `X509Certificate` parses caller-pinned and embedded certificates; the exact leaf must match, be time-valid, RSA ≥2048 and non-CA. A native WebCrypto public key is imported for verification and passed explicitly to XMLDSig verification. |
| XMLDSig dependency                                          | Installed xmldsigjs 2.8.8 `build/esm/algorithm.js` delegates signature verification to `Application.crypto.subtle.verify`. The SDK configures that engine as `globalThis.crypto`; the reviewed path does not select Forge RSA verification.      |

The production SDK source has only one Forge import, in `p12-loader.ts`.
Searching production source (excluding specs and fixture helpers) found no call
to Forge RSA verification or certificate-chain verification. Forge remains
reachable for parsing/key conversion, so this finding does not establish that
all Forge functions, certificates or PKCS#12 inputs are safe. Leaf-pin provenance,
institutional trust and certificate-chain/revocation policy remain separate
requirements; parsing a certificate or verifying a synthetic leaf does not
establish any of them.

## Existing regression evidence

No new adversarial fixture was constructed. The existing tests were run with
live credential/test flags removed:

```sh
env -u HACIENDA_USERNAME -u HACIENDA_PASSWORD -u HACIENDA_SANDBOX_E2E pnpm --filter @dojocoding/hacienda-shared build
env -u HACIENDA_USERNAME -u HACIENDA_PASSWORD -u HACIENDA_SANDBOX_E2E pnpm --filter @dojocoding/hacienda-sdk test src/signing/response-verifier.spec.ts src/signing/security.spec.ts src/signing/p12-loader.spec.ts src/signing/signer.spec.ts
pnpm --recursive why node-forge
pnpm audit --prod --json
```

Result: all four existing test files / 39 tests passed. Audit exited 1 because the
high advisory remains. Existing checks include:

- `signing/security.spec.ts`: a legitimate XAdES signature verifies using
  native WebCrypto; modifying signed document content fails. Weak RSA, expired
  certificates and mismatched certificate/key pairs are rejected.
- `response-verifier.spec.ts`: valid pinned response and exact metadata;
  substituted certificate/key, changed context, expiry and unsupported XML or
  algorithms fail. No network lookup is performed.
- `response-verifier.spec.ts`: independent native OpenSSL/libxml2-generated
  XMLDSig verifies through the exported response verifier; replacing its
  signature value fails with `invalid-signature`.
- Existing loader/signer checks retain legitimate synthetic P12/signing behavior.

These existing tamper controls do **not** cover the advisory's specific nested
DigestAlgorithm adversarial condition. That acceptance criterion in SDK issue #69
remains uncompleted. No new test result, complete exploit-resistance claim or
native-boundary adversarial proof is inferred from the source trace.

## Remaining action

Keep issue #69 open and the package-audit finding visible. Reassess this trace if
signing/parser/verification dependencies or exported verification behavior change.
An upstream patch or separately reviewed compatible replacement, its package and
installed-consumer evidence, and the uncompleted targeted regression still need
independent review before the corresponding remediation/release criterion can
be marked complete. No Changeset or release is warranted for this documentation
alone. No live Hacienda call, credential use, cloud action or publication was
performed by this audit.
