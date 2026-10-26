## Why

A4 (generación por propiedades, corpus dorado y round-trip) existe hoy sobre la línea local, construida contra la clase `Money` y los constructores legacy. Al portar A3 a texto decimal, el generador, el parser y el corpus quedan acoplados a una representación que ya no existe. `main` no tiene generador arbitrario, ni corpus dorado, ni parser XML→documento: son activos nuevos que hay que portar **sobre el modelo decimal-text y los constructores vigentes**.

Además, el corpus dorado local fija un formato de monto (`100000`) que, con el modelo nuevo, sólo se conserva si el XML sigue emitiendo notación sin ceros forzados.

## What Changes

- **Generador arbitrario portado**: el generador `fast-check` produce documentos de los siete tipos con cobertura de tarifas, exoneraciones, descuentos múltiples, medios de pago, moneda extranjera y notas que referencian documentos previos, usando la capa de cálculo decimal-text.
- **Parser XML→documento portado**: `parseDocumentXml` queda como la inversa fiel de los constructores vigentes, con montos como texto decimal acotado.
- **Corpus dorado regenerado**: un documento conocido-bueno y su XML esperado por cada tipo de comprobante, con el formato de monto decidido.
- **Las tres propiedades en CI**: conformidad XSD sin excepciones, punto fijo construir→parsear→construir, y round-trip de la clave de 50 dígitos, sobre miles de casos.
- **Anti-vacuidad**: una propiedad que exige que todo documento generado pase la validación de entrada, para que la conformidad XSD no se cumpla por vacuidad.

**BREAKING**: ninguno (superficie nueva: parser público).

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `document-generation/property-based`: el generador y las tres propiedades se ejecutan sobre la representación decimal-text y los constructores vigentes.
- `document-generation/golden-corpus`: el corpus se regenera contra los constructores vigentes y fija el formato de monto del XML.
- `document-generation/xml-roundtrip`: el parser devuelve montos como texto decimal acotado y conserva la fidelidad byte a byte.

## Impact

- **Código afectado**: `packages/sdk/src/documents/parser.ts`, `packages/sdk/src/__fixtures__/document-generator.ts`, `packages/sdk/src/golden-corpus/**`, `packages/sdk/src/documents/document-generation.properties.spec.ts`, `packages/sdk/src/tax/calculator.properties.spec.ts`, `scripts/run-properties-tests.mjs`.
- **Dependencia del cambio de A3**: este port **no puede** aterrizar antes de que el tipo monetario esté migrado; el generador y el corpus deben hablar el mismo idioma que los constructores.
- **Formato de salida**: se conserva la notación sin ceros forzados para que el corpus siga válido.
- **CI**: las propiedades entran al `run-properties-tests.mjs` con presupuesto propio para los casos XSD (más caros).
