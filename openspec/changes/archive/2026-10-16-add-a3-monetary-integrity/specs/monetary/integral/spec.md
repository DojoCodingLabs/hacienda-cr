## Purpose

Capa de representación y aritmética decimal para todos los montos fiscales del SDK `hacienda-cr`, de modo que ninguna ruta de dinero use `number` puro salvo en la frontera de entrada, que la regla de redondeo esté decidida y citada, y que los totales de un comprobante sean consistentes por construcción.

## ADDED Requirements

### Requirement: La clase Money wrappea decimal.js

La clase `Money` SHALL ser el tipo público único para todos los campos monetarios de los tipos compartidos (`shared/src/types/`) y de la capa de cálculo del SDK (`packages/sdk/src/tax/calculator.ts`; el path `packages/sdk/src/types/` no existe). SHALL envolver `decimal.js` internamente y SHALL exponer `Money.fromNumber(n)`, `Money.fromString(s)`, las operaciones inmutables `plus`, `minus`, `times` y `dividedBy`, y `round(dp)` con `toXMLString()` (a lo sumo 5 decimales en notación plana). Ninguna ruta de dinero SHALL operar con `number` puro, salvo la frontera de entrada definida en `specs/monetary/integral-codesgen/spec.md` (esquemas Zod que aceptan `number | Money` y normalizan) y el validador que opera sobre esa salida normalizada.

#### Scenario: Suma decimal sin error binario

- **WHEN** se calcula `Money.fromNumber(0.1).plus(Money.fromNumber(0.2))`
- **THEN** el resultado es igual a `Money.fromNumber(0.3)` y no a `0.30000000000000004`

#### Scenario: Las operaciones son inmutables

- **WHEN** se invoca `.plus()`, `.minus()` o `.times()` sobre una instancia
- **THEN** se devuelve una nueva instancia `Money` y la instancia original no cambia

### Requirement: La regla de redondeo es decimal (5 decimales, round-half-up citado del Anexo)

Todas las operaciones monetarias SHALL aplicar una regla de redondeo única y explícita: 5 decimales con modo `ROUND_HALF_UP` (redondeo al alza en empates), coherente con el `fractionDigits: 5` que exige el XSD oficial. El repositorio SHALL documentar la regla y SHALL citar la superficie oficial que la establece: el Anexo de Hacienda (`packages/sdk/schemas/2024/v4.4/ANEXOS Y ESTRUCTURAS_V4.4.pdf`, "II. Especificaciones técnicas y formato de los comprobantes electrónicos", p. 13–14), que indica incrementar cuando el sexto decimal es mayor o igual que 5 (`20.203518 ≈ 20.20352`).

#### Scenario: Redondeo a 5 decimales

- **WHEN** se redondea `1.123456789` bajo la regla declarada
- **THEN** el resultado es `1.12346`

#### Scenario: La regla cita su fuente

- **WHEN** se revisa la documentación de la regla de redondeo
- **THEN** incluye la cita del método de redondeo del Anexo de Hacienda (PDF vendorizado v4.4, p. 13–14)

### Requirement: Propiedades monetarias en pruebas aleatorias

El SDK SHALL incluir una batería de pruebas de propiedades que, para cualquier factura generada, verifique que la suma de los totales de línea es igual al total del resumen al céntimo y que el impuesto de cada línea es igual a base × tarifa bajo el redondeo establecido, en miles de casos aleatorios, incluidos los adversariales. Los invariantes SHALL expresarse como propiedades y no como ejemplos aislados, y SHALL ejecutarse en CI.

#### Scenario: Suma de líneas iguala el resumen

- **WHEN** se genera una factura aleatoria y se calcula su bloque de resumen
- **THEN** la suma de los totales de línea es igual al total del resumen al céntimo

#### Scenario: Impuesto por línea coherente con la tarifa

- **WHEN** se calcula el impuesto de una línea bajo la regla de redondeo
- **THEN** el impuesto es igual a base × tarifa redondeado según la regla

#### Scenario: Casos adversariales

- **WHEN** el generador produce muchas líneas, montos diminutos, tarifas mixtas y descuentos máximos
- **THEN** los invariantes siguen cumpliéndose y la corrida falla ruidosamente si alguno se rompe

### Requirement: Los totales del documento se derivan de las líneas

Los totales del documento (`montoTotalLinea`, `totalServGravados` y los demás totales del resumen) SHALL derivarse de las líneas mediante la capa de cálculo (`calculateLineItemTotals`, `calculateInvoiceSummary`), aplicando `Money` y la regla de redondeo, de modo que un documento construido a través de esa capa sea consistente por construcción. La capa de cálculo NO SHALL aceptar esos totales como entradas. La validación de entrada SHALL rechazar un documento cuyos totales no cuadren con sus líneas.

#### Scenario: Los totales se derivan de las líneas

- **WHEN** se construye un documento a partir de sus líneas mediante la capa de cálculo
- **THEN** `montoTotalLinea` y los totales del resumen se calculan de las líneas y no de un aporte externo

#### Scenario: Un documento con totales incoherentes es rechazado

- **WHEN** se valida un documento cuyos totales no cuadran con las líneas
- **THEN** la validación falla y el documento no se puede enviar

### Requirement: XML generado valida contra XSD con decimal(fractionDigits: 5)

Todos los montos del XML de salida SHALL escribirse con a lo sumo 5 decimales, en notación plana (sin ceros forzados ni notación científica), cumpliendo la restricción `xs:decimal` con `fractionDigits: 5` del XSD oficial. No SHALL haber valores con notación científica ni puntos flotantes sin formatear, y el XML resultante SHALL validar contra el XSD oficial.

#### Scenario: Monto con a lo sumo 5 decimales

- **WHEN** se serializa un monto `Money` al XML
- **THEN** el valor aparece con a lo sumo 5 decimales en notación plana (por ejemplo `0.1` o `113000`), nunca en notación científica, y cualquier excedente más allá del quinto decimal se redondea con `ROUND_HALF_UP`

#### Scenario: El XML valida contra el XSD

- **WHEN** se valida el XML generado contra el XSD oficial v4.4
- **THEN** la validación pasa con `fractionDigits: 5`
