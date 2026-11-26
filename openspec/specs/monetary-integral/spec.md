# monetary-integral Specification

## Purpose

Representación y aritmética decimal exacta para los montos fiscales del SDK `hacienda-cr`: el camino monetario exacto usa texto decimal acotado sobre enteros escalados, sin `number` en el camino de dinero; la regla de redondeo está decidida y citada en un solo sitio; y las invariantes se juzgan por propiedades contra un oráculo independiente. Los contratos `Number` legacy se preservan y la adopción del texto decimal es opt-in.

## Requirements

### Requirement: La regla de redondeo es decimal (5 decimales, round-half-up citado del Anexo)

Todas las operaciones monetarias SHALL aplicar una regla de redondeo única y explícita: 5 decimales con modo `ROUND_HALF_UP` (redondeo al alza en empates), coherente con la `fractionDigits: 5` que exige el XSD oficial. El repositorio SHALL documentar la regla y SHALL citar la superficie oficial que la establece: el Anexo de Hacienda (`packages/sdk/schemas/2024/v4.4/ANEXOS Y ESTRUCTURAS_V4.4.pdf`, "II. Especificaciones técnicas y formato de los comprobantes electrónicos", p. 13–14), que indica incrementar cuando el sexto decimal es mayor o igual que 5 (`20.203518 ≈ 20.20352`). El redondeo SHALL ejecutarse sobre enteros escalados (5 decimales) y nunca sobre representación binaria de coma flotante. El kernel de aritmética del SDK SHALL ser el único dueño de la regla: los primitivos de la regla se aplican sobre enteros escalados y quedan disponibles para reutilización.

#### Scenario: Redondeo a 5 decimales

- **WHEN** se redondea `1.123456789` bajo la regla declarada
- **THEN** el resultado es `1.12346`

#### Scenario: La regla cita su fuente

- **WHEN** se revisa la documentación de la regla de redondeo
- **THEN** incluye la cita del método de redondeo del Anexo de Hacienda (PDF vendorizado v4.4, p. 13–14)

#### Scenario: El redondeo no pasa por coma flotante

- **WHEN** se redondea un monto cuyo valor exacto tiene más de cinco decimales
- **THEN** el cálculo se realiza sobre el entero escalado y el resultado coincide con
  el redondeo exacto, no con el de `Number`

### Requirement: Propiedades monetarias en pruebas aleatorias

El SDK SHALL incluir una batería de pruebas de propiedades que, para cualquier factura generada, verifique que la suma de los totales de línea es igual al total del resumen al céntimo y que el impuesto de cada línea es igual a base × tarifa bajo el redondeo establecido, en miles de casos aleatorios, incluidos los adversariales. Los invariantes SHALL expresarse como propiedades y no como ejemplos aislados, y SHALL ejecutarse en CI. El oráculo de las propiedades SHALL ser independiente de la implementación: SHALL comparar sobre enteros escalados, de modo que un error de `Number` en la implementación no pueda quedar oculto por el mismo oráculo. La batería SHALL ejecutarse sobre el kernel monetario exacto, SHALL cubrir los casos adversariales (montos diminutos, cantidades con 16 dígitos significativos, descuento del 100 %, bruto redondeado a cero, valor fuera de cota y pago no asignado) y SHALL fallar ruidosamente si un invariante se rompe.

#### Scenario: Suma de líneas iguala el resumen

- **WHEN** se genera una factura aleatoria y se calcula su bloque de resumen
- **THEN** la suma de los totales de línea es igual al total del resumen al céntimo

#### Scenario: Impuesto por línea coherente con la tarifa

- **WHEN** se calcula el impuesto de una línea bajo la regla de redondeo
- **THEN** el impuesto es igual a base × tarifa redondeada según la regla

#### Scenario: Casos adversariales

- **WHEN** el generador produce muchas líneas, montos diminutos, tarifas mixtas y descuentos máximos
- **THEN** los invariantes siguen cumpliéndose y la corrida falla ruidosamente si alguno se rompe

#### Scenario: El oráculo no comparte la representación de la implementación

- **WHEN** se corre la batería de propiedades
- **THEN** el oráculo calcula sobre enteros escalados y la implementación también, de
  modo que un error de coma flotante en una de las dos capas se detecta

#### Scenario: El oráculo detecta una mutación del kernel

- **WHEN** se introduce una mutación en el kernel (por ejemplo, un redondeo a la baja
  en vez de `HALF_UP`, o una base de descuento secuencial en vez de la bruta)
- **THEN** la batería de propiedades falla, porque el oráculo independiente no
  reproduce la mutación

### Requirement: Los totales del documento se derivan de las líneas

Los totales del documento (`montoTotalLinea`, `totalServGravados` y los demás totales del resumen) SHALL derivarse de las líneas mediante la capa de cálculo, aplicando la regla de redondeo sobre enteros escalados, de modo que un documento construido a través de esa capa sea consistente por construcción. La capa de cálculo NO SHALL aceptar esos totales como entradas. La validación de entrada SHALL rechazar un documento cuyos totales no cuadren con sus líneas.

#### Scenario: Los totales se derivan de las líneas

- **WHEN** se construye un documento a partir de sus líneas mediante la capa de cálculo
- **THEN** `montoTotalLinea` y los totales del resumen se calculan de las líneas y no de un aporte externo

#### Scenario: Un documento con totales incoherentes es rechazado

- **WHEN** se valida un documento cuyos totales no cuadran con sus líneas
- **THEN** la validación falla y el documento no se puede enviar

### Requirement: XML generado valida contra XSD con decimal(fractionDigits: 5)

Todos los montos del XML de salida SHALL escribirse con a lo sumo 5 decimales, en notación plana (sin notación científica), cumpliendo la restricción `xs:decimal` con `fractionDigits: 5` del XSD oficial. No SHALL haber valores con notación científica ni puntos flotantes sin formatear, y el XML resultante SHALL validar contra el XSD oficial. El cambio SHALL NOT alterar los bytes ya publicados: las familias exact publicadas conservan su formato vigente (5 decimales fijos) y el camino legacy conserva su notación plana actual, de modo que el baseline de bytes del SDK publicado siga verde.

#### Scenario: Monto con a lo sumo 5 decimales

- **WHEN** se serializa un monto decimal al XML
- **THEN** el valor aparece con a lo sumo 5 decimales en notación plana (por ejemplo `0.1` o `113000`), nunca en notación científica, y cualquier excedente más allá del quinto decimal se redondea con `HALF_UP`

#### Scenario: El XML valida contra el XSD

- **WHEN** se valida el XML generado contra el XSD oficial v4.4
- **THEN** la validación pasa con `fractionDigits: 5`

#### Scenario: Los bytes publicados no cambian

- **WHEN** se ejecuta la regresión de compatibilidad contra el baseline publicado del
  SDK 0.9.0
- **THEN** los hashes de XML y de cálculo coinciden con los registrados

### Requirement: El tipo monetario del camino exacto es texto decimal acotado

El valor monetario del camino exacto SHALL ser un texto decimal acotado: sin signo, sin notación exponencial, sin ceros enteros a la izquierda, con a lo sumo 5 decimales y con un máximo de `9999999999999.99999` (los límites del tipo `DecimalDineroType` del XSD oficial: `totalDigits` 18, `fractionDigits` 5, `minInclusive` 0, `maxInclusive` 9999999999999.99999). La precisión por encima de la escala del campo SHALL rechazarse, no redondearse en silencio. El valor SHALL sobrevivir intacto a JSON y a `structuredClone`, y ningún monto del camino exacto SHALL pasar por `Number`, `parseFloat`, `toFixed` ni por una conversión de texto a número.

#### Scenario: Un monto conserva sus dígitos exactos

- **WHEN** se transporta un monto de cinco decimales por el camino exacto
- **THEN** el valor llega idéntico, sin pérdida ni redondeo binario

#### Scenario: Un monto fuera de cota se rechaza

- **WHEN** un valor monetario excede el máximo acotado
- **THEN** el esquema lo rechaza con un error de validación que nombra la cota

#### Scenario: La precisión excesiva se rechaza, no se redondea

- **WHEN** un texto monetario declara más de cinco decimales
- **THEN** el esquema lo rechaza en vez de truncarlo o redondearlo

#### Scenario: El texto monetario serializa sin pérdida

- **WHEN** un documento con montos decimales se serializa a JSON y se clona
- **THEN** el valor conserva sus cinco decimales y el clon es idéntico al original

### Requirement: La frontera compartida nunca normaliza a Number

La frontera compartida de montos (`MoneyInputSchema`, `MontoSchema`, `MontoPositiveSchema` en `shared/src/schemas/common.ts`) SHALL aceptar el `number` heredado o un texto decimal acotado, y SHALL normalizar **a texto decimal acotado** —nunca a `Number`—. Un `number` heredado SHALL leerse por su representación decimal más corta y redondearse `HALF_UP` a cinco decimales, de modo que la representación interna nunca sea binaria. La frontera SHALL rechazar `Infinity`, `NaN`, la notación exponencial y los valores fuera de cota, con un error que nombre la causa. La frontera SHALL estar publicada para que cualquier familia —o cualquier consumidor— pueda adoptarla de forma opt-in.

#### Scenario: Una entrada con texto decimal valida y se conserva

- **WHEN** se valida un monto como texto decimal acotado
- **THEN** la validación pasa y el valor normalizado es el mismo texto, con sus cinco
  decimales intactos

#### Scenario: Una entrada con number sigue validando

- **WHEN** se valida el mismo monto como `number`
- **THEN** la validación pasa y el resultado es el texto decimal equivalente, sin
  haber pasado por coma flotante en la representación interna

#### Scenario: Los valores no finitos y fuera de cota se rechazan

- **WHEN** el monto es `Infinity`, `NaN`, está en notación exponencial o excede el
  máximo acotado
- **THEN** la validación falla nombrando la cota o el formato inválido

#### Scenario: La normalización no degrada la exactitud

- **WHEN** un `number` heredado con más precisión que cinco decimales entra por la
  frontera
- **THEN** el texto normalizado conserva el valor exacto representable redondeado
  `HALF_UP` y la representación interna nunca es binaria

### Requirement: El kernel es el único dueño de la aritmética monetaria

El kernel `packages/sdk/src/tax/exact-decimal.ts` SHALL ser el único lugar donde la aritmética monetaria ocurre, sobre enteros escalados, y SHALL documentar qué primitive existe para qué propósito. Los primitivos ya publicados (`scaled`, `round`, `money`, `sum`) SHALL conservar su comportamiento byte a byte, porque el baseline de bytes y de cálculos del SDK publicado depende de ellos. El kernel SHALL ofrecer, además, la conversión estricta de texto a entero escalado, el render de entero escalado a texto plano y las operaciones de multiplicación, porcentaje y razón con redondeo en la escala destino.

#### Scenario: Los primitivos publicados no cambian

- **WHEN** se ejecuta la regresión de compatibilidad contra el baseline publicado
- **THEN** los hashes registrados de XML y de cálculo coinciden

#### Scenario: El kernel documenta su mapa de primitivos

- **WHEN** se lee la documentación del kernel
- **THEN** enumera cada primitivo con su rol y declara cuáles son nuevos y cuáles
  preservan comportamiento

#### Scenario: La aritmética no ocurre fuera del kernel

- **WHEN** se revisa el camino monetario del SDK
- **THEN** las operaciones sobre montos se delegan en el kernel y no se reimplementan
  en los adaptadores

### Requirement: El camino público general usa el mismo tipo monetario y el mismo kernel

Los DTOs públicos exactos de documento SHALL usar texto decimal acotado como
representación monetaria y SHALL delegar toda la aritmética de dinero en el
kernel escalado que ya posee la regla única de 5 decimales y `HALF_UP`. Los
schemas, calculadores y builders del camino general NO SHALL reimplementar la
regla de redondeo ni convertir un monto a `Number` para operar. Los límites de
los campos SHALL derivarse de la misma frontera compartida que usa el camino
exacto, sin duplicar expresiones regulares ni constantes de cota.

#### Scenario: La regla de redondeo no se duplica

- **WHEN** se revisa el cálculo del camino público general
- **THEN** toda operación monetaria se delega en el kernel y no existe una segunda regla local de redondeo

#### Scenario: El camino general no convierte a binario

- **WHEN** un monto entra al cálculo general
- **THEN** permanece como entero escalado y nunca pasa por `Number`, `parseFloat` o `toFixed`

#### Scenario: Los límites son los mismos del camino exacto

- **WHEN** un campo monetario del camino general recibe un valor fuera de cota
- **THEN** se rechaza con la misma cota del tipo oficial usada por el camino exacto

### Requirement: Los contratos Number legacy se preservan

Las funciones, schemas, tipos y builders que hoy aceptan `number` SHALL conservar
su firma y su comportamiento publicado. La ruta decimal SHALL ser adicional y no
SHALL modificar los bytes ni los cálculos del baseline existente. Un consumidor
NO SHALL verse obligado a migrar para seguir usando la API `Number`.

#### Scenario: La API Number sigue funcionando

- **WHEN** un consumidor llama a `calculateLineItemTotals`, `calculateInvoiceSummary` o un builder con montos `number`
- **THEN** obtiene el mismo resultado que antes del change

#### Scenario: El baseline publicado no cambia

- **WHEN** se ejecuta la regresión de bytes y cálculos publicados
- **THEN** los hashes del camino `Number` y de las familias exact narrow coinciden con los registrados

#### Scenario: La adopción es opt-in

- **WHEN** un consumidor no usa la nueva familia decimal
- **THEN** su código sigue compilando y ejecutándose sin cambios
