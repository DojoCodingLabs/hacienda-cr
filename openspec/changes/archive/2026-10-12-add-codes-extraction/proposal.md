# Proposal: add-codes-extraction

## Why

Los XSD vendorizados del set vigente contienen las tablas oficiales de códigos
(TipoIdentificacion, moneda, ubicación, estados de mensaje, etc.) como
enumeraciones inline, sin un artefacto consultable. INDENT 4.2/5.6/7 exige
disponer esas tablas como `codes.json` derivado de los XSD (fase 2): es la
base para validar códigos de comprobantes y para la futura corrección del
signer (fase 3) que referenciará estas tablas.

## What Changes

- Nuevo comando `pnpm codes:extract` que lea `packages/sdk/schemas/manifest.json`,
  resuelva el set identificado por `currentSet` y parsee sus XSD ya
  vendorizados en `packages/sdk/schemas/`, extraiga todas las enumeraciones y
  escriba `packages/sdk/schemas/codes.json`.
- Cubre las dos formas de enumeración de Hacienda:
  1. `xs:simpleType` con `name` (enumeración nombrada).
  2. `xs:element` con `xs:simpleType` anónimo (enumeración inline bajo el
     elemento).
- Clave de tabla: nombre del tipo para la forma nombrada; **ruta completa de
  ancestros** (`MensajeHacienda/TipoIdentificacionEmisor`) para la forma
  anónima, de modo que dos `Tipo` del mismo XSD no colisionen.
- Por tabla: archivo(s) fuente XSD, clave, nombre del elemento o tipo,
  descripción del elemento (de `xs:annotation/xs:documentation`); por valor:
  código exacto y descripción oficial.
- Comparación de códigos **byte a byte**: sin normalización Unicode, sin
  trim, sin cambio de mayúsculas. Descripciones de valor: trim y colapso de
  espacios. Diferencias de mayúsculas o de descripción del mismo código
  entre XSD: advertencia en stderr, no fallo.
- `codes.json` se **commitea** como artefacto derivado del set vigente
  (regenerable, igual que los vendorizados). Este cambio **no** incluye
  consumo por el SDK ni gate en CI (fase posterior).
- **Modificación de `spec:verify`**: la allowlist de la raíz de
  `packages/sdk/schemas/` pasa de `manifest.json`/`README.md` a incluir
  también `codes.json`, sin lo cual el gate de fase 1 rechazaría el
  artefacto nuevo (cambio anticipado en el diseño de fase 1.2 como
  "explícito y revisable").

## Capabilities

### New Capabilities

- `codes-extraction`: extracción determinista de tablas de códigos desde los
  XSD vendorizados del set vigente hacia `codes.json`.

### Modified Capabilities

- `spec-integrity`: la allowlist de `spec:verify` en la raíz de
  `packages/sdk/schemas/` incorpora `codes.json` (antes solo
  `manifest.json` y `README.md`). No hay otros cambios de contrato.

## Impact

- `scripts/codes-extract/` (nuevo): parser de enumeraciones + CLI.
- `scripts/spec-verify.mjs`: allowlist de la raíz + `codes.json`.
- `package.json`: script `codes:extract`.
- `packages/sdk/schemas/codes.json` (nuevo artefacto commiteado, ~decenas de
  KB).
- `packages/sdk/schemas/README.md`: procedencia de `codes.json` y cómo
  regenerarlo.
- Sin cambios de API pública del SDK, sin credenciales, sin red (lee solo
  el árbol vendorizado).
