---
"@dojocoding/hacienda-sdk": minor
"@dojocoding/hacienda-cli": minor
"@dojocoding/hacienda-mcp": minor
---

Validate XML offline against the vendored Hacienda v4.4 schemas before submission.
Fix discount totals, reconcile summaries with detail, serialize sequence resets
and increments, and enforce concurrent API rate limits. Return nonzero CLI exit
codes for rejected submissions. MCP invoice creation requires the actual system
provider ID and validates generated documents; its JSON schema resource now
reflects the tool input schema.
