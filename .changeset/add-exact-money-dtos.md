---
"@dojocoding/hacienda-shared": minor
"@dojocoding/hacienda-sdk": minor
"@dojocoding/hacienda-cli": minor
"@dojocoding/hacienda-mcp": minor
---

Add additive exact decimal-text document DTOs, calculation and XML builders for all seven v4.4 documents and `MensajeReceptor` in the shared/SDK API. The CLI (draft validation/submission) and MCP (`create_invoice_exact`) exact inputs are Factura Electrónica (01) only. Decimal bounds follow the official XSD (`TarifaExonerada` and the alcohol `Porcentaje` allow 4 digits with 2 decimals) and an IVA `tarifa` must match its `codigoTarifaIVA`. Like the current exact family, line discounts cascade on the remaining base (each strictly smaller than it) and `medioPago` is required unless the sale condition is 02, 08 or 10. CLI drafts saved by 0.13.0 with a numeric `tarifa` keep loading and keep their verbatim XML bytes. Existing `Number` APIs and published bytes remain unchanged; this change does not promote 1.0.
