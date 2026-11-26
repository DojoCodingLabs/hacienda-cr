## MODIFIED Requirements

### Requirement: `pnpm codes:extract` genera `codes.json` desde los XSD del set vigente sin red

El repositorio SHALL disponer de un comando `pnpm codes:extract` (implementado
bajo `scripts/codes-extract/`) que lea `packages/sdk/schemas/manifest.json`,
resuelva el set de extracción —`codesSet` si el manifiesto lo declara, si no
`currentSet`—, parsee **todos** sus XSD vendorizados y escriba
`packages/sdk/schemas/codes.json`, que SHALL registrar ese set en su clave
`codesSet`. `codesSet` existe porque la extracción necesita los auxiliares
vendorizados del set; mientras `2026/v4.4` (vigente) solo tenga sus XSD
vendorizados, `codesSet` SHALL ser `2024/v4.4`. El comando SHALL
funcionar sin acceso a red y SHALL mantener intactos los XSD, `manifest.json`
y cualquier otro archivo: su única escritura es `codes.json` (reemplazo
completo). El comando SHALL validar primero el manifiesto: si
`manifest.json` falta, no es JSON válido, no declara ni `codesSet` ni
`currentSet`, o el directorio del set de extracción no existe bajo
`packages/sdk/schemas/`, SHALL terminar con código distinto de cero sin
escribir `codes.json`. Si un XSD del set de extracción no es parseable como
XML, SHALL terminar igualmente sin escribir (ni dejarlo a medias).

#### Scenario: Generación limpia desde el set de extracción

- **WHEN** se ejecuta `pnpm codes:extract` en un checkout con los XSD y
  auxiliares del set de extracción presentes y parseables
- **THEN** el comando escribe `packages/sdk/schemas/codes.json` con
  `codesSet` igual a ese set, termina con código 0 y no modifica ningún otro
  archivo

#### Scenario: `codesSet` tiene precedencia sobre `currentSet`

- **WHEN** el manifiesto declara `currentSet: "2026/v4.4"` y
  `codesSet: "2024/v4.4"`
- **THEN** el comando lee `packages/sdk/schemas/2024/v4.4/` y, si ese
  directorio no existe, falla nombrándolo sin escribir `codes.json`

#### Scenario: Manifiesto inválido o set inexistente no escribe nada

- **WHEN** falta `manifest.json`, su JSON es inválido, no declara
  `codesSet` ni `currentSet`, o el set de extracción no corresponde a un
  directorio existente bajo `packages/sdk/schemas/`
- **THEN** el comando termina con código distinto de cero, nombra el campo o
  directorio en el error y `codes.json` queda como estaba

#### Scenario: XSD del set de extracción ausente o malformado no escribe nada

- **WHEN** falta un XSD del set de extracción o su XML es inválido
- **THEN** el comando termina con código distinto de cero, nombra el archivo
  en el error y `codes.json` queda byte a byte como estaba (ausente o
  anterior)

#### Scenario: El comando no necesita red ni credenciales

- **WHEN** se ejecuta `pnpm codes:extract` sin conectividad
- **THEN** termina con éxito siempre que los XSD estén en disco, sin
  realizar peticiones HTTP
