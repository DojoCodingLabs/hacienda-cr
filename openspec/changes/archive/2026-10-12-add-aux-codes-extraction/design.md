# Design: add-aux-codes-extraction

## Context

`scripts/codes-extract/` ya extrae enumeraciones de los XSD del
`currentSet` (`lib/scan.mjs` tokeniza XML propio sin dependencias, salva
anotaciones y rutas anónimas; `lib/render.mjs` fusiona por clave con
reglas fatales XSD↔XSD y advertencias por descripción) y escribe
`packages/sdk/schemas/codes.json` como única escritura. El manifiesto
vendoriza ya los tres auxiliares: `ANEXOS Y ESTRUCTURAS_V4.4.pdf`,
`Codigodemoneda_V4.4.pdf` y `Codificacionubicacion_V4.4.rar` (hashes en
`manifest.json` desde la vendorización inicial del set 2024/v4.4). Ver
proposal.md para la motivación y `specs/codes-extraction/spec.md` para
el contrato observable.

Restricciones heredadas: sin red en tiempo de ejecución, determinismo
byte a byte, dependencias nativas limitadas (el repo ya exige `xmllint`;
`pdftotext` está verificado en `/usr/bin/pdftotext`; runtime objetivo
node 22+, igual que CI).

**Depende de `add-codes-extraction`** (ya implementado y archivado): sin
`lib/scan.mjs`, `lib/render.mjs`, la vendorización de los PDFs y la entrada
`pnpm codes:extract`, este cambio no tiene base sobre la que extender.

## Goals / Non-Goals

**Goals:**

- Extender el extractor existente (mismo comando `pnpm codes:extract`) con
  lectores de PDF (`pdftotext -layout`), RAR y XLSX, fusionados bajo las
  reglas de autoridad del spec.
- Verificar el `.rar` vendorizado contra el manifiesto (SHA-256/bytes) y
  regenerar `codes.json` con las tablas de ubicación (códigos compuestos,
  D5b) y las descripciones auxiliares.
- Tests offline con seams inyectables y fixtures sintéticas.

**Non-Goals:**

- Cambiar contratos de `spec-integrity` ni vendorizar nuevas fuentes que
  no consuma este extractor (ya resuelto en proposal.md).
- Integrar `codes:extract` en `pnpm verify`/deriva; consumir `codes.json`
  desde el SDK; publicar CSV/JSON derivados del `.xlsx`.
- Extraer notas 12, 17, 19 (fuera de alcance) ni las notas cubiertas por
  XSD (4, 4.1, 11, 15 — ver spec).

## Decisions

### D1 — Tooling RAR: `node-unrar-js` (WASM, devDependency)

Descomprime en memoria/disco temporal sin binario del sistema ni red
(RAR4 y RAR5). Alternativas descartadas: `unrar`/`unar` del SO (otra
dependencia nativa además de `xmllint`/`pdftotext`, distinta entre CI y
dev); `bsdtar` (soporte RAR5 desigual); parser casero (no viable). El
`.xlsx` extraído va a un `mkdtemp` del SO, se limpia en `finally`, y nunca
toca el repo.
**Licencia:** `node-unrar-js` distribuye el código UnRAR bajo licencia
restrictiva (uso permitido, redistribución de binarios restringida). Al
ser devDependency no entra en los paquetes publicados (el repo y los
paquetes son MIT), pero la implementación SHALL verificar los términos
vigentes y dejar constancia en el PR si cambian.
**Verificación (2026-10-12, `node-unrar-js@2.0.2`):** el wrapper JS declara
`license: "MIT"` (`LICENSE.md` MIT completo) y empaqueta `unrar.wasm`
compilado con Emscripten desde el código UnRAR 6.1.7 de RARLAB (términos
RARLAB: uso para descomprimir RAR permitido, redistribución de binarios
derivados restringida). El binario vive solo bajo `node_modules/`
(gitignored, 0 archivos trackeados), nunca se commitea ni se publica en
ningún paquete del workspace (ningún `packages/*/package.json` lo declara).
Constancia para el PR: devDependency raíz única, sin redistribución del
binario derivado.

### D2 — Lectura XLSX: `exceljs` (devDependency)

Mantenido en npm con licencia MIT, suficiente para leer celdas de texto.
Alternativas: `xlsx` de SheetJS (en npm solo versiones antiguas; las
recientes se distribuyen fuera de npm desde el CDN propio de SheetJS), o
`fflate` + XML casero (frágil con sharedStrings). Si el layout real del
archivo difiere de las secciones esperadas, el lector falla fatal (como
exige el spec) en lugar de adaptarse a ciegas — la adaptación al layout
real es ajuste de implementación, no de contrato.

### D3 — PDFs: subprocess `pdftotext -layout` con seam

Ya es el criterio del spec. Se inyecta como seam
(`runPdftotext(path) → text`) igual que `extractRar` y `readXlsx`, para
que los tests unitarios alimenten parsers con texto sintético sin
recurrir al binario (los tests del repo deben correr sin dependencias
nativas más allá de las ya exigidas).

### D4 — Estructura de módulos

```
scripts/codes-extract/
  extract.mjs            orquestador (manifiesto → XSD → aux → merge → render)
  lib/scan.mjs           sin cambios funcionales (XSD)
  lib/render.mjs         extendido: sources[] por valor, fusión aux,
                         kind "aux-table", generatedFrom completo
  lib/aux-pdf.mjs        pdftotext + parsers por nota (ANEXOS, moneda)
  lib/aux-rar.mjs        node-unrar-js → temp → ruta del .xlsx (+cleanup)
  lib/aux-xlsx.mjs       exceljs → tablas de ubicación (estructura estricta)
  lib/aux-merge.mjs      reglas de autoridad XSD vs auxiliar + advertencias
  codes-extract.test.mjs pruebas unitarias (seams stubeados)
```

Orden en `extract.mjs`: (1) validar manifiesto (ya existente);
(2) extraer XSD; (3) leer auxiliares — un fallo en (3) aborta sin escribir
igual que un XSD ausente; (4) fusionar autoridades; (5) render
determinista. Nueva escritura intermedia solo en `os.tmpdir()`.

### D5 — Fusión de autoridad (`aux-merge.mjs`)

Entrada: tablas XSD ya fusionadas + tablas auxiliares crudas.

- **Clave compartida (XSD existe):** el conjunto de códigos queda fijado
  por los XSD. Auxiliar solo aporta `description` donde el valor XSD no
  tiene uno; si XSD ya tiene descripción y tras trim/colapso difiere → se
  conserva la XSD + advertencia; códigos solo-auxiliar → se descartan +
  advertencia. Todo por stderr, exit 0.
- **Clave solo-auxiliar (ubicación y notas aux-only, p. ej. `Nota3/...`):**
  la tabla entra tal cual, `kind: "aux-table"`, `sources: [ruta de la fuente
(rar o PDF ANEXOS)]` a nivel de tabla, y **sus valores omiten
  `sources[]`** (con una sola fuente por tabla, el `sources[]` de la tabla
  basta; el `sources[]` por valor se reserva para tablas fusionadas). Las
  cuatro claves de ubicación:
  `CodificacionUbicacion/{Provincia,Canton,Distrito,Barrio}`, con **códigos
  compuestos por nivel** según D5b. Las dos de la nota 3:
  `Nota3/TipoComprobanteDocumentoAsociado` y
  `Nota3/SituacionComprobante` (códigos simples de la fuente).
- `sources[]` por valor (solo tablas fusionadas): se recalculan al fusionar
  (XSD en orden del set,
  luego auxiliar en orden fijo ANEXOS → Codigodemoneda →
  Codificacionubicacion).

### D5b — Códigos de ubicación: compuestos planos, no jerarquía

En la fuente los códigos reinician en cada nivel (cantón `1` dentro de la
provincia 1 y otra vez `1` dentro de la provincia 2; distrito `1` dentro de
cada cantón; barrio `1` dentro de cada distrito). Cuatro tablas planas con
el código crudo colisionarían (`Canton` tendría varias entradas `1`).
Decisión: **códigos compuestos planos** sobre el mismo modelo
`{code, description}`:

- `Provincia`: código de la fuente, byte a byte (ya es único).
- `Canton`: `provincia.cantón` → `1.1`, `1.2`, `2.1`.
- `Distrito`: `provincia.cantón.distrito` → `1.1.1`.
- `Barrio`: `provincia.cantón.distrito.barrio` → `1.1.1.1`.

Separador `.` literal, componentes byte a byte desde la fuente, sin padding
ni normalización; unicidad por tabla garantizada (y verificada: duplicado
⇒ fatal, spec). La misma composición aplica a las **cuatro** tablas
(nivel superior = código crudo, que ya es el caso degenerado de la
composición).

Alternativas descartadas: (2) tabla jerárquica anidada (rompe el modelo
plano `values: [{code, description}]` de `codes.json`, la ordenación por
clave y la búsqueda directa por código); (3) código plano + descripción
concatenada (`01-01` + `"San José / San José"`) — no es único sin parsing
de la descripción, rompe la convención `{code, description}` y hace que la
descripción deje de ser el nombre oficial. El patrón compuesto además
coincide con el dominio: la clave de Hacienda de 50 dígitos compone
local/terminal/tipo/consecutivo de la misma manera.

### D6 — Parsers de notas ANEXOS (estrictos, no genéricos)

Un parser por nota (3, 5, 6, 8, 8.1, 9, 10, 10.1, 16, 18, 20, 21, 22, 23)
ancorado a su encabezado `Nota N/`, con manejo explícito de renglones
partidos (las tablas del PDF envuelven texto) y de marcas de nota al pie.
La nota 3 requiere dos parsers de tabla dentro de su sección: la tabla
"Tipo de comprobante o documento asociado" (códigos `01`–`10`, de la
codificación de la numeración consecutiva) y la tabla "Situación del
comprobante electrónico" (códigos `1`/`2`/`3`, con columna de nombre y
columna descriptiva larga; la descripción publicada es el nombre oficial de
la fila — Normal, Contingencia, Sin internet —, no el párrafo explicativo).
La nota 3 es larga (partes a–d y luego la sección "Clave Numérica" con
partes a–h) y sus dos tablas viven en sub-partes distintas, cada una con
su propio encabezado: **los dos parsers se anclan a esos encabezados de
sub-tabla dentro de la nota, no al encabezado genérico `Nota 3/`** — son
dos parsers separados dentro de la misma nota, no uno que parsee la nota
entera. Regla: si una nota listada produce 0 filas o una fila incompleta →
error fatal (extracción parcial silenciosa está prohibida por el spec).

**Mapeo nota → claves XSD.** La nota produce un conjunto de valores con su
propio código/descripción; las claves de destino se resuelven por el último
segmento de la clave XSD (igualdad exacta de segmento, no `endsWith`), de
modo que cada valor se fusiona en todas las claves cuyo último segmento
coincide. Si un mapeo compartido no tiene ningún destino en los XSD del set
→ error fatal (indica que la nota dejó de corresponder al set vigente):

| Nota | Último segmento destino                                                                                                                                        | Claves XSD                        |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| 8    | `CodigoImpuestoType`                                                                                                                                           | 1                                 |
| 8.1  | `CodigoTarifaIVAType`                                                                                                                                          | 1                                 |
| 9    | `CodigoReferenciaType`                                                                                                                                         | 1                                 |
| 10   | `TipoDocReferenciaType`                                                                                                                                        | 1                                 |
| 10.1 | `TipoExoneracionType`                                                                                                                                          | 1                                 |
| 16   | `TipoDocOtrosCargosType`                                                                                                                                       | 1                                 |
| 18   | `CondicionImpuesto`                                                                                                                                            | 1 (`MensajeReceptor/...`)         |
| 20   | `CodigoDescuentoType`                                                                                                                                          | 1                                 |
| 22   | `TipoTransaccionType`                                                                                                                                          | 1                                 |
| 23   | `NombreInstitucion`                                                                                                                                            | 1 (`ExoneracionType/...`)         |
| 5    | `CondicionVenta`                                                                                                                                               | 7 (uno por tipo de comprobante)   |
| 6    | `TipoMedioPago`                                                                                                                                                | 7 (`.../MedioPago/TipoMedioPago`) |
| 21   | `IVACobradoFabrica` **y** `IVACobradoFabricaSurtido` (segmentos exactos, no `endsWith`: evita que `IVACobradoFabrica` capture también las claves `...Surtido`) | 4 + 4                             |
| 3    | claves `Nota3/...` (solo-auxiliar)                                                                                                                             | 0 — `kind: "aux-table"`           |

La fan-out de las notas 5/6/21 no es un ajuste cosmético: los XSD del set
repiten `CondicionVenta`/`TipoMedioPago`/`IVACobradoFabrica*` bajo
prefijos distintos y el spec exige que la nota alimente cada clave cuyo
código/campo describe (scenario `CodigoDescuentoType` + scenario
`auxiliar con código extra`). Verificado contra `codes.json` vigente:
7/7/4/4 claves para 5/6/21 y 1 destino para las notas simples.

**Nota 13.1 (moneda) — `Codigodemoneda_V4.4.pdf`.** Parser propio de tres
columnas país/moneda/código sobre la salida de `pdftotext -layout`
(título `CÓDIGOMONEDA` + encabezado `NOMBRE DEL PAÍS  NOMBRE DE LA
MODENA` en las dos primeras líneas; sin pies de página). Las líneas de
continuación parten el texto en fragmentos de país (token que empieza en
columna 0) y fragmentos de moneda (token posterior a ≥2 espacios); el
código es un token `^[A-Z]{3}$` en columna ≥40. Máquina de estados:
fragmentos pendientes se fusionan en la fila que aporta el código, y un
código con su propia moneda que aún tiene moneda pendiente descarta la fila
pendiente como **fila sin código** (aviso con línea y moneda; las tres
filas reales — ANTÁRTIDA, ISLAS GEORGIAS DEL SUR Y SANDWICH DEL SUR,
PALESTINA, ESTADO DE — llevan `Sin moneda universal` y no tienen código
XSD). El fragmento de país se detecta solo para excluirlo de la moneda:
**la descripción publicada es únicamente la columna moneda** (Open
Question resuelta en (b); el ensamblado de país del PDF es ambiguo entre
fragmentos de filas adyacentes y nunca se publica). Validación estructural:
anclas de título/encabezado, ≥1 fila, código de 3 mayúsculas por fila,
moneda no vacía por fila, pendientes vacíos al final. En la fusión **no**
se valida igualdad de conjuntos PDF ≡ XSD: en el set vigente coinciden
(168 = 168), pero es una observación, no una condición de éxito. Descripciones
duplicadas con igualdad after-trim → dedupe
silencioso; distintas → primera aparición del PDF + advertencia (USD, XPF
en el set vigente). Si un código del PDF no está en los XSD → descarte +
advertencia (regla de autoridad).

**Notas consideradas y no extraídas** (disposición completa y canónica en
`specs/codes-extraction/spec.md`, no aquí): la nota 11 **no se extrae
porque está cubierta por XSD** (`MensajeHacienda/Mensaje`,
`MensajeReceptor/Mensaje`), igual que 4/4.1 (`IdentificacionType/Tipo`) y
15 (`UnidadMedidaType`); las notas 1, 2, 7 y 13 son informativas sin tabla
propia (la 13.1, que sí tiene tabla, vive en `Codigodemoneda_V4.4.pdf` y se
extrae); las notas 12, 17 y 19 quedan fuera de alcance. Esta sección
solo documenta los parsers construidos; no es fuente de verdad.

### D7 — Orden de fusión y determinismo

Tablas XSD primero (orden actual intacto), auxiliares fusionadas después,
orden final por clave como ya hace `mergeTables`. `generatedFrom`:
XSD en su orden actual + las tres rutas auxiliares en orden fijo. Todas
las rutas (tabla `sources[]`, valor `sources[]`, `generatedFrom`) son
relativas a `packages/sdk/schemas/`, la misma convención que
`files[].path` del manifiesto y el resto de `codes.json`. El `sources[]`
de cada valor hereda ese mismo orden. Idempotencia
probada por test de doble corrida byte a byte.

### D8 — Verificación del `.rar` vendorizado e inspección previa

El `.rar` **ya está vendorizado**: `2024/v4.4/Codificacionubicacion_V4.4.rar`
(299 616 bytes, SHA-256 en `manifest.json` con `vendored: true` desde la
vendorización inicial del set). La tarea de implementación es **verificar**
que el archivo está presente y que su hash/bytes coinciden con el
manifiesto; solo si falta o difiere se vuelve a obtener del paquete oficial
de ATV (URL en INDENT 4.3) o del archivo suministrado por el equipo, y si
el resultado no es un `.rar` cuya estructura interna corresponda al
`.xlsx` esperado, se detiene y se pregunta antes de continuar.
**Inmediatamente después, antes de escribir `aux-xlsx.mjs`**, extraer el
`.xlsx`, abrirlo e
inspeccionar hojas/columnas reales — **hecho (2026-10-12)**: el archivo
tiene **una sola hoja** (`Hoja1`, 7088 filas × 9 columnas), no cuatro
secciones. Fila 1 es cabecera con celdas combinadas `B1:C1` "Provincia",
`D1:E1` "Cantón", `F1:G1` "Distrito", `H1:I1` "Barrio o Poblado"
(columna A vacía). De la fila 2 a la 7088 hay **una fila denormalizada
por barrio** con las cuatro jerarquías en columnas por pares
(código, nombre): B/C provincia, D/E cantón, F/G distrito, H/I barrio
("Barrio o Poblado" ✓). Hallazgos clave:

- **Reinicio por nivel confirmado** contra el `.xlsx` real (coincide con
  el CSV): cada provincia arranca en cantón `1`, cada cantón en distrito
  `1`. Códigos crudos: cantón 1–20 → **84** compuestos; distrito 1–16 →
  **492** compuestos; **7 provincias**, **7087 barrios**, y **0**
  compuestos duplicados en las cuatro tablas.
- **Tipos de celda mixtos**: los códigos de cantón/distrito son números
  en la mayoría de filas pero **texto** en unas pocas (p. ej. `"6"`,
  `"4"`, `"7"`, `"3"`, `"12"`, `"13"`); los de provincia/barrio siempre
  número. Conversión: `String(valor)` de la celda (decimal, sin padding,
  sin normalización) — `"6"` y `6` producen el mismo componente `6`.
- **Nombres**: la primera fila de cada grupo lleva los nombres de las
  columnas padre en **MAYÚSCULAS** (fila 2: `SAN JOSÉ`/`SAN JOSÉ`/
  `CARMEN`) y el resto en caja normal (`San José`); la primera fila de
  cada distrito lleva el nombre del barrio en mayúsculas. Hay celdas de
  nombre vacías puntuales (p. ej. fila 782, nombre de cantón 8).
  Política determinista de dedupe por código: **primera aparición no
  vacía en orden de fila**. Con ella, las cuatro tablas quedan con 0
  entradas sin descripción: provincia/cantón/distrito publican la forma
  en MAYÚSCULAS de su primera fila, y cada barrio el nombre de su fila
  (el primero de cada distrito en mayúsculas) — byte a byte del origen.
- Para provincia/cantón/distrito, la misma clave aparece en muchas filas
  (tabla aplanada); se emite **una** entrada por clave compuesta. Para
  barrio, cada fila es una entrada: una clave repetida ⇒ fatal (spec).

El CSV/JSON derivado nunca entra al repo (el README de schemas
se actualiza en procedencia, sin hash en el manifiesto: `README.md` y
`manifest.json` son allowlist de `spec:verify`, no archivos con entrada en
`files[]`). El extractor extendido exige todos los auxiliares presentes
(comportamiento del spec); el orden de tareas pone la verificación +
inspección del `.rar` antes de la regeneración.

API de `node-unrar-js@2.0.2` verificada durante la inspección:
`createExtractorFromFile({ filepath, targetPath })` escribe en disco (la
opción es `targetPath`, **no** `destination`); `extract().files` se debe
recorrer completo; con `createExtractorFromData` el contenido viene en
`files[i].extraction` (Uint8Array) en memoria.

## Risks / Trade-offs

- [Layout real del `.xlsx` distinto de cuatro secciones predecibles] →
  **verificado en task 1.4**: es una hoja única denormalizada (no cuatro
  secciones); el lector se ajustó al layout real (pares de columnas
  código+nombre, fila 1 de cabecera). Sigue aplicando: cualquier
  desviación futura ⇒ error fatal nombrando lo encontrado.
- [pdftotext con versión distinta reflowea tablas] → parsers anclados a
  encabezados con tolerancia de espacios, fixtures congeladas del texto
  de la versión local, 0 filas ⇒ fatal. `pdftotext` es requisito del
  entorno local de extracción; los tests unitarios no lo invocan (seam),
  por eso CI no lo necesita.
- [Notas del PDF con superposición de texto de líneas al pie] → los
  parsers descartan líneas de pie por patrón (`Nota N/` siguiente,
  números de página); test con la salida real local.
- [Dependencias WASM/ExcelJS añaden peso a devDeps] → son solo de
  desarrollo del extractor; nada las importa en los paquetes publicados.
- [`codes.json` crece (~7087 barrios + 492 distritos + monedas con
  descripción + tablas de
  la nota 3)] → artefacto derivado commiteado ya por diseño; tamaño
  aceptable para diff review.
- [`Codificacionubicacion_V4.4.rar` pesa 299 616 bytes (~293 KB)] → ya está
  commiteado desde la vendorización inicial del set; este cambio no añade
  binarios grandes al repo. Mencionar el tamaño en la descripción del PR
  para que el revisor sepa que `codes.json` (no el binario) es el diff
  grande.
- [Fixture RAR para tests requiere un codificador RAR una sola vez] →
  tests unitarios stubean `extractRar`; la ruta real solo se ejercita
  con el `.rar` vendorizado presente (skip si falta), sin binarios extra
  en CI.

## Migration Plan

Cambio aditivo sobre artefacto derivado: verificar `.rar` contra
manifiesto → regenerar `codes.json` → commit conjunto. Reversión = revert
del commit (restaura `codes.json` anterior; el extractor viejo no lee auxiliares
pero el spec ya no lo permite, por eso se revierte completo). Sin
contratos públicos del SDK afectados (`codes.json` aún no se consume).

Notas de transición:

- El estado transitorio **ya existe hoy**: `manifest.json` cita el `.rar`
  vendorizado con hash, pero `codes.json` aún no publica sus tablas de
  ubicación (el extractor actual no lee auxiliares). Ese estado persiste
  hasta la regeneración final (task 6.x) y se cierra con el commit
  conjunto: extractor extendido + `codes.json` regenerado + README.
- `spec:verify` permanece verde durante toda la secuencia: el `.rar` ya
  tiene entrada en `files[]` con SHA-256 (política vigente) y
  `README.md` sigue sin entrada en `files[]` (allowlist), sin cambios de
  `spec-integrity`.
- El extractor nuevo exige los auxiliares presentes (spec: fuente
  auxiliar ausente ⇒ fatal), por eso la verificación/inspección del
  `.rar` (tasks 1.1/1.4) va antes que cualquier ejecución de
  `codes:extract` con el extractor extendido.

## Open Questions

- Formato de los códigos de ubicación (las cuatro tablas): D5b ya fija la
  decisión — códigos compuestos planos `provincia[.cantón[.distrito[.barrio]]]`.
  **Resuelto en task 1.4** contra el `.xlsx` real (7 provincias, 84
  cantones, 492 distritos, 7087 barrios, 0 duplicados): separador `.`,
  ausencia de padding, reinicio por nivel confirmado, componentes de
  celda numéricos o texto normalizados con `String(valor)` (p. ej. celda
  `"6"` ⇒ componente `6`), nombres deduplicados con primera aparición no
  vacía en orden de fila. No cambia el contrato (cuatro claves fijas,
  unicidad por tabla y fallo por estructura inesperada ya están en el
  spec).
- Representación de la descripción de moneda en `codes.json`: (a) campo
  único combinado (`país + moneda`, p. ej. `Costa Rica - Colón
costarricense`), (b) solo la columna de moneda, o (c) campos separados
  por valor (`country` + `description`). (c) se descarta: rompe el
  contrato uniforme `{code, description}` de todos los valores de
  `codes.json` y requeriría un delta de spec solo para esta tabla.
  **Resuelto al implementar el parser (task 3.4) con la salida real de
  `pdftotext`: (b), solo la columna moneda.** Razones: (a) entra en
  conflicto con la fusión — EUR tiene 30 países y un campo combinado
  produciría 30 descripciones distintas para un solo código, violando la
  unicidad por código que exige el merge; además el ensamblado del país en
  el PDF es ambiguo (fragmentos de continuación se mezclan entre filas
  adyacentes) y el country no aporta valor de búsqueda. Caso verificado:
  `CRC` ⇒ `Colón costarricense`, exactamente la descripción que espera el
  scenario del spec (código `CRC` + `<descripción publicada>`). El país se
  parsea solo como señal para excluirlo de la moneda; nunca se publica.
  La regla de fusión no cambia.
