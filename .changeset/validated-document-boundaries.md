---
"@dojocoding/hacienda-sdk": patch
"@dojocoding/hacienda-shared": patch
"@dojocoding/hacienda-mcp": patch
"@dojocoding/hacienda-cli": patch
---

Correct shared fiscal document codes, preserve current official schema provenance, enforce document identity and tax consistency, and use Costa Rica calendar dates in claves. Scope MCP invoice numbering by issuer/environment and invalidate authenticated clients after profile or credential changes. Preserve existing HTTP cancellation and redirect protections, make token deadlines configurable, disable mutation replays by default, and redact diagnostic secrets. Add regression coverage and document actual sandbox reception failures separately from offline test success. Live acceptance of all document families remains a release gate.
