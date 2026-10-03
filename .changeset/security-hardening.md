---
"@dojocoding/hacienda-sdk": minor
"@dojocoding/hacienda-cli": patch
"@dojocoding/hacienda-mcp": minor
"@dojocoding/hacienda-shared": patch
---

Harden cancellation, submission deadlines, response/XML limits, certificate
readiness, secret-safe diagnostics and retry semantics. Fix standalone MCP ESM
startup and validate inputs before sequence allocation. Update security-sensitive
dependencies and add hostile-input, cryptographic, local HTTP lifecycle,
multiprocess sequence and installed-package regression suites.

Submission timeout now covers POST and polling; POST/PATCH are not automatically
retried. HTTP requests default to a 30-second deadline and reject redirects.
See docs/security-hardening.md for input caps and remaining trust boundaries.
