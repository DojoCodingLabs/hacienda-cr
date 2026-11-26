---
"@dojocoding/hacienda-shared": minor
"@dojocoding/hacienda-sdk": minor
---

Refuerza la validación semántica de `InformacionReferencia` (Ítem 1 de `docs/testing/sdk-robustness-audit.md`):

- `tipoDoc === "99"` requiere `tipoDocOtros` (y viceversa); `codigo === "99"` requiere `codigoOtros` (y viceversa).
- `ReciboElectronicoPago` admite el motivo de referencia `"17"` (pago de comprobante); otros documentos lo rechazan.
- La referencia del REP exacto exige `numero` (el XSD del REP exige `Numero`); `RepInformacionReferenciaSchema` y `DecimalRepReferenceSchema` se exportan.
- IVA `"07"` (cálculo especial) exige `codigoTarifaIVA`; la correspondencia `tarifa` ↔ `codigoTarifaIVA` solo aplica a `"01"`.
- IVA `"08"` (bienes usados) exige `factorCalculoIVA`.

Es un endurecimiento de entrada: documentos que antes se aceptaban con `tipoDoc`/`codigo` `"99"` sin su texto `*Otros` (o con `*Otros` sin `"99"`), con `codigo` `"17"` fuera del REP, o con una referencia REP exacta sin `numero`, ahora se rechazan. `codigo` sigue siendo opcional para cualquier `tipoDoc`, y el esquema legado sigue descartando claves desconocidas. En paquetes pre-1.0 esto es un cambio de ruptura (`minor`). Consulta `MIGRATION.md` para los patrones de corrección.
