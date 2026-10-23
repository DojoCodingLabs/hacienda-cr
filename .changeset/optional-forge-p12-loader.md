---
"@dojocoding/hacienda-sdk": minor
---

Load PKCS#12 credentials only when the parser is installed.

`node-forge` is now an optional peer dependency instead of a required runtime
dependency. Consumers that never call `loadP12` no longer install it and no
longer inherit its open advisory in `npm audit --omit=dev`. Consumers that load
`.p12` files must install it explicitly:

```bash
npm install node-forge
```

Without it, `loadP12` rejects with an actionable `SigningError` before reading
the file and never echoes the PIN. Parsing, the 1 MiB limit, RSA >= 2048,
certificate validity, key/certificate matching and signing behavior are
unchanged when the parser is present. Issue #69 remains open: this reduces
exposure, it does not replace the library.
