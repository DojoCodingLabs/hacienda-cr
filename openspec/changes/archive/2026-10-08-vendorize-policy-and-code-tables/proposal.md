## Why

El INDENT añadió las decisiones 9, 11, 15 y 16 (y las preguntas 9–11.11): el conjunto vendorizable de la v4.4 no son solo los XSD — incluye el PDF de Anexos, `Codigodemoneda_V4.4`, `Codificacionubicacion_V4.4` y la Resolución General que define la política de firma, cuya URL y digest SHA-256 aparecen explícitos en el Anexo 2. Hoy el repo solo tiene versionado el `xmldsig-core-schema.xsd`, los 18 XSD y un `README.md` de procedencia; falta el resto de documentos y no existe ningún `manifest.json` que declare superficies oficiales, sets, vigencia y hashes.

## What Changes

- Vendorizar en `packages/sdk/schemas/2024/v4.4/` cuatro documentos: `ANEXOS Y ESTRUCTURAS_V4.4.pdf`, `Codigodemoneda_V4.4.pdf` (nota 13.1), `Codificacionubicacion_V4.4.rar` (nota 14; formato publicado hoy — ATV lo sirve como `.rar` que contiene `Codificacionubicacion_V4.4.xlsx`, no como CSV, y la decisión de vendorizar el `.rar` completo se tomó en revisión) y `Resolucion_General_sobre_disposiciones_tecnicas_comprobantes_electronicos_para_efectos_tributarios.pdf` (política de firma, decisión 9). Los nueve XSD de `2024/v4.4/` y nueve de `2026/v4.4/` ya están versionados: solo se verifican contra el manifiesto, no se re-descargan.
- Crear `packages/sdk/schemas/manifest.json` con: superficies oficiales consultadas (página ATV, listado OVi, `cdn.comprobanteselectronicos.go.cr/xml-schemas/` — decisión 13), sets vendorizados con cuál está **en vigor hoy** (`currentSet`, decisión 15) y cuál entra en vigor con fecha (`nextSet` + `effectiveFrom`), `lastSyncedAt`, y por archivo: ruta relativa, SHA-256, tamaño en bytes y `vendored: true`. Incluye el bloque de datos del digest de la política (identificador, algoritmo, valor, cita del Anexo 2 y estado de migración del SDK — 5.2/5.7).
- Mantener claves ordenadas y formato estable (Prettier); el manifiesto se versiona en el mismo commit que los archivos que describe.
- Documentar en `packages/sdk/schemas/README.md` los supuestos **no verificados**: redistribución sin restricciones (decisiones 7 y 11) y accesibilidad desde CI (decisión 8), además de la procedencia de los archivos nuevos.
- Verificar en el momento de vendorizar que el PDF de la política publicado hoy tiene SHA-256/Base64 `DWxin1xWOeI8OuWQXazh4VjLWAaCLAA954em7DMh0h8=` (digest literal del Anexo 2; el INDENT 5.7 lo transcribe mal como `DWxin1xWOel8…`, 43 chars — pregunta 11.3); toda discrepancia se registra y detiene la vendorización, no se acepta en silencio.

## Capabilities

### New Capabilities

- `spec-integrity`: integridad del set de especificaciones vendorizadas — qué documentos viven en `packages/sdk/schemas/`, qué declara el `manifest.json` (superficies, sets, vigencia, hashes) y cómo se versionan juntos.

### Modified Capabilities

_(ninguna — `openspec/specs/` no contiene capacidades todavía)_

## Impact

- **Archivos:** `packages/sdk/schemas/` (+4 documentos, +`manifest.json`, `README.md` ampliado; directorio `2016/` vacío se elimina). Nada fuera de esa carpeta.
- **Comportamiento publicado:** ninguno. `schemas/` no entra en el tarball npm (`files` allowlist del SDK), así que no hay Changeset.
- **Red:** la implementación necesita descubrimiento y descarga puntuales contra Hacienda (UA tipo `curl`/`wget`, sin credenciales); el resultado quedan bytes en el repo. Ningún test ni build necesita red.
- **Fuera de alcance:** la corrección de `XADES_POLICY_HASH`/`XADES_POLICY_URI` en `shared/` (fase 3, Changeset con semver explícita), `spec:check`/`spec:update`/job mensual, `codes.json` (fase 2) y la restauración de la herramienta `spec:verify` (quedó en un cambio previo ya no presente en este checkout; es un cambio aparte). También quedan fuera los archivos no vendorizados que la superficie publica para la versión (`.doc`, Reglamento, HTML de la API, `.xlsx` de forma farmacéutica): sus entradas `vendored: false` de la sección 5.2 llegan junto con `spec:check`, que es quien las consume.
- **Estado del checkout:** el repo es un clon reciente de `origin/main` sin cambios locales; los 18 XSD, `xmldsig-core-schema.xsd` y `README.md` están versionados, el resto pedido aquí es nuevo. Copias de trabajo previas de `ANEXOS Y ESTRUCTURAS_V4.4.pdf` y de los XSD sobreviven en `/tmp/opencode/spec-baseline/` (desechables, re-verificables).
