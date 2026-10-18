# 0.10.0 preparation: reviewed exact source APIs

This version preparation starts from SDK main
`e8fa2ed02e8c60225088163e4f78a61c27ed93f6`, including reviewed source PRs
86–93, after published 0.9.0. It changes versions, generated changelogs and release
guidance only. It does not add runtime behavior, dependencies, a tag, publication,
application adoption or live fiscal activation.

## Package identity and scope

Changesets' actual linked plan gives all four packages 0.10.0:
`@dojocoding/hacienda-{shared,sdk,cli,mcp}`. Eight minor Changesets are consumed
together. Internal workspace dependencies remain `workspace:*`; packed manifests
must resolve to the matching 0.10.0 family. The unchanged lockfile reflects no
dependency-resolution change, not an omitted install. CLI/MCP dependency updates
do not imply new family-specific commands or transport tools.

The reviewed APIs comprise exact ordinary domestic TE; original-bound ND monetary
increments; partial NC monetary corrections and rejected-FE replacement; ordinary
IVA13 domestic FEC, explicitly chosen foreign-service IVA13 FEC and independently
qualified non-subject personal-used-goods FEC; and original-bound recipient-message
XML. Current FE party names and positive supplied allocations now follow their
native boundaries. Existing Number APIs and explicit read-only retained source
calculation remain separate. Consumers must not silently relabel a frozen 0.9
producer/proof tuple as 0.10 or use retained read compatibility for new signing.

These are bounded source/schema/calculation/XML contracts. They do not establish
source authenticity, supplier or tax-regime qualification, input-credit rights,
unused cumulative correction authority, legal timing, institutional acceptance,
application permissions, cash receipt or customer delivery. Published artifacts
make reviewed source available; they do not authorize those external effects.

## Remaining work and genuine release gates

- Exact REP remains incomplete: a current reviewed partial-payment XML monetary
  oracle is still required. Native-valid contradictory totals are not authority.
  Legacy REP is not relabeled as a completed exact producer.
- Recipient-message transport, durable recovery and institutional outcome
  correlation remain open. Generic status by the original clave cannot by itself
  distinguish the buyer's new confirmation. The new XML builder supplies none of
  that authority.
- Broader tax regimes/families, legal/current policy evidence and actual sandbox
  acceptance remain issue #85 work. Release does not close full V1 readiness.
- Before merging the version PR: full verification, coverage, visible dependency
  audit and independently inspected actual tarballs/manifests/integrities are
  required. After merge: re-prepare from clean exact main and compare all four
  artifacts before creating the one reviewed annotated tag.
- Publication uses the existing provenance-capable GitHub Publish workflow. Verify
  registry identity/integrity, dist-tags, provenance and fresh consumers for all
  four before announcing success. A partial/indexing failure preserves the same
  tag and saved artifacts for documented recovery; no conflicting republish.

Neither the runbook nor the artifact validator requires completion of every V1
family before releasing these reviewed contracts. The remaining product work is
not an invented publication prohibition. Required release checks, precise scope,
reviewed artifact identity and visible unresolved risks still apply.

## Dependency risks

The fresh candidate audit still reports one high `node-forge` finding
[GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv) and one
moderate development ExcelJS → `uuid` finding
[GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq), with no
critical findings. Audit exits nonzero for these findings. This is not a clean
audit or remediation release. The existing [call-path assessment](forge-reachability-audit.md)
and [security limits](security-hardening.md) remain bounded assessments; issue #69,
upstream remediation and its targeted regression remain open. No override,
suppression, dependency change or universal-safety claim is introduced.

## Preparation versus publication

The reviewed preparation command is `pnpm release:prepare --tag v0.10.0` from a
clean committed candidate. It verifies and records the actual four tarballs but
does not publish. Only after version/source/artifact review and merged-main
comparison may the annotated tag point at that exact main commit and trigger the
existing workflow. This document is a preparation checkpoint, not a claim that
0.10.0 is published or adopted.

## Local candidate verification

On 18 October 2026, the candidate passed `pnpm verify`: 1,535 unit tests
(247 shared, 1,164 SDK, 75 CLI, 49 MCP), four intentional live-test skips,
118 script regressions and all four fresh packed consumers. Native XSD and
independent Decimal source regressions are included in that offline suite.
`pnpm test:coverage` also passed all eight tasks; some unchanged build tasks
were cached. `pnpm audit --json` produced the two disclosed findings above.
Changed-file formatting, relative documentation links and `git diff --check`
passed. The source-main CI run
[39126307888](https://github.com/DojoCodingLabs/hacienda-cr/actions/runs/39126307888)
succeeded; that is evidence for the source base, not this later version PR or
publication. Exact release preparation and independent artifact review remain
separate steps below the version/source review boundary.
