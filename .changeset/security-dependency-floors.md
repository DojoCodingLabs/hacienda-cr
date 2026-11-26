---
"@dojocoding/hacienda-shared": patch
"@dojocoding/hacienda-sdk": patch
"@dojocoding/hacienda-cli": patch
"@dojocoding/hacienda-mcp": patch
---

Raise dependency floors past published security advisories.

- `node-forge` `^1.4.4` (SDK optional peer, CLI dependency). Forge 1.4.1–1.4.4
  fix the advisories reported against 1.4.0–1.4.2, including GHSA-jc66-7q78-782g
  (PKCS#12 MAC forgery and constant-key PBE with a zero iteration count, which is
  reachable through `loadP12`), GHSA-6qrw-m8cv-hcxf and GHSA-86w9-cpqp-85rv (RSA
  PKCS#1 v1.5 DigestInfo forgery), GHSA-7wch-p9px-956x (PEM decoding ReDoS) and
  GHSA-rhr8-3pm8-cq29 (ASN.1 BIT STRING resource exhaustion). Consumers that call
  `loadP12` or `signXml` must have `node-forge` 1.4.4 or later.
- `zod` `^4.6.7` in every package (GHSA-mrhx-c7xc-m3w5, memory exhaustion
  while validating oversized constrained collections).
- `fast-xml-parser` `^5.12.0` in the SDK (GHSA-474x-hrwr-fgx4, quadratic scan of
  unterminated stop-node tags).
- `@modelcontextprotocol/sdk` `^1.32.2` in the MCP server. The lockfile now resolves
  patched `body-parser`, `hono`, `@hono/node-server`, `qs`, `fast-uri` and
  `ip-address` within the existing transitive ranges; no runtime override is added.

No API, signing behavior or XML output changes.
