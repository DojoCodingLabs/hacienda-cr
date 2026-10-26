## Purpose

Publica contratos de documento con montos en texto decimal acotado para que un
consumidor externo calcule y serialice documentos fiscales sin pasar por
`number`, conservando la exactitud desde el schema hasta JSON y XML.

## ADDED Requirements

### Requirement: Representación decimal acotada en los DTOs públicos

Todo campo monetario, de cantidad, tarifa, porcentaje, factor de cálculo o tipo
de cambio de los DTOs públicos exactos SHALL ser texto decimal plano y acotado.
Los montos SHALL respetar el tipo oficial `DecimalDineroType` (hasta 13 dígitos
enteros, 5 decimales, mínimo 0 y máximo `9999999999999.99999`); las cantidades
SHALL respetar 16 dígitos totales y 3 decimales; las tarifas, porcentajes y
factores SHALL respetar la escala de su campo oficial. El schema SHALL rechazar
un `number` JSON, la notación exponencial, el signo, los ceros enteros a la
izquierda, la precisión por encima de la escala y todo valor fuera de cota,
nombrando la causa. La representación SHALL ser canónica y SHALL conservar sus
dígitos al serializar a JSON y al clonar con `structuredClone`.

#### Scenario: Un monto de texto válido se conserva

- **WHEN** un DTO exacto recibe `"113000.00001"` en un campo monetario
- **THEN** la validación pasa y el valor conserva exactamente sus dígitos

#### Scenario: Un número JSON no se convierte silenciosamente

- **WHEN** un campo monetario del DTO exacto recibe el número `113000`
- **THEN** la validación falla con un error que exige texto decimal y no normaliza el número

#### Scenario: La precisión excesiva se rechaza, no se redondea

- **WHEN** un monto declara seis decimales
- **THEN** la validación falla nombrando el límite de cinco decimales en vez de truncar o redondear

#### Scenario: Las formas no decimales se rechazan

- **WHEN** un monto llega como `1e3`, `-1`, `01.00` o supera `9999999999999.99999`
- **THEN** la validación falla nombrando la causa y el valor no entra al cálculo

#### Scenario: JSON y clonación conservan el valor

- **WHEN** un DTO exacto se serializa con `JSON.stringify`, se vuelve a parsear y se clona con `structuredClone`
- **THEN** el valor monetario resultante es idéntico al original, sin pasar por coma flotante

### Requirement: Cobertura de los siete documentos y MensajeReceptor

La familia pública exacta SHALL cubrir Factura Electrónica, Nota de Débito,
Nota de Crédito, Tiquete Electrónico, Factura Electrónica de Compra, Factura
Electrónica de Exportación y Recibo Electrónico de Pago, además de
`MensajeReceptor`. Cada documento SHALL declararse con su tipo de documento y
SHALL tener una forma de fuente y una forma calculada. El schema SHALL rechazar
un tipo ausente o desconocido y SHALL rechazar los campos que pertenecen a otra
familia documental en vez de proyectarlos o descartarlos.

#### Scenario: Cada tipo documental tiene su contrato

- **WHEN** se valida una fuente para cada uno de los siete tipos de documento
- **THEN** cada una pasa con su schema y produce su root XML correspondiente

#### Scenario: Un tipo desconocido se rechaza

- **WHEN** la fuente declara un `tipoDocumento` ausente o fuera del catálogo soportado
- **THEN** la validación falla sin inferir el tipo por la forma del objeto

#### Scenario: Los campos de otra familia se rechazan

- **WHEN** una fuente de Tiquete incluye un campo exclusivo de otra familia documental
- **THEN** la validación falla en vez de ignorar el campo

#### Scenario: MensajeReceptor tiene su propio contrato exacto

- **WHEN** se valida un `MensajeReceptor` con montos de texto acotado
- **THEN** la validación pasa y el XML conserva exactamente esos montos

### Requirement: Separación entre fuente y calculado

El contrato de fuente SHALL aceptar únicamente los hechos suministrados por el
llamador y SHALL rechazar los campos derivados (totales de línea, impuestos
calculados, totales del resumen y desglose). El contrato calculado SHALL exponer
las líneas y el resumen ya derivados, con los mismos nombres de campo que el
documento oficial. El builder SHALL recalcular todo total a partir de la fuente
y SHALL rechazar cualquier intento de aportar totales precalculados.

#### Scenario: Una fuente con totales inyectados se rechaza

- **WHEN** la fuente incluye `totalComprobante`, `montoTotalLinea` o `impuesto[].monto`
- **THEN** la validación falla porque esos valores son derivados

#### Scenario: El calculado expone los totales derivados

- **WHEN** se calcula una fuente válida
- **THEN** el resultado contiene los totales de línea y el resumen derivados, listos para JSON

#### Scenario: El builder no confía en totales del llamador

- **WHEN** se invoca el builder con una fuente que intenta fijar el total del comprobante
- **THEN** el builder rechaza la entrada y no emite XML con ese total

### Requirement: Cálculo exacto derivado de las líneas

El cálculo SHALL derivar `MontoTotal`, `SubTotal`, `BaseImponible`,
`ImpuestoNeto`, `MontoTotalLinea` y todos los totales del resumen a partir de
cantidad, precio, descuentos, impuestos, exoneraciones y otros cargos. La
aritmética SHALL ejecutarse sobre enteros escalados con la regla única de 5
decimales y `HALF_UP`, sin `Number`, `parseFloat`, `toFixed` ni conversiones de
texto a número en el camino de dinero. Cada resultado intermedio SHALL validarse
contra la cota monetaria antes de continuar. Los totales del documento NO SHALL
aceptarse como entrada.

#### Scenario: Cantidad por precio e IVA exactos

- **WHEN** una línea tiene cantidad `3` y precio `0.1` con IVA 13 %
- **THEN** el bruto es `0.3`, el IVA es `0.039` y el total de línea es `0.339`, sin artefactos binarios

#### Scenario: Impuesto específico e ISC

- **WHEN** una línea declara un impuesto específico o un ISC con su base y factores
- **THEN** el monto se calcula con la misma semántica fiscal del camino `Number` y se redondea una sola vez en la escala monetaria

#### Scenario: Exoneración parcial

- **WHEN** una línea declara una tarifa exonerada parcial
- **THEN** el monto exonerado y el impuesto neto se derivan exactamente y el total del resumen los refleja

#### Scenario: Otros cargos y medios de pago

- **WHEN** el documento declara otros cargos o varias asignaciones de pago
- **THEN** `TotalOtrosCargos`, `TotalComprobante` y las asignaciones se calculan de forma exacta y las asignaciones deben cuadrar con el total

#### Scenario: Un intermedio fuera de cota se rechaza

- **WHEN** una entrada válida produce un producto o un total superior a la cota monetaria
- **THEN** el cálculo falla nombrando la cota y no emite un total truncado

### Requirement: Paridad fiscal con el camino Number

Para las entradas representables exactamente y dentro de los regímenes ya
soportados, el cálculo decimal SHALL producir los mismos importes fiscales que
`calculateLineItemTotals` y `calculateInvoiceSummary`. El camino decimal NO
SHALL habilitar regímenes, códigos o combinaciones que el camino `Number` no
acepta, y SHALL fallar de forma explícita ante un campo no soportado en vez de
descartarlo. Las diferencias que provienen de la pérdida binaria del camino
`Number` SHALL documentarse como tales, no presentarse como equivalencia exacta.

#### Scenario: Paridad en IVA ordinario

- **WHEN** la misma línea con montos exactamente representables se calcula por ambos caminos
- **THEN** los importes fiscales coinciden

#### Scenario: Paridad en ISC y exoneraciones

- **WHEN** la misma línea con ISC, impuesto específico o exoneración se calcula por ambos caminos
- **THEN** los importes fiscales coinciden dentro de lo que el camino `Number` puede representar exactamente

#### Scenario: Un régimen no soportado se rechaza

- **WHEN** la fuente incluye una combinación fiscal que el camino `Number` no admite
- **THEN** el cálculo decimal falla y no inventa una interpretación

### Requirement: XML canónico conforme al XSD oficial

El builder SHALL emitir los siete roots documentales y el root de
`MensajeReceptor` con la identidad, el namespace y el orden de campos oficiales.
Los montos SHALL escribirse en notación plana con 5 decimales fijos; las
cantidades, tarifas y factores SHALL escribirse en su escala canónica, sin
notación exponencial. El XML SHALL validar contra el XSD v4.4 aplicable a cada
root. Una identidad que no corresponda al tipo documental SHALL rechazarse.

#### Scenario: Los ocho roots validan contra el XSD

- **WHEN** se genera un documento decimal para cada root soportado
- **THEN** la validación nativa contra el XSD oficial pasa para los ocho

#### Scenario: Los montos se serializan con 5 decimales

- **WHEN** un monto calculado se emite al XML
- **THEN** aparece como decimal plano con 5 decimales y sin notación científica

#### Scenario: La identidad incoherente se rechaza

- **WHEN** la clave o el consecutivo no corresponden al tipo documental declarado
- **THEN** el builder falla antes de emitir XML

#### Scenario: Un campo no soportado no se descarta

- **WHEN** la fuente contiene un campo que el root no admite
- **THEN** la validación falla en vez de emitir XML sin ese campo

### Requirement: JSON seguro y round-trip exacto

El DTO calculado SHALL ser JSON-safe y NO SHALL contener `bigint` ni valores
`number` en campos monetarios. Serializar y volver a parsear el DTO, o clonarlo
con `structuredClone`, SHALL producir un valor idéntico. Recalcular y reconstruir
el XML desde una fuente que pasó por JSON SHALL producir los mismos bytes.

#### Scenario: Round-trip JSON del calculado

- **WHEN** un documento calculado se serializa y se parsea de nuevo
- **THEN** todos los montos y totales conservan exactamente sus dígitos

#### Scenario: Round-trip JSON de la fuente y XML estable

- **WHEN** una fuente se serializa, se parsea, se calcula y se construye
- **THEN** el XML resultante es byte a byte igual al de la fuente original

#### Scenario: `bigint` no escapa al JSON

- **WHEN** se serializa el calculado
- **THEN** no aparece ningún `bigint` ni una excepción de serialización

### Requirement: Los adaptadores usan el camino decimal

El CLI SHALL usar la familia decimal compartida en `draft`, `validate` y
`submit`, sin mantener un schema monetario paralelo. El MCP SHALL ofrecer una
herramienta exacta que acepte cantidades, precios, descuentos, tasas y pagos como
texto y devuelva XML y totales exactos. Las herramientas `Number` existentes,
incluida `create_invoice`, SHALL conservar su contrato y su comportamiento.

#### Scenario: El CLI emite y valida texto decimal

- **WHEN** se ejecuta el draft y luego se valida el JSON resultante
- **THEN** el documento se acepta por el camino decimal y el XML conserva los montos

#### Scenario: El CLI envía un documento decimal

- **WHEN** `submit` recibe un JSON con montos de texto
- **THEN** valida, calcula y construye el XML por el camino decimal, sin convertirlo a `Number`

#### Scenario: El MCP exacto devuelve XML exacto

- **WHEN** se invoca la herramienta exacta con precios y cantidades de texto
- **THEN** devuelve el XML y los totales derivados sin pérdida

#### Scenario: La herramienta MCP existente no cambia

- **WHEN** se invoca `create_invoice` con montos `Number`
- **THEN** su entrada, su salida y su comportamiento siguen siendo los publicados

### Requirement: REP y MensajeReceptor no inventan semántica fiscal

El contrato exacto de Recibo Electrónico de Pago y de `MensajeReceptor` SHALL
limitarse a representar, validar y serializar los montos suministrados. NO SHALL
inferir pagos, impuestos, aceptación, conciliación ni chronología fiscal. Los
montos inconsistentes con sus propios totales SHALL rechazarse.

#### Scenario: REP conserva los montos suministrados

- **WHEN** un REP exacto declara sus montos y totales
- **THEN** el XML conserva exactamente esos valores y no infiere una asignación de pago

#### Scenario: Un total incoherente se rechaza

- **WHEN** los totales de un REP o de un `MensajeReceptor` no cuadran con sus propios componentes
- **THEN** la validación falla y no se emite XML

#### Scenario: No se afirma aceptación fiscal

- **WHEN** se genera un documento exacto
- **THEN** el resultado es un documento válido por schema y XSD, sin afirmar aceptación de Hacienda

### Requirement: Límites y compatibilidad documentados

La documentación SHALL declarar que el camino decimal es opt-in, que las APIs
`Number` siguen disponibles sin cambios, que este change no promueve 1.0, que no
implementa response trust ni semántica fiscal nueva, y que la validación de
schema/XSD no equivale a aceptación fiscal. La guía de migración SHALL mostrar la
equivalencia entre campos `number` y texto y los casos donde la entrada cambia.

#### Scenario: La guía de migración cubre el camino

- **WHEN** un consumidor lee la guía
- **THEN** encuentra la tabla de campos, los límites de precisión y el ejemplo de fuente y calculado

#### Scenario: No se promete 1.0 ni soporte fiscal

- **WHEN** se revisa el README o las notas del change
- **THEN** se declara que 1.0, response trust, REP semántico y publicación quedan fuera de alcance
