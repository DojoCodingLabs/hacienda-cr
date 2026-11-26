---
"@dojocoding/hacienda-sdk": minor
"@dojocoding/hacienda-mcp": patch
---

Add an explicit `Scope` (`ScopeSchema`, `ScopeEnvironmentSchema`, `ScopeIssuerSchema`, `fingerprintScope`) for multi-tenant SDK consumers, and scope-aware MCP client caching.

`Scope` carries an optional `tenantId`, the `environment` and the issuer
(`idType` validated with `CedulaTypeSchema`). It is meant for services built on
the SDK; the CLI and MCP tools do not accept a scope and derive it from the
selected profile. The MCP client cache now validates the derived scope with
`ScopeSchema`, rejects a scope that does not match the profile with
`SCOPE_IDENTITY_MISMATCH`, keys clients by profile and scope, and keeps at most
16 authenticated clients (least recently used evicted). Numbering is unchanged:
`tenantId` is not part of any sequence key.
