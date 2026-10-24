## Why

El manifiesto y la documentación declaran `2024/v4.4` como set vigente y autoritativo, pero el runtime del SDK embebe los XSD de `2026/v4.4` y valida contra ellos por defecto. Esa divergencia permite construir y aceptar XML con clave alfanumérica y referencias 13–17/19–20 que el XSD 2024 rechaza, de modo que el SDK puede producir documentos no conformes con la autoridad declarada. La decisión ya está cerrada: 2024 es autoritativo y 2026 no se adopta.

## What Changes

- Alinear el runtime y el build del SDK con `2024/v4.4`: embeber y validar por defecto contra el set 2024, no contra el 2026.
- **BREAKING** Restringir la clave numérica a 50 dígitos (`\d{50}`): el segmento de cédula deja de aceptar letras en `shared` y en el parser de la clave.
- **BREAKING** Retirar del camino público los valores exclusivos de 2026: `TipoDocReferencia` 19–20, `CodigoReferencia` 13–17 (incluido el 17 de REP) y la sustitución con código 16. Las entradas que los usen deben rechazarse; los constructores no deben emitirlos.
- Mantener los XSD de `2026/v4.4` vendorizados únicamente como referencia y evidencia de procedencia, sin usarse como esquema de validación por defecto ni como base de emisión.
- Cerrar el estado de `2026/v4.4` en el manifiesto: dejar de declararlo como `nextSet` con `effectiveFrom: "2026-11-01"` mientras esa autoridad y fecha no estén confirmadas por ATV; documentar que 2024 es el set autoritativo y 2026 no se adopta.
- Actualizar README de schemas, registro de procedencia y documentación de cumplimiento para eliminar la afirmación de que 2026 es obligatorio y describir 2024 como autoridad vigente.
- Ajustar la suite de conformidad para validar la salida contra 2024 y probar que las construcciones exclusivas de 2026 se rechazan en vez de aceptarse.

## Capabilities

### New Capabilities

- `document-generation/schema-authority`: autoridad del esquema v4.4 en runtime, emisión y validación; prohíbe emitir o aceptar construcciones que solo existen en el set no adoptado.

### Modified Capabilities

- `spec-integrity`: el manifiesto deja de declarar un próximo set con fecha no confirmada y la documentación debe cerrar la autoridad en 2024, conservando 2026 solo como referencia vendorizada.
- `document-generation/property-based`: la propiedad de la clave y la validación XSD se ajustan a la clave numérica y al set autoritativo 2024.

## Impact

- Código: `packages/sdk/src/xml/schemas/index.ts`, `packages/sdk/src/__testing__/xsd.ts`, `shared/src/schemas/clave.ts`, `shared/src/constants/document-references.ts`, `packages/sdk/src/clave/parse-clave.ts`, validadores/constructores que aceptan referencias 13–17/19–20 y pruebas de conformidad y propiedad.
- API pública: **BREAKING** para consumidores que envían claves alfanuméricas, `TipoDocReferencia` 19/20, `CodigoReferencia` 13–17 o la sustitución con código 16.
- Manifiesto y documentación: `packages/sdk/schemas/manifest.json`, `packages/sdk/schemas/README.md`, `docs/specs/v4-4-schema-provenance.md`, `docs/specs/v4.4-compliance.md`.
- Tests: la validación por defecto y la suite de conformidad pasan a 2024; los casos que hoy afirman aceptación bajo 2026 pasan a afirmar rechazo.
- Sin cambios en los bytes vendorizados: los XSD 2026 permanecen en el repo como referencia.
