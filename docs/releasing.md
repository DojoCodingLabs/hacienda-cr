# npm release runbook

## Prepare a version PR

1. Merge product/DX changes with their changesets. Run `pnpm changeset status` and
   review the intended versions. The prepared 0.9.0 release tightens current exact FE credit terms and document-family sale conditions, adding explicitly read-only historical schema/calculation helpers. Consumers must independently bind immutable producer/bytes, preserve historical omission/identity and version current proof rules; see [credit-term migration](exact-fe-credit-terms.md). The historical 0.8.0 release corrects read-only history metadata and adapters with an explicit minor migration; it changes no fiscal rules or mapping. Application adoption must separately preserve immutable historical FE/NC SDK 0.7 proofs/cases and keep activation independent. See [history migration](history-contract.md). The historical 0.7.0 release adds exact total NC for one ordinary domestic IVA13 FE in CRC/USD, with its own identity, a matching immutable original reference and the current annex's explicit 3–180-character reason. It preserves legacy numeric and exact FE APIs. The caller must independently establish original acceptance, unused total-credit authority and the ten-year reference limit from its trusted issuance/submission clock; no partial credit, rejected-document replacement, refund or fiscal acceptance is inferred.
2. Run `pnpm version-packages`, then `pnpm install --lockfile-only`. Review package
   manifests, internal dependencies, changelogs and consumed changesets together.
3. Run `pnpm verify` and `pnpm test:coverage`. Review the packaged migration guide.
   Re-run `pnpm audit`; preserve the documented unpatched Forge advisory rather
   than suppressing it. Offline suites do not establish live Hacienda acceptance.
4. Commit and open the version PR; merge only after review and green CI.

## Prepare and publish the approved commit

Use a clean checkout of the approved main commit. Do not publish from a dirty
checkout. The release script checks all four versions against the same stable tag
and requires all pending changesets to have been consumed.

```sh
pnpm release:prepare --tag v0.9.0
```

This checks registry availability, runs full verification and packs exact tarballs
into ignored `.release/v0.9.0/packed`. It tests those actual tarballs and records
the commit and SHA-512 integrity. Preparation does not publish or create a tag.
CI uses npm 11.21.0 on Node 22; local publishing requires a provenance-capable CI
identity and is intended to run in the GitHub workflow.

When the version PR is approved and merged, create and push an annotated `v0.9.0`
tag pointing at that exact main commit. This triggers publish.yml. The workflow
verifies the tag/main relationship, installs native xmllint, repeats preparation,
then publishes the verified tarballs in shared -> SDK -> CLI -> MCP order.
Publication is serialized across release tags. Dependency maps in final tarball
manifests are canonicalized, preserving conditional-export order. The root release command uses
this same verified path; Changesets publish is not a second supported path.

## Recover a partial release

npm publication is not atomic. If a package fails after an earlier publish,
leave the original tag intact. Inspect the workflow failure and artifact download.
Re-run publish.yml using workflow_dispatch with the same existing tag and resume
checked, and prepared_run_id set to the original successful preparation/publish
run. Download its saved artifacts rather than rebuilding them. Registry lookups must succeed; 5xx, authentication/network errors or
malformed metadata never count as an absent version.

Recovery restores and verifies the saved artifacts, then skips only versions whose registry
name, version and tarball integrity exactly match this release. Different bytes
fail closed; never unpublish or overwrite a conflicting version. If a runner or
build change causes different bytes, recover from the saved verified artifacts
using the same checkout and release.json, rather than bypassing integrity checks:

```sh
pnpm release:publish --tag v0.9.0 --resume
```

Run this in a correctly authenticated provenance-capable CI environment after
restoring `.release/v0.9.0` and the exact release commit. The script verifies every
file/commit before writing to npm and verifies each registry artifact afterwards.
After a successful publish, verification waits up to 37 lookups with five-second
intervals for npm indexing, always checking the exact integrity once visible.
If that bounded wait expires, inspect the registry and use recovery; do not assume
it failed to publish. Registry errors and conflicting bytes fail immediately.

Once all four versions exist, check npm dist-tags (`latest`), provenance and fresh
installations of the registry artifacts. Announce only after all packages pass.

## Configure trusted publishing

The workflow supports OIDC while retaining the existing token path until setup is
confirmed. For each @dojocoding/hacienda-{shared,sdk,cli,mcp} package, a package
owner must configure the npm trusted publisher for organization DojoCodingLabs,
repository hacienda-cr, workflow publish.yml (GitHub-hosted runners).

Set repository variable NPM_TRUSTED_PUBLISHING=true only after all four publishers
are configured. The OIDC step receives no npm token; npm automatically exchanges
the GitHub identity. After successful publishing and provenance verification for
all four packages, revoke NPM_TOKEN and remove its fallback path. Never print
credentials to verify configuration. The repo cannot establish the npm-side
trust relationship by changing YAML alone.

See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) for setup
and requirements (npm >=11.5.1, Node >=22.14.0), and
[Changesets versioning](https://changesets.dev/guide/versioning-and-publishing).
