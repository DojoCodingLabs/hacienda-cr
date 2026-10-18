# SDK 0.7.0 published release

Verified 18 October 2026 (UTC). All four public npm packages were published at **0.7.0**, with `latest=0.7.0` at verification time. The annotated [v0.7.0 tag](https://github.com/DojoCodingLabs/hacienda-cr/tree/v0.7.0) points to exact reviewed main commit [`93dc3d20015f2c4a1746aecd2bc6d4c0d64f7959`](https://github.com/DojoCodingLabs/hacienda-cr/commit/93dc3d20015f2c4a1746aecd2bc6d4c0d64f7959), following [version PR77](https://github.com/DojoCodingLabs/hacienda-cr/pull/77). The [preparation checkpoint](release-070-preparation.md) remains historical; this record describes the actual publication.

## Package identities and provenance

Actual npm tarball SHA-512 values equal the independently reviewed candidate, fresh merged-main artifacts, original CI artifacts and recovered CI artifacts. Packed internal dependencies resolve exact `0.7.0`. Public metadata and attestations permit rechecking these identities:

- [@dojocoding/hacienda-shared@0.7.0](https://registry.npmjs.org/@dojocoding%2fhacienda-shared/0.7.0): `sha512-oOjiS/NRZV4s3uj2cJA71xxci8G5U6xRXvttpsYgLV56opjn3umSQgDWHSiBIE7wcOuCOFm2A2miieS9VqsIVg==`. [SLSA attestation](https://registry.npmjs.org/-/npm/v1/attestations/@dojocoding%2fhacienda-shared@0.7.0), invocation `39091097401/attempts/1`.
- [@dojocoding/hacienda-sdk@0.7.0](https://registry.npmjs.org/@dojocoding%2fhacienda-sdk/0.7.0): `sha512-Nu05br/BpHta6efiKmVy+C0NJEEykMxkJmWimnB3X4/EqfUQd/8nguVtYhDQPb5jXJ91/du7x/culJiIRRZZ/w==`. [SLSA attestation](https://registry.npmjs.org/-/npm/v1/attestations/@dojocoding%2fhacienda-sdk@0.7.0), invocation `39091097401/attempts/1`.
- [@dojocoding/hacienda-cli@0.7.0](https://registry.npmjs.org/@dojocoding%2fhacienda-cli/0.7.0): `sha512-E4bu6nF+a+5+Q4OPX3CZybAZNhQCo3c5vj5cDLdZnVMVsmoZKCJajc5BDx/vIxOGpvqGqOx8smQZBMOvkLfkqg==`. [SLSA attestation](https://registry.npmjs.org/-/npm/v1/attestations/@dojocoding%2fhacienda-cli@0.7.0), invocation `39091097401/attempts/1`.
- [@dojocoding/hacienda-mcp@0.7.0](https://registry.npmjs.org/@dojocoding%2fhacienda-mcp/0.7.0): `sha512-8Wn2mKM05X7OIO8Fjm75gQ5AveEfNmXkYSPlgNefH/OXmwsSRVCzAlMxZjeiozC8jJN96CCqYKTPM7F+aK8sZQ==`. [SLSA attestation](https://registry.npmjs.org/-/npm/v1/attestations/@dojocoding%2fhacienda-mcp@0.7.0), invocation `39091725464/attempts/1`.

Every SLSA subject matches the measured tarball hash. All four attestations identify the same source commit, `refs/tags/v0.7.0`, `DojoCodingLabs/hacienda-cr`, `.github/workflows/publish.yml` and the GitHub-hosted runner builder. Shared/SDK/CLI correctly identify the original run; MCP identifies the recovery run. Claim inspection was supplemented by cryptographic `npm audit signatures --json`, which exited 0 with `invalid:[]` and `missing:[]`.

## Indexing delay and exact-artifact recovery

[Original Publish run 39091097401](https://github.com/DojoCodingLabs/hacienda-cr/actions/runs/39091097401) acknowledged publication of shared, SDK and CLI. Its bounded CLI registry-visibility wait then expired; MCP was not attempted. Acknowledgment followed by a temporary registry 404 was not treated as permission to publish CLI again.

After independent exact version endpoints confirmed the first three packages and reviewed integrities, with MCP still absent, one documented [recovery run 39091725464](https://github.com/DojoCodingLabs/hacienda-cr/actions/runs/39091725464) used the same tag/source, `resume=true` and `prepared_run_id=39091097401`. It restored the original `release-v0.7.0` artifact, verified its installed packages, skipped the three exact registry matches and published only MCP. Recovery completed **SUCCESS**. Both runs retain their `release-v0.7.0` workflow artifact with `v0.7.0/release.json` and the four packed tarballs; measured manifests and bytes match the reviewed source. No retag, artifact rebuild, conflicting overwrite, unpublish, local publish or billing/authentication/policy change occurred. See the [release runbook](releasing.md) for the recovery contract.

## Verification and limits

A fresh exact-version registry installation completed. Consumers installed from actual npm-downloaded tarballs passed strict TypeScript/native ESM, exact FE/NC JSON/XML, signing/response guards, CLI validation/dry-run and MCP stdio checks. Source verification also includes independent Python Decimal and native official NC XSD cases. Offline/synthetic tests do not establish real Hacienda acceptance.

The release adds only the named exact ordinary domestic IVA13 total-credit case for one immutable FE in CRC/USD. The caller must independently establish accepted original evidence, unused correction authority and the ten-year reference limit against its trusted issuance/submission clock. Partial credit, rejected-FE replacement, refund and other regimes are not inferred. Legacy numeric and exact FE contracts remain available; see [SDK usage](../packages/sdk/README.md).

Known findings remain visible: high unpatched `node-forge` [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv), and moderate `uuid` through root-development `exceljs` [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq). Signature/provenance success is not a clean vulnerability audit. See the [Forge reachability audit](forge-reachability-audit.md); no advisory suppression or forced dependency override was used.

Publication does not adopt this version in a consuming application or activate fiscal cases, targets, credentials, workers, mail or customer delivery. App adoption and real fiscal acceptance require their own reviewed evidence.
