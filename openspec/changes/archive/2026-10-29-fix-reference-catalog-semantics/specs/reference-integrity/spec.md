## Purpose

Cierra la integridad semántica de `InformacionReferencia` y de su catálogo de códigos: el esquema base debe imponer las condiciones de "Otros" que el XSD solo documenta, el Recibo Electrónico de Pago debe poder expresar su motivo 17, y la correspondencia tarifa↔código para los impuestos IVA debe cubrir todos los códigos que lo requieren. La capacidad cubre tanto el esquema de entrada como el validador de negocio y el catálogo de constantes compartido.

## ADDED Requirements

### Requirement: La referencia con tipo 99 exige su descripción libre

El esquema `InformacionReferenciaSchema` (y su equivalente en el SDK) SHALL rechazar un valor cuyo `tipoDoc` sea `"99"` si no se proporciona `tipoDocOtros`, y SHALL rechazar un `tipoDocOtros` proporcionado cuando `tipoDoc` no sea `"99"`. El texto de `tipoDocOtros` SHALL tener entre 5 y 100 caracteres (sin refine de trim: se alinea con el XSD, que solo exige 5–100 caracteres).

#### Scenario: Tipo 99 sin descripción libre es inválido

- **WHEN** se parsea una referencia con `tipoDoc = "99"` y `tipoDocOtros` ausente
- **THEN** el esquema rechaza la entrada con un error en `tipoDocOtros`

#### Scenario: Descripción libre sin tipo 99 es inválida

- **WHEN** se parsea una referencia con `tipoDoc = "01"` y `tipoDocOtros` presente
- **THEN** el esquema rechaza la entrada con un error en `tipoDocOtros`

#### Scenario: La paridad se conserva en el sentido inverso

- **WHEN** se parsea una referencia con `tipoDoc = "99"` y `tipoDocOtros = "Comprobante interno"` (5–100 chars, no solo espacios)
- **THEN** el esquema la acepta

### Requirement: La referencia con motivo 99 exige su código libre

El esquema `InformacionReferenciaSchema` (y su equivalente en el SDK) SHALL rechazar un valor cuyo `codigo` sea `"99"` si no se proporciona `codigoOtros`, y SHALL rechazar un `codigoOtros` proporcionado cuando `codigo` no sea `"99"`. El texto de `codigoOtros` SHALL tener entre 5 y 100 caracteres (sin refine de trim: se alinea con el XSD, que solo exige 5–100 caracteres).

#### Scenario: Motivo 99 sin código libre es inválido

- **WHEN** se parsea una referencia con `codigo = "99"` y `codigoOtros` ausente
- **THEN** el esquema rechaza la entrada con un error en `codigoOtros`

#### Scenario: Código libre sin motivo 99 es inválido

- **WHEN** se parsea una referencia con `codigo = "01"` y `codigoOtros` presente
- **THEN** el esquema rechaza la entrada con un error en `codigoOtros`

### Requirement: `codigo` es opcional para todo `tipoDoc`

`codigo` permanece opcional en `InformacionReferenciaSchema` (y su equivalente en el SDK) para todo `tipoDoc` (XSD: `Codigo minOccurs="0"`). La obligatoriedad condicional para `tipoDoc !== "13"` (facturación mes vencido) se descartó por no tener respaldo en el XSD 2026 ni en los Anexos 2026; ver D8 del design.

#### Scenario: Cualquier tipoDoc sin código es válido

- **WHEN** se parsea una referencia con `tipoDoc = "01"` (o cualquier otro) y `codigo` ausente
- **THEN** el esquema la acepta

### Requirement: El validador de negocio refleja las condiciones de "Otros"

`validateFacturaInput` SHALL rechazar, para cada `informacionReferencia`, una entrada con `tipoDoc = "99"` y `tipoDocOtros` ausente o con `tipoDocOtros` presente cuando `tipoDoc ≠ "99"`, y de forma análoga para `codigo` y `codigoOtros`. La validación SHALL ser equivalente a la del esquema base. `codigo` no se exige para ningún `tipoDoc`.

#### Scenario: El validador rechaza la asimetría de "Otros"

- **WHEN** se valida una factura cuya referencia tiene `tipoDoc = "99"` sin `tipoDocOtros`
- **THEN** la validación reporta un error en el campo correspondiente y la factura es inválida

### Requirement: El Recibo Electrónico de Pago admite el motivo 17

El catálogo de motivos de referencia admitido por el Recibo Electrónico de Pago SHALL incluir el código `"17"` ("pago de comprobante"), además de los códigos del catálogo base, salvo que el XSD 2026 base ya incluya `"17"` (en cuyo caso se moverá a `REFERENCE_CODES` y la variante REP-only se elimina). El tipo `ReciboElectronicoPago` y su esquema de entrada decimal SHALL usar este catálogo extendido. Cualquier documento que no sea Recibo Electrónico de Pago SHALL rechazar el código `"17"`.

#### Scenario: REP acepta el motivo 17

- **WHEN** se valida o serializa un Recibo Electrónico de Pago cuya referencia tiene `codigo = "17"`
- **THEN** el esquema y el builder lo aceptan

#### Scenario: REP acepta tipoDoc 99 con descripción libre

- **WHEN** se serializa un Recibo Electrónico de Pago cuya referencia tiene `tipoDoc = "99"` y `tipoDocOtros` presente
- **THEN** el builder emite `TipoDocRefOTRO` y el XML pasa el XSD 2026

#### Scenario: Un documento no-REP rechaza el motivo 17

- **WHEN** se valida una Factura Electrónica cuya referencia tiene `codigo = "17"`
- **THEN** `validateFacturaInput` reporta error y la factura es inválida

### Requirement: El Recibo Electrónico de Pago admite todos los tipos de documento de referencia y el motivo 17

El XSD del REP reutiliza `TipoDocReferenciaType` (todos los códigos 01-20 y 99) y su `CodigoReferenciaType` añade el motivo `"17"` (pago de comprobante). El esquema REP SHALL aceptar cualquier `tipoDoc` del catálogo base y SHALL aceptar `codigo = "17"`; cualquier otro documento que use `codigo = "17"` SHALL ser rechazado.

#### Scenario: REP acepta un tipo de documento arbitrario del catálogo base

- **WHEN** se parsea una referencia REP con `tipoDoc = "05"` y `codigo = "01"`
- **THEN** el esquema REP la acepta

#### Scenario: REP acepta el motivo 17

- **WHEN** se parsea una referencia REP con `codigo = "17"`
- **THEN** el esquema REP la acepta

#### Scenario: Un documento que no es REP rechaza el motivo 17

- **WHEN** se valida una factura cuya referencia tiene `codigo = "17"`
- **THEN** la validación reporta un error en `informacionReferencia.N.codigo`

### Requirement: Correspondencia tarifa↔código para los impuestos IVA

Para todo impuesto cuyo código sea `"01"` (IVA), `validateFacturaInput` SHALL exigir `codigoTarifaIVA` y SHALL verificar que `tarifa` coincida con `IVA_RATE_PERCENTAGES[codigoTarifaIVA]`. Para el impuesto `"07"` (IVA cálculo especial), SHALL exigir la presencia de `codigoTarifaIVA` (la correspondencia numérica con `tarifa` NO se exige, pues la tarifa es editable sobre la base imponible recalculada). Para el impuesto `"08"` (IVA bienes usados), SHALL exigir `factorCalculoIVA`. Los códigos transitorios de tarifa `"05"`, `"06"` y `"07"` SHALL seguir prohibidos para una Factura Electrónica nueva.

#### Scenario: IVA 01 mantiene la validación existente

- **WHEN** se valida una factura con un impuesto código `"01"` y tarifa coherente con su `codigoTarifaIVA`
- **THEN** la validación no reporta error de correspondencia

#### Scenario: IVA 07 sin codigoTarifaIVA es inválido

- **WHEN** se valida una factura con un impuesto código `"07"` sin `codigoTarifaIVA`
- **THEN** la validación reporta error en `codigoTarifaIVA`

#### Scenario: IVA 07 con tarifa distinta es válido

- **WHEN** se valida una factura con un impuesto código `"07"`, `codigoTarifaIVA` presente y `tarifa` distinto del porcentaje del código de tarifa
- **THEN** la validación no reporta error de correspondencia (la tarifa es editable)

#### Scenario: IVA 08 sin factor es inválido

- **WHEN** se valida una factura con un impuesto código `"08"` sin `factorCalculoIVA`
- **THEN** la validación reporta error en `factorCalculoIVA`
