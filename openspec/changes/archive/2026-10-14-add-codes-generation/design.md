# Design: add-codes-generation #55

## Context

`codes.json` (923 KB, 52 tablas, 8 288 valores) es ya la fuente extraída de
los XSD y auxiliares vendorizados; su frescura frente a las fuentes la
custodia la prueba `"freshness: committed codes.json matches a fresh
regeneration"` de `scripts/codes-extract/codes-extract.test.mjs` (corre en
`test:scripts`, parte de `pnpm verify`). Verificado al revisar este plan: esa
prueba hace spawn del CLI real sobre el set commiteado completo, sin seams, y
por tanto **invoca `pdftotext` y `node-unrar-js` de verdad** — la dependencia
de `pdftotext` en CI ya existe en el stack #51–#53; declararla (presencia en
el runner o instalación explícita de `poppler-utils`) corresponde al retarget
de ese stack, no a este cambio, que desacopla su candado de la extracción
con `--no-extract` (D3/D7). La API pública de `@dojocoding/hacienda-shared`
(v0.4.1,
publicado) exporta hoy las mismas categorías de catálogo como constantes
escritas a mano en `shared/src/constants/*.ts` (`PaymentMethod`,
`SaleCondition`, `TaxCode`, `CurrencyCode`, `IdentificationType`,
`ProvinceCode`, `DocumentTypeCode`, `REFERENCE_*`, `DISCOUNT_CODES`,
`OTHER_CHARGE_TYPES`, `EXONERATION_INSTITUTIONS`, …). Hay deriva real ya
observable entre descripciones de `codes.json` y nombres curados (`"Cedula
Fisica"` vs `"Cédula física"`, `"SAN JOSÉ"` vs `"San José"`, `"SINPE MOVIL"` vs
`"SINPE Movil"`), y ningún detector lo señala. Datos verificados al planificar:

- `shared` publica un único entry (`dist/index.js`, 39 KB) y el SDK depende de
  él por `workspace:*`; `codes.json` está en `files` de ningún paquete (no se
  publica).
- Las 7 variantes de `TipoMedioPago` (una por tipo de documento) son idénticas
  hoy; `CondicionVenta` difiere por documento (13–16 valores), y
  `SaleCondition` público es la unión curada de varias tablas.
- `verify.mjs` es una lista fija de pasos pnpm y CI (`ci.yml`) ejecuta
  `pnpm verify`, así que ahí viven los candados.
- `IVA_RATE_PERCENTAGES`, `IVA_RATE_NAMES`, `IDENTIFICATION_LENGTHS`,
  `REP_SALE_CONDITIONS`, `REP_REFERENCE_CODES`, `XADES_*` y entornos son
  curaduría o datos derivados **ausentes de `codes.json`**: no se generan.
- Los mapas `*_NAMES` curados difieren de las descripciones de `codes.json`;
  generarlos desde ahí cambiaría strings publicados.

## Goals / Non-Goals

**Goals:**

- Una sola fuente para valores y claves de catálogo: los vendorizados →
  `codes.json` → TypeScript generado.
- Reemplazar las tablas de códigos escritas a mano sin mover ni un nombre de
  export ni un valor observable (paridad obligatoria).
- Dos candados inamovibles: deriva detectada en `pnpm verify` (CI) y
  literales de código prohibidos fuera de la carpeta generada.
- Dejar cableado `names.json` (fase futura) sin inventar emparejamientos.

**Non-Goals:**

- Extraer o poblar `names.json` (fase futura).
- Generar las tablas auxiliares gigantes (`Barrio` 7 087, `Distrito` 492) o
  cualquier tabla sin pareja explícita: siguen consultables en `codes.json`.
- Publicar `codes.json` en un tarball ni añadir subpath exports.
- Meter en la generación catálogos no-XSD (p. ej. los códigos de rechazo de
  la API).

## Decisions

**D1 — El generado vive solo en `shared/src/generated/`, reexportado por el
barrel público.** El SDK y los adapters lo consumen por el depende workspace
que ya existe; duplicarlo en SDK recrearía exactamente la enfermedad que
combatimos (dos fuentes). `shared/src/index.ts` gana
`export * from "./generated/index.js"` y `constants/index.js` deja de exportar
las tablas migradas: la superficie pública (nombres vía el barrel) no cambia.
Alternativa descartada: subpath exports (`hacienda-shared/codes`) — añade
superficie de package.json sin consumidor y complica el tree-shaking real
(tsup ya empaqueta un único entry).

**D2 — Registro explícito de parejas tabla→export versionado en
`scripts/codes-generate/table-map.mjs`.** Cada entrada declara `tableKey`,
nombre de exportación, mapa `{ código → CLAVE }` y `namesFrom` (hoy `null`
para todas). Es el contrato que hace la API auditable y convierte "código
nuevo sin mapear" en un fallo que nombra la tabla, en lugar de un nombre
inventado. `.mjs` (no JSON) porque las entradas llevan comentarios de
justificación; las banderas de revisión viven en el propio mapa, sin archivos
de estado que churnen. El mapa se siembra desde las tablas actuales: las
claves existentes (`EFECTIVO`, `TARJETA`, …) no se tocan.

**D3 — `spec:generate` orquesta, no fusiona contratos; separa los dos
ciclos de vida con `--no-extract`.** El modo completo llama al `codes:extract`
existente (que conserva su contrato y su prueba de frescura) y recién entonces
renderiza el TypeScript desde `codes.json` + `table-map`. El modo
`--no-extract` renderiza desde el `codes.json` commiteado sin invocar la
extracción; es el modo del candado de verify porque (i) desacopla la frescura
del artefacto extraído (prueba de frescura) de la frescura del TypeScript
generado (candado 1), (ii) no exige en CI los binarios del extractor
(`pdftotext`, `node-unrar-js`) y (iii) es más barato (la extracción reparsea
XSD, PDF y RAR). La extracción completa queda para el flujo manual/local de
actualización de catálogos. Alternativas descartadas: que `extract.mjs`
escriba TS además de JSON — acopla dos contratos con ciclos de vida distintos
y obligaría a reescribir la prueba de frescura del cambio #52; instalar
`poppler-utils` en CI para re-extraer dentro de verify — añade un binario al
gate sin necesidad, cuando el candado solo necesita leer el JSON commiteado.

**D4 — Un archivo por exportación + barrel, orden determinista.**
`shared/src/generated/<kebab-del-export>.ts` + `index.ts`; escritura completa
tras una generación exitosa (misma semántica atómica que el extractor: error a
medias no deja estado parcial). Orden alfabético fijo en el barrel.

**D5 — La salida se emite ya formateada con el `.prettierrc` del repo.** El
generador resuelve la config de prettier **desde la ruta del artefacto
generado**, no desde cwd (lección del cambio #52, donde la resolución desde
el temp daba falsos positivos). Así `prettier --check` del paso `format` de
verify acepta la salida sin depender de quién ni dónde ejecute.

**D6 — La paridad es una prueba de congelación que permanece.**
`shared/src/generated-parity.spec.ts` (fuera de la carpeta generada, por eso
exenta del candado 2) fija, inline, los valores esperados de cada tabla
reemplazada tal como son HOY: cualquier regeneración futura que cambie un
valor o clave de la API existente rompe la suite y obliga a una decisión
consciente (y a un Changeset acorde). Es duplicación intencionada de un solo
sentido — un contrato congelado, no una fuente — y documentada como tal. Se
congelan los **mapas completos** (código → clave y clave → valor) de cada
tabla reemplazada — ~709 pares, un archivo de ~15–20 KB — porque el contrato
es la API entera, no muestras; la verborrea se acepta una vez. La siembra es
mecánica, no manual: un emisor de un solo uso lee las constantes actuales
desde el barrel construido de `shared` y emite la congelación, que se revisa
a ojo sobre una muestra conocida (p. ej. `PaymentMethod.TARJETA`,
`ProvinceCode.SAN_JOSE`); el emisor se borra. La red de seguridad es la
propia prueba: compara el generado (que sale de `codes.json` + `table-map`)
contra la congelación (que sale de las constantes), de modo que un error de
siembra del mapa rompe la paridad en lugar de propagarse.

**D7 — Candado 1 con render-only y `git diff` acotado por pathspec.** Tras
`spec:generate --no-extract`, verify corre `git diff --exit-code --
shared/src/generated`. El modo render-only hace imposible que el candado
toque `codes.json` (es entrada, no salida): un `codes.json` editado a mano se
refleja en el diff del generado si altera valores, y su frescura directa la
cubre la prueba de frescura. El acotamiento es deliberado: un checkout con
trabajo sin commiter en otras rutas no debe fallar el candado (escenario del
spec). El candado distingue sus dos modos de fallo: el paso de generación
lanza («la generación falló: …») y el diff no se ejecuta; si la generación
termina en cero y el diff diverge, el mensaje indica regenerar y commitear.
Coste añadido a verify: leer el JSON y renderizar ~15 archivos, esperado por
debajo de 2 s — se mide y se anota en el PR (tasks 4.2). No hace falta tocar
`ci.yml`: CI ya ejecuta `pnpm verify`.

**D8 — Candado 2 con `no-restricted-syntax` y selector de regex.**
`Literal[value=/^\d{1,2}$/]` prohíbe las cadenas de uno o dos dígitos en TS
de negocio (la cifra simple va a propósito: `ProvinceCode`, exportada en esta
fase, usa `"1"`–`"7"`); las excepciones se declaran en la propia config con
comentario:
`shared/src/generated/**` (el hogar), `**/*.spec.ts` (fixtures de prueba) y
`packages/sdk/src/api/error-codes.ts` (catálogo propio de rechazos de la API
de Hacienda, no un catálogo XSD; candidato explícito a fase futura). Los
mensajes que contienen `"01"` como parte de una frase larga (p. ej.
`bootstrap.ts`) no matchean el selector — solo cadenas que son exactamente el
código. La prueba del candado importa la regla **del config real** y la
ejecuta vía `Linter` sobre tres fixtures (fuera → error; generado → ninguno;
allowlist → ninguno): la prueba y la config no pueden divergir en silencio.
Alcance declarado y exclusiones: el candado cubre los códigos numéricos de
una y dos cifras de las tablas exportadas hoy. Quedan fuera, documentados en
la config con su motivo: los códigos compuestos de ubicación con puntos
(`"1.1.4.1"` de cantón/distrito/barrio — tablas sin pareja en esta fase, no
habría constante generada a la que sustituir el literal) y los códigos
alfabéticos de tres letras (monedas — `"GET"`, `"UTC"` producirían falsos
positivos insostenibles). Si esas tablas llegan a exportarse en fase futura,
el candado se amplía junto a sus constantes.

**D9 — Semver: `minor` explícito en el Changeset.** Motivo: las
exportaciones existentes quedan byte-idénticas (D6 lo garantiza) y lo nuevo
es aditivo (tablas de catálogo antes inexistentes como exports). Sería
`major` cambiar nombre o valor de un export existente — precisamente lo que
D6 bloquea. El Changeset nombra los cuatro paquetes `@dojocoding/*`:
`shared` como `minor` (dueño del cambio) y `sdk`, `cli` y `mcp` como `minor`
(solo reempaquetan, vía `updateInternalDependencies`); el grupo `linked` de
`.changeset/config.json` además los mantiene a la misma versión.

**D10 — `names.json` como entrada opcional, hoy ausente.** Si
`packages/sdk/schemas/names.json` no existe (estado vigente), genera sin
nombres y el informe enumera las tablas pendientes de pareja o de nombre —
revisión, no adivinación. Si existe, los `*_NAMES` se emiten desde él; una
ausencia dentro de una tabla que declara `namesFrom` es error que nombra el
código. Los mapas curados siguen siendo la autoridad hasta esa fase.

## Risks / Trade-offs

- [Hacienda publica un código nuevo y `spec:generate`/verify fallan en CI] →
  Es el candado funcionando: el fallo nombra tabla y código; el remedio es
  ampliar el registro tras revisar el nombre, nunca adivinarlo.
- [Deriva real detectada al sembrar el mapa: la constante `UNITS_OF_MEASURE`
  usa «Ω» U+03A9 y el XSD vendorizado «Ω» U+2126 (signo ohm; equivalentes
  canónicos, distintos byte a byte, y la validación XSD compara bytes)] →
  Decisión del usuario durante apply: no emparejar esa tabla en fase 2;
  queda escrita a mano, el informe de `spec:generate` la reporta cada corrida
  y corregir el valor exportado es un cambio con semver propia. Por el mismo
  mecanismo se reportan `ExonerationType` (el XSD no contiene el 12),
  `REFERENCE_DOC_TYPES` (faltan 19-20) y `REFERENCE_CODES` (faltan 13-16),
  todos a la espera de vendorizar la revisión abril 2026.
- [Tamaño del bundle de `shared` crece (~39 KB → ~55–65 KB)] → Alcance acotado
  a tablas con pareja (12 exports, ~266 pares — no los 8 288); los gigantes y
  las tablas con deriva quedan fuera por diseño y sin consumidor.
- [Falsos positivos del lint (cadenas de uno o dos dígitos sin relación con
  catálogos; más probables con `"1"` tras ampliar el selector)] →
  Excepciones explícitas y comentadas; las pruebas y los fixtures quedan
  exentos; el mensaje de error apunta a la constante generada.
- [CI necesita `pdftotext` por la prueba de frescura del extractor (hecho
  verificado, previo a este cambio)] → Este cambio no lo requiere
  (`--no-extract` en verify); declarar la dependencia del runner (confirmar
  `poppler-utils` en la imagen o instalarlo explícitamente) corresponde al
  retarget de #51–#53, no a este PR.
- [Deriva de formato por bump de prettier rompe el candado 1] → devDep
  fijado con lockfile congelado; si ocurre, la regeneración lo resuelve.
- [La prueba de paridad (D6) envejece] → Es su propósito: es el contrato de
  congelación de la API; cambiarla es un acto consciente y versionado.

## Migration Plan

1. Generador (dos modos) + `table-map` sembrado por su emisor de un solo
   uso + `shared/src/generated/**` + barrel + prueba de congelación sembrada
   por su propio emisor (los valores generados deben coincidir con los
   actuales para que la suite pase).
2. Adelgazar `shared/src/constants/*`: eliminar las tablas migradas, dejar
   `*_NAMES` y mapas derivados, y redirigir los imports internos que apunten
   a ficheros migrados (rutas internas; superficie pública intacta).
3. Candado 2 + arreglo de las violaciones reales (p. ej.
   `xml/validator.ts:295` usa `"02"` → constante generada; `error-codes.ts` →
   allowlist comentada).
4. Candado 1 en `verify.mjs` + `package.json` (`spec:generate`).
5. Changeset `minor` + corrida completa de `pnpm verify` en verde.

**Rollback**: la migración es una unidad en `main`; revertir el PR restaura
el estado escrito a mano. Antes de publicar no hay impacto en consumidores
(0.4.1 sigue publicado intacto); tras publicar, el revert se publica como
nueva versión con su Changeset.

## Open Questions

_(ninguna que altere specs, enfoque o desglose: el contenido de `names.json`
pertenece por definición a la fase futura y solo exige que hoy esté
cableado el hueco.)_
