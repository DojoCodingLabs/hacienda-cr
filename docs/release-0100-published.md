# Verified SDK 0.10.0 publication

Verified on 18 October 2026. All four packages are published, have latest=0.10.0, match the independently reviewed tarballs and pass fresh registry consumers. This is SDK artifact verification, not app adoption or fiscal acceptance.

## Immutable identity

- Version PR: https://github.com/DojoCodingLabs/hacienda-cr/pull/94
- Reviewed candidate: `8e15419383bfa6ed83a9527e126033393ecc01c7`.
- Exact merged source: `db3a97daec5b7d12dbd814d59bcdd2a9a561c0cf`; tree identical to the candidate.
- Annotated tag `v0.10.0`: object `72c30d93f757799e26ea3f76ac8ae4b4880bea05` points to that source.

## Publication and recovery history

The single tag push triggered [original run 39129930452](https://github.com/DojoCodingLabs/hacienda-cr/actions/runs/39129930452). Preparation and packed consumers passed; npm acknowledged shared at 13:06:48 UTC with provenance. The bounded exact-version indexing wait expired at 13:09:55 UTC, so that run failed before attempting SDK/CLI/MCP. This failure remains part of the release record.

Read-only monitoring observed exact shared 200 with the original integrity and the other three exact versions absent at 13:13:14 UTC. One authorized [recovery run 39130633257](https://github.com/DojoCodingLabs/hacienda-cr/actions/runs/39130633257) used the SAME tag/source, `resume=true`, `prepared_run_id=39129930452`. It restored original saved artifacts, passed their installed consumers, skipped rebuilding and shared, and published SDK/CLI/MCP. Recovery finished SUCCESS at 13:19:43 UTC. No retag, new source, artifact rebuild, overwrite, unpublish, direct local publish, token read, billing or publishing-policy change occurred.

Both saved CI artifact sets and the local reviewed/main preparations contain identical complete bytes and measured SHA-512 values for all four packages.

## Registry and provenance

| Package                       | Version/latest | Exact SHA-512 integrity                                                                           | Provenance run |
| ----------------------------- | -------------- | ------------------------------------------------------------------------------------------------- | -------------- |
| `@dojocoding/hacienda-shared` | `0.10.0`       | `sha512-9lfrb9xcONwX+YSb1MVUO/SINrq/+e/UMidIacw5kXWQ0/0O3/u65einfYG3apn2HPTi3eeivgQYI1cCjkQkiw==` | `39129930452`  |
| `@dojocoding/hacienda-sdk`    | `0.10.0`       | `sha512-stm7gjnL7/eEWGWQVJswP4wdMYptqM+VXUpHIvs+uF6Er14j+PxCBEJ8mQLSSJV1HB+igax1MMRJulzfhLXNpw==` | `39130633257`  |
| `@dojocoding/hacienda-cli`    | `0.10.0`       | `sha512-n10G2k8nvCDB4ipt25l9U1cOg6VdyAmgkCpNiyNCT/RaKzCpTANwh/2e1cvfWnE4M2mETOkHuBrjzJJg5Na1tA==` | `39130633257`  |
| `@dojocoding/hacienda-mcp`    | `0.10.0`       | `sha512-lBzr5z57AJOkfsMDD0bT7E8U8sLAfyNVK3rAOwRlVe4+zHFV9FyihpZ45y1/8wopRG89Z+wUbPU0e11Y395ApQ==` | `39130633257`  |

For each package, checks independently covered exact registry identity/version, latest tag, matching internal dependencies, actual downloaded bytes, SLSA in-toto subject digest, source commit, `refs/tags/v0.10.0`, repository, `.github/workflows/publish.yml`, GitHub-hosted builder and exact invocation run. Shared correctly retains original-run provenance; the other three reference recovery.

## Fresh consumer and signatures

- A new consumer installed all four exact versions directly from npm. Its package lock resolves registry URLs with the four reviewed integrities and no local/symlink package authority.
- `npm audit signatures --json` exited 0 with `invalid: []` and `missing: []`.
- The complete installed-consumer suite then used the actual registry-downloaded tarballs: strict TypeScript, ESM, exact source/JSON/XML/native validation, signing/response guards, CLI validation/dry-run and MCP stdio passed. All provider effects remained synthetic/offline.
- Source/version preparation passed full verify (1,535 units plus four intentional live skips, 118 script tests, four consumers), coverage and exact merged-main official release preparation.

## Risks and limits

The audit still has high node-forge GHSA-86w9-cpqp-85rv and moderate development ExcelJS→uuid GHSA-w5hq-g745-h8pq. Signature/provenance success is not a clean vulnerability audit; no suppression or dependency override was used. SDK issue #69 remains open.

The release provides the reviewed bounded exact TE/ND/credit extensions/FEC/recipient-source APIs and stricter current FE native boundaries, preserving explicit retained/Number paths. Exact REP monetary projection, recipient transport/outcome correlation, broader regimes, legal qualification/timing, app adoption and real Hacienda acceptance remain separate. No app worker/case/target/provider/cloud resource was activated.

The existing workflow also emitted Node-action deprecation and upcoming ubuntu-latest image notices. No infrastructure or workflow change was made in this release.

## Reproducible public checks

Use `npm view @dojocoding/hacienda-{shared,sdk,cli,mcp}@0.10.0` separately to inspect each exact version and its integrity/attestation URL. Download the registry tarballs and compare complete bytes with the reviewed manifest, not merely version strings. Inspect the attestation's subject digest, source commit, tag, workflow and invocation; shared belongs to the original run, while SDK/CLI/MCP belong to recovery.

A fresh installation of all four exact registry versions and `npm audit signatures --json` checks installed package provenance independently. The repository's installed-consumer suite verifies the packed public exports and CLI/MCP behavior; its offline provider fixtures are not real fiscal acceptance. The immutable workflow runs linked above preserve preparation, publication, the initial indexing failure, saved artifacts and exact recovery.

The first local post-merge preparation also stopped because its pack directory was nonempty. That original preparation was preserved, then the unchanged official command passed in an empty stage. No false initial pass is claimed.
