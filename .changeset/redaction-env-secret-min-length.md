---
"@dojocoding/hacienda-sdk": patch
---

Stop redacting short and boolean-like values of secret-named environment variables.

Environment-derived redaction previously treated the value of every variable
whose name contained `PIN`, `TOKEN`, `SECRET` and similar as a secret, with no
minimum length. `COREPACK_ENABLE_AUTO_PIN=0` therefore replaced every `0` in
diagnostics (`409` became `4[REDACTED]9`). Known Hacienda credentials
(`HACIENDA_PASSWORD`, `HACIENDA_P12_PIN`, `HACIENDA_USERNAME`) are still
redacted from 4 characters; other secret-named variables only from 8
characters. Boolean-like values (`0`, `1`, `true`, `false`, `yes`, `no`, `on`,
`off`) are never treated as secrets.
