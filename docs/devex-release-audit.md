# Developer experience and npm release audit

Audited 2026-10-03 against main commit `4e89886` (PR #30 merged).
This is a scoped backlog and release plan; no versions, tags, registry settings,
or published packages were changed. The original checkout has unrelated local
changes and predates main; inspection used the attached clean worktree.

## Recommendation

Make the release-preparation fixes below, then prepare a **0.4.0 release PR**.
`pnpm exec changeset status` plans 0.4.0 for all four packages; the public registry
currently reports 0.3.0 as latest for all four. Keep the existing linked-package
policy for this release. Linked groups do not guarantee every package releases
on every future change; do not assume this policy behaves like a fixed group.

## Confirmed findings and scoped work

| Priority                        | Finding and evidence                                                                                                                                                                                                 | Implementation scope                                                                                                                                                                                                                                   | Acceptance criteria                                                                                                                                                                                                                                                   |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Before release                  | CLI reports `0.0.1` from `packages/cli/src/main.ts`; MCP advertises the same hardcoded version in `packages/mcp/src/server.ts`, while manifests are 0.3.0.                                                           | Derive both versions from their own package manifest, retaining a usable source/test path.                                                                                                                                                             | Installed `hacienda --version` and MCP initialization metadata equal each packed manifest after a version bump; no manual source edit.                                                                                                                                |
| Before release                  | SDK README quick start fails strict compilation: string `sandbox` is not the Environment enum and `02` is not IdType.                                                                                                | Use exported enum values; compile the actual documented example as part of consumer checks.                                                                                                                                                            | Exact quick-start code compiles against installed artifacts with NodeNext and bundler resolution, without authenticating or needing real secrets.                                                                                                                     |
| Before release                  | MCP README calls `proveedorSistemas` optional with an issuer fallback; the tool now requires the actual provider ID. CLI README calls XML validation structural although it now performs XSD validation.             | Reconcile package READMEs, use stable GitHub documentation links, and include migration guidance in SDK tarballs (currently only dist/README/LICENSE/manifest are packed). Explain timeout, redirect and POST/PATCH retry changes.                     | Package docs match tool schemas/CLI behavior; every shipped migration link resolves from npm/GitHub, including instructions for ambiguous submission failures.                                                                                                        |
| Before release                  | Root alone declares Node >=22; all four packed manifests omit engines. Every export map lists import before types.                                                                                                   | Add per-package Node >=22 engines and public publishConfig; put types first in export maps. Use Node 22 types for the supported runtime floor rather than root @types/node 25.                                                                         | Tarball manifest assertions check engines, public access, exports and resolved internal dependencies; no workspace protocol escapes into artifacts. Fresh TypeScript consumers still compile. Export ordering is compatibility hygiene; current consumer probes pass. |
| Before release                  | Tag-triggered publish.yml does not run test:packages and does not install xmllint, so native XSD conformance tests can silently skip. No tag/version agreement or registry preflight exists.                         | Add an explicit release preflight: require expected package versions/tag and consumed changesets, install xmllint, run all validation and packed consumers before any publication. Use one verification entry point locally and in CI.                 | A bad tag, existing target version, failed installed-package test or missing conformance tool fails before publishing the first package. All four candidate versions are checked before starting.                                                                     |
| Before release                  | Workflow publishes four packages sequentially and unconditionally; reruns after a partial publish start at already-published versions. Root release script uses a different Changesets publish path.                 | Document one release path; add recovery that checks package/version identity and skips only artifacts verified as already published from the same release. Serialize releases across tags. Provide a documented recovery command/workflow entry point. | Simulate failure after shared/SDK publish and safely finish CLI/MCP on rerun. Registry/network errors fail closed; no unpublish, forced overwrite, or blindly skipped package.                                                                                        |
| Next DX pass                    | All Vitest configs declare v8 coverage but the provider is absent. A direct SDK coverage invocation fails with MISSING DEPENDENCY @vitest/coverage-v8.                                                               | Add a provider matching Vitest, coverage/watch scripts and targeted critical-module reporting.                                                                                                                                                         | Coverage works on a fresh frozen-lockfile install. Avoid an arbitrary repository-wide percentage gate; establish meaningful baselines before setting thresholds.                                                                                                      |
| Next DX pass                    | No root verify/watch scripts or contributor/release runbook. CLAUDE.md still claims MCP bundles workspace dependencies and tokens persist to disk. .env.example omits HACIENDA_P12_PATH and links to MASTER_PLAN.md. | Add CONTRIBUTING.md/release runbook, pnpm verify, filtered watch instructions, local xmllint prerequisites, and correct stale guidance/environment template.                                                                                           | Follow documented setup from a fresh clone; one command reproduces CI checks, and credential-free commands do not make live calls.                                                                                                                                    |
| Next DX pass                    | New packed checks cover runtime but not strict TypeScript consumers, binary version metadata or unsupported runtime declarations.                                                                                    | Extend the existing package test harness rather than introducing a second overlapping harness; assert versions/metadata and compile consumer examples.                                                                                                 | CI covers Node 22/24 runtime installation and NodeNext/bundler type resolution with skipLibCheck false; examples use public exports.                                                                                                                                  |
| Separate publishing improvement | Workflow requests id-token write but still uses NPM_TOKEN, and no provenance option is present. Registry trusted-publisher settings were not inspected.                                                              | Configure trusted publishing separately for each package, pin a supported npm CLI, publish verified pnpm-produced tarballs through npm OIDC, and verify provenance before retiring the token path.                                                     | Trusted-publisher workflow/repository identities match; authentication and provenance succeed for every package. Do not remove the working token path until setup is confirmed.                                                                                       |

## Suggested delivery order

1. **Package consumer and documentation PR** (small, roughly one working day):
   versions, engines/exports, README fixes, shipped migration notes, and expanded
   installed-consumer assertions. This keeps publication infrastructure unchanged.
2. **Release workflow PR** (medium, roughly one to two working days): one
   verification entry point, native XSD prerequisites, preflight/version/tag
   checks, safe partial-release recovery and a release runbook. Test workflow
   logic with a mocked registry; no publication is needed to verify it.
3. **Contributor tooling PR** (small, roughly half to one working day): coverage,
   watch commands, runtime-floor types and corrected contributor/agent guidance.
   This can follow 0.4.0 if the release-preparation checks already cover the floor.
4. **Trusted publishing** (separate from the version PR): workflow plus npm-side
   configuration for each package. Timing depends on package-owner access.
5. **Release PR**: run Changesets versioning, update the lockfile and changelogs,
   review the 0.3.0 -> 0.4.0 migration, then run verification on the versioned
   commit. Tag only the approved release commit and publish through the tested
   workflow. Verify all registry versions/dist-tags and install published
   artifacts once publication finishes.

Estimates are scoping estimates, not completion guarantees. Retain the current
public API and ESM format; a CJS build, API redesign, additional frameworks and
new invoice features are outside this release-preparation scope.

## Evidence and boundaries

- Packed all four current packages and installed them into a fresh consumer.
  SDK/shared/MCP public imports compile with TypeScript 5.9.3, @types/node 22,
  strict true, skipLibCheck false under NodeNext and bundler resolution.
- Compiled the exact SDK README quick-start block: TS2322 for environment and
  idType. Root README already uses the enum values correctly.
- CLI --version returns 0.0.1. MCP source metadata independently hardcodes 0.0.1.
- Inspected packed files: manifests, compiled runtime/declarations, README and
  LICENSE are included; SDK MIGRATION-v4.4.md is absent. pnpm correctly rewrites
  workspace dependencies to exact package versions during packing.
- Coverage invocation fails before tests due to the missing provider; this is
  not a newly failing product test. No dependencies were installed into the repo.
- PR #30's full CI and installed-runtime matrix were already green; this audit
  adds consumer/docs probes rather than claiming a new full test-suite run.
- The existing credential-gated lifecycle test only asserts credential presence.
  A genuine sandbox lifecycle suite should be separately scoped, explicitly
  opt-in and isolated from production; do not claim live Hacienda acceptance.
- One unpatched Forge verification advisory remains tracked in
  security-hardening.md. Re-audit the release candidate and preserve that
  disclosure; do not suppress it to obtain a green audit.

## Research

- [TypeScript exports guidance](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-7): types condition should come first.
- [Changesets linked packages](https://changesets.dev/guide/linked-packages): linked groups only release packages with changesets or dependent release requirements.
- [Changesets versioning and publishing](https://changesets.dev/guide/versioning-and-publishing): versioning and publishing are distinct steps; Changesets creates per-package tags, unlike this repo's current v* workflow trigger.
- [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/): GitHub-hosted runners are supported; npm >=11.5.1 and Node >=22.14.0 are required, with a configured package/workflow relationship. OIDC publishing generates provenance.

## Implementation update

CLI/MCP read their adjacent manifest in both source and installed builds; no generated version file is required.

The release-preparation branch implements the scoped repository changes and
versions all four packages to 0.4.0. The initial findings above describe the audit
baseline. A genuine sandbox suite now replaces the credential-presence placeholder
but has not been run with real credentials. npm-side trusted publishers and token
retirement require package-owner configuration; the workflow supports OIDC while
retaining token fallback until that external setup is verified. No tag or npm
publication is part of this branch.
