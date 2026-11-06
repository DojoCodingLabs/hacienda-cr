# Spec Delta

## Purpose

Define cuándo un comprobante exacto debe llevar asignaciones de pago (`MedioPago`),
cuándo puede omitirlas por usar una condición exenta, y cómo se reconcilian cuando
se suministran.

## ADDED Requirements

### Requirement: La presencia de MedioPago depende de la condición de venta

La fuente exacta SHALL exigir al menos una asignación de pago salvo cuando la condición que gobierna el documento sea `02`, `08` o `10`; para esas condiciones SHALL admitir entre cero y cuatro entradas (`Anexos_V4.4.md:194`; `:57` solo fija la cardinalidad cuando hay medios). La condición SHALL leerse de `input.condicionVenta` en FE, TE, FEC y sus variantes, y de `input.original.condicionVenta` en NC total, NC parcial y ND.

#### Scenario: Condición exenta sin asignación

- **WHEN** una fuente exacta usa condición de venta `02`, `08` o `10` y no incluye `medioPago`
- **THEN** la validación, el cálculo y la emisión XML proceden sin asignaciones
- **AND** el XML no contiene ningún nodo `ResumenFactura/MedioPago`

#### Scenario: La omisión válida no lanza TypeError

- **WHEN** una NC parcial, una ND, un FEC o un FEC de servicio extranjero usa una condición exenta y omite `medioPago`
- **THEN** los refinamientos de positividad y reconciliación ignoran la ausencia y devuelven un resultado válido
- **AND** ningún bucle de `medioPago` se ejecuta sobre `undefined`

#### Scenario: Condición exenta con asignación

- **WHEN** una fuente exacta usa condición de venta `02`, `08` o `10` e incluye asignaciones
- **THEN** se aplican las mismas reglas de positividad, cantidad y reconciliación que en cualquier otra condición

#### Scenario: Otras condiciones siguen exigiendo asignación

- **WHEN** una fuente exacta usa una condición de venta distinta de `02`, `08` y `10` y omite `medioPago`
- **THEN** la validación rechaza la fuente antes de calcular o emitir XML

#### Scenario: Condición gobernante en notas

- **WHEN** una NC o ND evalúa la presencia de pagos
- **THEN** usa `input.original.condicionVenta`, no un campo propio inexistente ni la condición de la nota

#### Scenario: Original referenciada en nota

- **WHEN** una NC o ND referencia una FE original cuya condición era `02`, `08` o `10` y sin asignaciones
- **THEN** la nota acepta esa fuente original sin inventar un `MedioPago` que no existió

#### Scenario: Variante usada sin exención aplicable

- **WHEN** el caso de bienes usados de FEC usa la condición literal `13`
- **THEN** sigue exigiendo al menos una asignación porque `13` no está exenta

### Requirement: Las asignaciones suministradas se reconcilian exactamente

Cuando la fuente incluye asignaciones, cada `totalMedioPago` SHALL ser positivo, la cantidad SHALL estar entre uno y cuatro, y la suma SHALL igualar exactamente el total del comprobante sin conversión a `Number`. Esta reconciliación es un invariante del SDK para cualquier asignación suministrada y es más estricta que `Anexos_V4.4.md:58`, que la exige con dos o más. La ausencia de asignaciones SHALL NOT inventar ni relajar esa reconciliación.

#### Scenario: Asignaciones que no suman el total

- **WHEN** la suma de las asignaciones suministradas difiere del total calculado
- **THEN** el cálculo falla antes de emitir XML

#### Scenario: Asignación única

- **WHEN** la fuente suministra una sola asignación
- **THEN** su monto debe igualar exactamente el total del comprobante, aunque el Anexo solo exija la igualdad con dos o más

#### Scenario: Asignación no positiva

- **WHEN** una asignación suministrada tiene monto cero o negativo
- **THEN** la validación rechaza la fuente

#### Scenario: Sin asignaciones no hay reconciliación de pagos

- **WHEN** la condición permite omitir `medioPago` y la fuente no lo incluye
- **THEN** el cálculo no exige una suma de pagos
- **AND** la ausencia no se interpreta como pago en efectivo, cobro recibido ni aceptación fiscal

### Requirement: El contrato retenido conserva su cota mínima

El contrato retenido de solo lectura SHALL conservar al menos una asignación en su entrada y en su resumen calculado. La opcionalidad SHALL limitarse a las APIs exactas actuales y SHALL NOT relajar la custodia histórica.

#### Scenario: Retenido sin asignaciones

- **WHEN** se calcula o valida una fuente retenida sin `medioPago`
- **THEN** el contrato retenido la rechaza
- **AND** el contrato actual sigue aceptando la omisión cuando la condición está exenta

#### Scenario: El decodificador histórico sigue leyendo registros antiguos

- **WHEN** se decodifica un registro calculado histórico que no contiene asignaciones
- **THEN** el decodificador amplio lo sigue leyendo
- **AND** esa lectura no habilita una fuente actual sin asignación

### Requirement: La variante de bienes usados conserva su asignación obligatoria

La fuente y el resumen calculado del caso de bienes usados de FEC SHALL exigir al menos una asignación, incluso cuando el resumen compartido se vuelve opcional, porque su condición literal `13` nunca está exenta.

#### Scenario: Entrada usada sin asignación

- **WHEN** una fuente de bienes usados de FEC omite `medioPago`
- **THEN** la validación la rechaza antes de calcular o emitir XML

#### Scenario: Resumen calculado usado sin asignación

- **WHEN** se construye o valida el resumen calculado de bienes usados de FEC
- **THEN** el resumen exige al menos una asignación, aunque `ExactFeSummarySchema` la admita opcional para las demás familias

### Requirement: Presencia y valor de pago no alteran los contratos legacy

La regla condicional SHALL aplicar solo a las APIs exactas. Las APIs legacy basadas en `Number` SHALL conservar su comportamiento y sus campos obligatorios actuales.

#### Scenario: API legacy sin cambios

- **WHEN** un consumidor usa un builder legacy con condición de venta `02`
- **THEN** el contrato legacy sigue exigiendo lo que exigía antes de este cambio
