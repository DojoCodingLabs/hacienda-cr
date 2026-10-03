# MCP agent instructions

Read the [root instructions](../../AGENTS.md) first.

## Transport and contracts

`src/cli.ts` runs stdio transport. Reserve stdout for MCP protocol traffic; send
diagnostics to stderr. Never add startup banners or debug `console.log` calls.
Keep tool names, input schemas, descriptions, resource URIs, and response shapes
consistent with `src/server.spec.ts` and the package README.

Reuse SDK calculations, XML validation, and API clients. Validate inputs before
allocating persistent sequences. Keep resources and draft templates aligned with
accepted `create_invoice` inputs, including required provider/address fields.
Return tool failures using the existing `isError` response convention without
exposing secrets. Mark draft placeholders clearly instead of supplying invented
provider or taxpayer information.

## Tool side effects

- `draft_invoice` returns a JSON template with placeholders to complete.
- `create_invoice` returns unsigned XML and allocates a persisted sequence;
  it does not sign or submit. Do not describe it as read-only or invoke it on a
  user's real state for a smoke test.
- `lookup_taxpayer` performs a public network lookup.
- `check_status`, `list_documents`, and `get_document` use authenticated API
  access. Keep authentication and output handling in the existing adapters.

If tool capabilities change, update this list, tool descriptions, tests, resources,
and user-facing docs together. Future signing/submission tools need explicit
side-effect descriptions and behavior tests before being exposed.

## Verification

Use the in-memory transport and existing SDK mocks in `src/server.spec.ts` to
verify tool discovery, accepted inputs, errors, and resources. Mock sequence
allocation and network calls so routine tests do not consume user state.
Run `pnpm test:packages` after bundling or transport changes: it verifies the
installed MCP entry point and consumers beyond source-level tests. Follow
[testing](../../docs/testing.md) for the full gate and focused commands.
