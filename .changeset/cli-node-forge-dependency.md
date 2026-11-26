---
"@dojocoding/hacienda-cli": patch
---

Declare `node-forge` as a CLI dependency.

The SDK now treats `node-forge` as an optional peer, but `hacienda sign` and
`hacienda submit` load `.p12` certificates through `loadP12`. The CLI therefore
depends on `node-forge` directly so a default `npm install -g
@dojocoding/hacienda-cli` keeps signing without any extra step.
