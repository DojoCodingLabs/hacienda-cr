---
"@dojocoding/hacienda-shared": minor
"@dojocoding/hacienda-sdk": minor
---

Refuerza la validación semántica de `InformacionReferencia` (Ítem 1 del `sdk-robustness-audit.md`):

- `tipoDoc === "99"` requiere `tipoDocOtros` (y viceversa); `codigo === "99"` requiere `codigoOtros` (y viceversa).
- `ReciboElectronicoPago` admite el motivo de referencia `"17"` (pago de comprobante); otros documentos lo rechazan.
- IVA `"07"` (cálculo especial) exige `codigoTarifaIVA`; la correspondencia `tarifa` ↔ `codigoTarifaIVA` solo aplica a `"01"`.
- IVA `"08"` (bienes usados) exige `factorCalculoIVA`.

Es un endurecimiento de entrada: documentos que antes se aceptaban (p. ej. `tipoDoc !== "13"` sin `codigo`) ahora se rechazan. En paquetes pre-1.0 esto es un cambio de ruptura (`minor`). Consulta `MIGRATION.md` para los patrones de corrección.
