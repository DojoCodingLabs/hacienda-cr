# Spec Delta

## ADDED Requirements

### Requirement: Los descuentos porcentuales se calculan en cascada sobre la base remanente

Cuando una línea exacta lleva más de un descuento, el SDK SHALL calcular cada descuento porcentual sobre la base que queda tras el descuento anterior, con redondeo HALF_UP a cinco decimales (`Anexos_V4.4.md:158`, `:105`). Un `montoDescuento` absoluto SHALL conservar su valor exacto y nunca re-redondearse. La regla SHALL aplicarse a las APIs exactas actuales mediante una primitiva compartida e interna; el cálculo retenido de solo lectura queda regido por su regla histórica.

#### Scenario: Sin reinicio al bruto

- **WHEN** una línea lleva dos descuentos porcentuales y el segundo se calculara sobre el bruto
- **THEN** la salida es incorrecta frente al Anexo y la suite de propiedades falla
- **AND** la implementación usa siempre la base remanente

#### Scenario: Dos descuentos porcentuales sobre cien

- **WHEN** una línea con monto total `100` lleva dos descuentos del `10%`
- **THEN** el primer descuento es `10.00000` y el segundo es `9.00000`
- **AND** el subtotal es `81.00000`, la base imponible es `81.00000` y el IVA 13% es `10.53000`

#### Scenario: Descuento absoluto entre porcentuales

- **WHEN** una línea lleva un porcentaje, luego un monto absoluto y luego otro porcentaje
- **THEN** cada porcentaje se aplica sobre la base que dejó el descuento inmediatamente anterior
- **AND** el monto absoluto se resta sin alterar su valor

#### Scenario: La cascada vale para los dos kernels exactos actuales

- **WHEN** el kernel ordinario (FE, TE, NC total, NC parcial, ND, FEC) o el kernel de bienes usados de FEC calcula una línea con descuentos sucesivos
- **THEN** ambos usan la misma primitiva interna, la misma base remanente y el mismo redondeo
- **AND** el total del documento reconcilia con la suma de las líneas

#### Scenario: Límite de repeticiones

- **WHEN** una línea declara más de cinco descuentos
- **THEN** la validación de entrada rechaza la fuente antes de calcular o emitir XML

### Requirement: La cascada conserva las invariantes de descuento

La base siguiente SHALL ser el `montoDescuento` ya redondeado y reportado, de modo que la suma de los descuentos de la línea sea exactamente `totalDescuentos`. La base SHALL decrecer de forma monótona y el cálculo SHALL rechazar cualquier descuento que iguale o supere la base remanente antes de restar, en lugar de producir una base nula o negativa.

#### Scenario: Suma de descuentos iguala el total

- **WHEN** se calculan los descuentos de una línea con dos a cinco entradas
- **THEN** la suma de los `montoDescuento` reportados es igual a `totalDescuentos` del resumen

#### Scenario: Base monótona

- **WHEN** se aplican descuentos sucesivos
- **THEN** cada base es menor o igual que la anterior y nunca negativa

#### Scenario: Absoluto nunca se redondea

- **WHEN** una línea lleva un `montoDescuento` absoluto con cinco decimales
- **THEN** el valor reportado es idéntico al suministrado, sin pasar por el redondeo porcentual

#### Scenario: Descuento que consume la base

- **WHEN** un descuento porcentual o absoluto iguala o supera la base remanente
- **THEN** el cálculo falla antes de emitir XML con un error explícito de base inválida
- **AND** el caso de descuento del `100 %` sigue lanzando el error de línea neta no positiva

### Requirement: El cálculo retenido conserva la regla histórica

El contrato retenido de solo lectura SHALL conservar la aritmética con la que fue aceptado históricamente: cada descuento porcentual se calcula sobre el bruto de la línea, no sobre la base remanente. La corrección en cascada SHALL limitarse a las APIs exactas actuales y SHALL NOT alterar los totales que `calculateRetainedExactFe` produce para una fuente histórica ya aceptada.

#### Scenario: Fuente retenida con dos porcentajes

- **WHEN** una fuente retenida con monto total `100` lleva dos descuentos del `10%`
- **THEN** el cálculo retenido conserva el resultado histórico: descuentos `10.00 + 10.00`, subtotal `80.00`, IVA `10.40` y total `90.40`
- **AND** la API actual con la misma línea devuelve `81.00`, `10.53` y `91.53`

#### Scenario: El aislamiento es explícito

- **WHEN** el kernel ordinario elige la regla de descuento
- **THEN** recibe un modo explícito: cascada para las calculadoras actuales y bruto congelado para `calculateRetainedExactFe`
- **AND** la primitiva de cascada no se reexporta como contrato público

## MODIFIED Requirements

### Requirement: Propiedades monetarias en pruebas aleatorias

El SDK SHALL incluir una batería de pruebas de propiedades que, para cualquier factura generada, verifique que la suma de los totales de línea es igual al total del resumen exactamente y que el impuesto de cada línea es igual a base × tarifa bajo el redondeo establecido, en miles de casos aleatorios, incluidos los adversariales. Los invariantes SHALL expresarse como propiedades y no como ejemplos aislados, y SHALL ejecutarse en CI. El oráculo de las propiedades SHALL ser independiente de la implementación: SHALL comparar sobre enteros escalados, de modo que un error de `Number` en la implementación no pueda quedar oculto por el mismo oráculo. La batería SHALL ejecutarse sobre el kernel monetario exacto, SHALL generar líneas con dos a cinco descuentos mixtos, incluido un absoluto antes de un porcentaje, SHALL cubrir los casos adversariales (montos diminutos, cantidades con 16 dígitos significativos, descuento del 100 %, bruto redondeado a cero, valor fuera de cota y pago no asignado) y SHALL fallar ruidosamente si un invariante se rompe.

#### Scenario: Suma de líneas iguala el resumen

- **WHEN** se genera una factura aleatoria y se calcula su bloque de resumen
- **THEN** la suma de los totales de línea es igual al total del resumen exactamente, con cinco decimales

#### Scenario: Impuesto por línea coherente con la tarifa

- **WHEN** se calcula el impuesto de una línea bajo la regla de redondeo
- **THEN** el impuesto es igual a base × tarifa redondeada según la regla

#### Scenario: Descuentos en cascada bajo propiedades

- **WHEN** el generador produce líneas con dos a cinco descuentos mixtos
- **THEN** el oráculo verifica que la base decrece, que la suma de descuentos iguala `totalDescuentos` y que ningún absoluto se redondea

#### Scenario: Casos adversariales

- **WHEN** el generador produce muchas líneas, montos diminutos, tarifas mixtas y descuentos máximos
- **THEN** los invariantes siguen cumpliéndose y la corrida falla ruidosamente si alguno se rompe

#### Scenario: El oráculo no comparte la representación de la implementación

- **WHEN** se corre la batería de propiedades
- **THEN** el oráculo calcula sobre enteros escalados y la implementación también, de
  modo que un error de coma flotante en una de las dos capas se detecta

#### Scenario: El oráculo detecta una mutación del kernel

- **WHEN** se introduce una mutación en el kernel (por ejemplo, un redondeo a la baja
  en vez de `HALF_UP`, o un segundo descuento porcentual reiniciado al bruto)
- **THEN** la batería de propiedades falla, porque el oráculo independiente no
  reproduce la mutación

#### Scenario: Los oráculos de NC y used-personal se corrigen primero

- **WHEN** se añade un caso de cascada a las suites de NC o used-personal
- **THEN** sus oráculos Decimal ya calculan sobre la base secuencial
- **AND** el oráculo anterior, que aplicaba cada porcentaje al bruto, ya no certifica el resultado
