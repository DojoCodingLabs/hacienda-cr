---
"@dojocoding/hacienda-sdk": minor
"@dojocoding/hacienda-cli": minor
"@dojocoding/hacienda-mcp": patch
---

Declare `2026/v4.4` as the current schema set and stop defaulting `ProveedorSistemas` silently.

- The vendored schema manifest now declares `currentSet: "2026/v4.4"`, the April 2026 revision of Anexos y Estructuras v4.4 that is mandatory since 2026-11-01 (Hacienda communication `ActualizacionAnexosyEstructurasVersion4.4CEv2.pdf`). `2024/v4.4` stays as the previous set. The SDK already embedded the 2026 XSDs, so runtime validation does not change.
- SDK: config profiles accept an optional `provider_id` (9–20 letters or digits), the identification of the invoicing-system provider emitted as `ProveedorSistemas`.
- CLI: `hacienda auth login --provider-id <id>` stores it (re-running login keeps it), `hacienda auth status` shows it, and `hacienda draft --profile <name>` uses it. Without `provider_id`, drafts keep the issuer's identification and print a warning (also returned as `warnings` with `--json`): per the Anexo, that value is correct only for a self-developed or custom-built system. Blank templates use the `<<SYSTEM_PROVIDER_ID>>` placeholder. `hacienda status` explains the clave format correctly (letters allowed only in the taxpayer ID segment).
- MCP: `create_invoice` and `create_invoice_exact` accept an alphanumeric `proveedorSistemas` of 9–20 characters (previously 9–12 digits only), matching the Anexo's "Permite ingresar números y letras para personas jurídicas", and describe the field as the software provider's identification.
