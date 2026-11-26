---
"@dojocoding/hacienda-sdk": patch
---

Upgrade the XML-signature runtime: `xadesjs` 3.1.0, `xmldsigjs` 3.1.0 and
`xpath` 0.1.0 (plus `smol-toml` 1.9.1). Signed output is byte-identical to the
2.x libraries for the same input, key, signing time and random IDs. The new
transitive `pkijs`/`asn1js` 4 peers are installed automatically by npm 7+ and
pnpm. The 3.x libraries are ESM-only and declare Node.js
`^20.19.0 || >=22.12.0`, so use Node.js 22.12 or later.
