## MODIFIED Requirements

### Requirement: El manifiesto registra el digest de la política de firma

`manifest.json` SHALL incluir un bloque con los datos de la política de firma
de la v4.4 (5.2/5.7): URL identificadora publicada en el Anexo 2, algoritmo
(`http://www.w3.org/2001/04/xmlenc#sha256`), codificación (Base64), valor del
digest (`DWxin1xWOeI8OuWQXazh4VjLWAaCLAA954em7DMh0h8=`), la cita del
documento donde aparece (Anexo 2 del `ANEXOS Y ESTRUCTURAS_V4.4.pdf`) y el
estado de migración del SDK (`sdkStatus`). El bloque describe lo que la
especificación exige; mientras el SDK declare una política distinta,
`sdkStatus` SHALL indicar que la migración está pendiente, y cuando las
constantes publicadas del SDK coincidan con el bloque `policy`, `sdkStatus`
SHALL ser `aligned`; el README SHALL explicar ambos estados y el gate que
los hace cumplir. `sdkStatus` SHALL estar presente y usar uno de los valores
conocidos (`pending-sdk-migration`, `aligned`); un valor nuevo solo existe si
el README y el gate se actualizan con él en el mismo commit. El valor Base64
del manifiesto y el SHA-256 hex del archivo de la política SHALL corresponder
al mismo contenido, y **`pnpm spec:verify` SHALL hacer cumplir esa
correspondencia en cada corrida** — recomputando el SHA-256 en Base64 sobre
los bytes vendorizados del PDF de la política y contrastándolo con
`policy.digestValue` mediante comparación exacta de strings, en la forma
Base64 estándar con padding `=` que imprime el Anexo 2, sin normalización —
en lugar de depender únicamente de la constatación puntual del acto de
vendorizar.

#### Scenario: los datos de política citan su fuente

- **WHEN** se lee el bloque de política en `manifest.json`
- **THEN** incluye identificador, algoritmo, valor, cita del Anexo 2 y
  `sdkStatus`, y el valor coincide con el hash del PDF vendorizado

#### Scenario: el manifiesto no se confunde con el SDK

- **WHEN** se compara el bloque `policy` con las constantes publicadas del SDK
  mientras estas aún declaren otra política
- **THEN** `sdkStatus` marca la migración como pendiente y el README explica
  la discrepancia

#### Scenario: el SDK alineado declara `aligned`

- **WHEN** las constantes publicadas de la política de firma coinciden con el
  bloque `policy` (identificador, algoritmo y digest)
- **THEN** `sdkStatus` es `aligned` y el README no describe ninguna
  discrepancia pendiente

#### Scenario: el gate hace cumplir la correspondencia, no solo la declara

- **WHEN** se edita `manifest.policy.digestValue` a cualquier otro string no
  vacío sin alterar el PDF de la política vendorizado
- **THEN** `pnpm spec:verify` termina con código de salida distinto de cero
  nombrando el campo, el valor esperado (recomputado desde el PDF) y el valor
  declarado en el manifiesto

## ADDED Requirements

### Requirement: Las constantes publicadas de la política de firma coinciden con el manifiesto

Las constantes que el SDK publica para la política XAdES-EPES de la v4.4
(`shared/src/constants/xades-policy.ts`: identificador/URI de la política,
algoritmo del digest y valor del digest) SHALL coincidir con el bloque
`policy` del manifiesto: la URI SHALL ser el identificador publicado en el
Anexo 2, el algoritmo SHALL ser `http://www.w3.org/2001/04/xmlenc#sha256` y
el valor SHALL ser `policy.digestValue` en Base64 con padding `=`, por
comparación exacta de strings sin normalización. La verificación del repositorio
(ejecutada en el gate de `pnpm verify`) SHALL comparar las constantes
publicadas contra `manifest.policy` y terminar con código distinto de cero
nombrando campo, valor publicado y valor esperado cuando difieran. La
corrección que alinee las constantes SHALL venir acompañada de su Changeset
con notas de migración: cambia el XAdES-EPES que el SDK emite.

#### Scenario: constantes alineadas con el manifiesto

- **WHEN** se comparan las constantes publicadas de la política con
  `manifest.policy`
- **THEN** identificador, algoritmo y digest coinciden byte a byte y la
  verificación termina con código 0

#### Scenario: divergencia entre constantes y manifiesto falla la verificación

- **WHEN** la constante publicada de la URI, el algoritmo o el digest difiere
  de `manifest.policy` (p. ej. el SDK aún declara la política v4.1 con SHA-1
  `Ohixl6upD6av8N7pEvDABhEL6hM=`)
- **THEN** la verificación termina con código distinto de cero nombrando el
  campo, el valor publicado y el valor esperado desde el manifiesto
