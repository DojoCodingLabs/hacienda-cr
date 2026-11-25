## ADDED Requirements

### Requirement: El catálogo de referencias vendido queda bloqueado por paridad contra los XSD vendorizados

Las constantes `REFERENCE_DOC_TYPES`, `REFERENCE_CODES` y `REP_REFERENCE_CODES` de `shared/src/constants/document-references.ts` SHALL coincidir exactamente con las enumeraciones `TipoDocReferenciaType` y `CodigoReferenciaType` del XSD 2026 vendorizado en `packages/sdk/schemas/2026/v4.4/`. `REP_REFERENCE_CODES` SHALL ser el conjunto base más el código `"17"`. La suite SHALL incluir un test que lea los XSD vendorizados y verifique esta paridad; cualquier código añadido por Hacienda al XSD sin actualizar la constante SHALL hacer fallar el test.

#### Scenario: Paridad exacta con el XSD 2026

- **WHEN** se ejecuta la suite sobre el árbol vigente
- **THEN** el test de paridad pasa: las constantes y las enumeraciones del XSD 2026 coinciden elemento por elemento

#### Scenario: Código nuevo en el XSD sin actualizar la constante falla

- **WHEN** se añade un código a la enumeración `TipoDocReferenciaType` o `CodigoReferenciaType` del XSD 2026 sin actualizar la constante correspondiente
- **THEN** el test de paridad falla e identifica el código faltante

### Requirement: La documentación de procedencia del catálogo de referencias es honesta

Los comentarios de `shared/src/constants/document-references.ts` y de `scripts/codes-generate/table-map.mjs` SHALL describir con exactitud la procedencia: el XSD 2026 vendorizado contiene los códigos 19 y 20 de `TipoDocReferenciaType` y los códigos 13 a 16 de `CodigoReferenciaType`; `codes.json` permanece en el set 2024 porque faltan los auxiliares de ese set (ANEXOS, Codigodemoneda, Codificacionubicacion), y las constantes de referencias se curan a mano por encima del generador. NO SHALL afirmarse que el XSD vendorizado no contiene esos códigos.

#### Scenario: Comentarios sin afirmaciones falsas

- **WHEN** se revisa el diff del change
- **THEN** los comentarios no contienen la afirmación de que el XSD vendorizado carece de los códigos 19–20 o 13–16
