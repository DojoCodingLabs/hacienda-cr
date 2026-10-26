## MODIFIED Requirements

### Requirement: `codes.json` es un artefacto derivado commiteado y documentado

`packages/sdk/schemas/codes.json` SHALL vivir en el repo como artefacto
derivado del set vigente, regenerable con `pnpm codes:extract` y reemplazado
completo en cada regeneración (no merge incremental).
`packages/sdk/schemas/README.md` SHALL documentar su procedencia (extraído
de los XSD **y de las fuentes auxiliares vendorizadas** del `currentSet`),
la forma de regenerarlo, y que el SDK aún no lo consume. Este comando no
SHALL escribir en el repo: la regeneración que sirve de verificación se
produce en un directorio temporal sobre una copia del árbol, sin tocar el
artefacto commiteado. Tampoco SHALL integrarse en `spec:update` ni en el
workflow de deriva de Hacienda. La verificación del repositorio (`pnpm
verify`) SÍ SHALL ejecutar una regeneración de comparación: como `codes.json`
está exento del cotejo de hashes contra `manifest.json` (es derivado, no
vendorizado), esa regeneración es lo único que impide que el artefacto
quede obsoleto en silencio cuando cambian sus fuentes. Ante una divergencia
la verificación SHALL fallar nombrando `codes.json` y el remedio
(`pnpm codes:extract`).

#### Scenario: Regenerar tras un spec:update refleja el nuevo set

- **WHEN** `spec:update` (o cambio manual) actualiza los XSD del set vigente
  y luego se ejecuta `pnpm codes:extract`
- **THEN** `codes.json` refleja las enumeraciones del set actualizado

#### Scenario: El README declara origen y regeneración

- **WHEN** se lee `packages/sdk/schemas/README.md` tras este cambio
- **THEN** `codes.json` figura como derivado de los XSD **y de los
  auxiliares vendorizados** del `currentSet`, con el comando de
  regeneración y la nota de que el SDK no lo consume aún

#### Scenario: Una regeneración fresca coincide con el artefacto commiteado

- **WHEN** la verificación regenera `codes.json` a partir de las fuentes del
  árbol actual, en un directorio temporal, aplica a ambos lados el formateo
  del repositorio (`.prettierrc`) y compara el resultado byte a byte con
  `packages/sdk/schemas/codes.json`
- **THEN** ambos son idénticos y la verificación termina sin fallar, sin
  haber modificado ningún archivo del repo

#### Scenario: Un `codes.json` obsoleto hace fallar la verificación

- **WHEN** las fuentes del set vigente cambian (por ejemplo tras un
  `spec:update`) y `codes.json` no se regenera
- **THEN** la verificación termina con error que nombra `codes.json`, explica
  que no coincide con una regeneración fresca y menciona el remedio
  `pnpm codes:extract`
