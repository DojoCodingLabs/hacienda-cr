---
"@dojocoding/hacienda-sdk": patch
"@dojocoding/hacienda-cli": patch
---

Accept the full IDP username issued by Tico Factura without changing hyphens or the environment domain. SDK credentials support `username` plus `password`, with the existing identification-based format retained as a fallback. CLI login accepts `--username` or `HACIENDA_USERNAME`, saves the username separately from the taxpayer ID, and shared CLI/MCP bootstrap restores it (with an environment override). Profiles may omit a configured signing certificate by using an empty certificate path, allowing login to save successfully.
