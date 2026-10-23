## MODIFIED Requirements

### Requirement: Cada tabla registra procedencia, identidad y valores oficiales

`codes.json` SHALL contener, por cada tabla extraída: la lista de archivos
fuente (`sources[]`, rutas POSIX **relativas a
`packages/sdk/schemas/`** — misma convención que `files[].path` del
manifiesto —, más de un archivo cuando el mismo tipo o la misma clave aparece
en varios XSD del set **o en un XSD y en una fuente auxiliar vendorizada**),
la clave de la tabla, el nombre del tipo (forma nombrada) o del elemento
(forma anónima), la descripción del elemento o tipo tomada de su
`xs:annotation/xs:documentation` (ausente permitido), y los valores como
pares `{code, description}` donde `code` es el atributo `value` exacto del
`xs:enumeration` y `description` es su documentación oficial. Cada valor
SHALL admitir además un campo `sources[]` opcional con las rutas de los
archivos (XSD o auxiliar vendorizado, misma convención) que contribuyeron el
código o su descripción, en orden determinista (XSD en orden del set, luego
auxiliares en orden fijo). En tablas de una sola fuente — `kind:
"aux-table"` (tablas de ubicación y tablas de notas extraídas
exclusivamente del auxiliar, p. ej. `Nota3/...`) — los valores SHALL omitir
`sources[]`: basta el `sources[]` de la tabla. Las tablas fusionadas (XSD +
auxiliar) SHALL conservar `sources[]` por valor. El campo `generatedFrom`
SHALL listar todos los
archivos primarios del conjunto de extracción (XSD del set + auxiliares
vendorizados) en orden determinista. La estructura del archivo SHALL ser JSON
válido con ordenación estable (tablas ordenadas por clave; valores en orden
de documento de la primera fuente primaria) para que dos ejecuciones sobre
el mismo árbol vendorizado produzcan bytes idénticos. Cuando varios XSD del
set contribuyen valores a la misma clave, la tabla SHALL fusionarlos por
igualdad bytewise del código: un código exacto aparece una sola vez; ante
descripciones distintas para ese código se conserva la del primer XSD fuente
en orden determinista. Si los **conjuntos de códigos** (bytewise) de la misma
clave difieren entre XSD del set — no solo las descripciones — el extractor
SHALL tratarlo como inconsistencia real de Hacienda: error fatal que nombra
la clave y los archivos, sin escribir `codes.json`. La fusión entre XSD y
fuentes auxiliares SHALL regirse por las reglas de autoridad de este spec.

#### Scenario: Tabla con procedencia e identidad completas

- **WHEN** se lee una tabla de `codes.json` extraída de un XSD del set
  vigente
- **THEN** incluye `sources[]` con la ruta del XSD relativa a
  `packages/sdk/schemas/`, la clave, el nombre del tipo o elemento y la
  descripción cuando el XSD la declara

#### Scenario: Mismo tipo con conjuntos de códigos distintos entre XSD es error fatal

- **WHEN** dos XSD del set declaran la misma clave de tabla con conjuntos de
  códigos bytewise distintos (p. ej. uno tiene el código `"07"` y el otro no)
- **THEN** el comando termina con código distinto de cero nombrando la clave
  y ambos archivos, y no escribe `codes.json`

#### Scenario: Valores con código exacto y descripción oficial

- **WHEN** el XSD declara `<xs:enumeration value="01">` con documentación
  `Cedula Fisica`
- **THEN** la tabla contiene el par código `"01"` y descripción
  `"Cedula Fisica"`

#### Scenario: Extracción determinista e idempotente

- **WHEN** se ejecuta `pnpm codes:extract` dos veces seguidas sobre el mismo
  árbol vendorizado (XSD y auxiliares)
- **THEN** ambas ejecuciones producen `codes.json` byte a byte idéntico

#### Scenario: Origen por entrada cuando una tabla viene de varias fuentes

- **WHEN** la tabla `CodigoDescuentoType` recibe su conjunto de códigos de
  los XSD y sus descripciones se corroboran en
  `2024/v4.4/ANEXOS Y ESTRUCTURAS_V4.4.pdf`
- **THEN** cada valor de esa tabla incluye `sources[]` con las rutas de los
  archivos que contribuyeron su código o descripción, y la tabla incluye
  ambos archivos en su `sources[]`

#### Scenario: `generatedFrom` refleja todas las fuentes primarias

- **WHEN** se lee `generatedFrom` en `codes.json` tras este cambio
- **THEN** lista los XSD del set vigente y las fuentes auxiliares
  vendorizadas (ANEXOS, Codigodemoneda, Codificacionubicacion), en orden
  determinista

### Requirement: Los códigos se comparan byte a byte y las descripciones solo colapsan espacios

La igualdad de **códigos** entre enumeraciones SHALL ser estrictamente
bytewise sobre el valor UTF-8 del atributo `value` — o sobre los bytes del
código leído de una tabla auxiliar —: sin normalización Unicode, sin trim,
sin cambio de mayúsculas/minúsculas (p. ej. `"a"` y `"A"` son códigos
distintos; `"é"` NFC y `"é"` NFD son códigos distintos). Las
**descripciones** (de valores, elementos y tipos, vengan del XSD o de una
fuente auxiliar) SHALL pasar únicamente por trim de los extremos y colapso
de espacios en blanco internos; ningún otro cambio (tildes, mayúsculas,
signos) está permitido. La única excepción es la extracción estructural de
artefactos del propio PDF auxiliar — marcadores de nota al pie (pegados al
inicio del texto o en líneas dedicadas) y numeración de página —, que el
parseo descarta como ruido de layout; esto no transforma la descripción en
sí. Cuando el mismo código aparezca en varios XSD del
set con descripciones que, tras el colapso, difieran — o cuando los códigos
solo difieran en mayúsculas — el extractor SHALL emitir una **advertencia**
en stderr que nombre el código y los archivos, y seguir: una divergencia
cosmética entre fuentes no es fallo.

#### Scenario: Códigos solo distintos en mayúsculas no colisionan ni fallan

- **WHEN** dos XSD del set declaran `value="abc"` y `value="ABC"` para la
  misma clave de tabla
- **THEN** cada uno queda como entrada separada (son códigos distintos) y el
  comando emite advertencia en stderr, terminando con código 0

#### Scenario: Mismo código con descripciones distintas entre XSD es advertencia

- **WHEN** el código `"01"` tiene descripción `Cedula Fisica` en un XSD y
  `Cédula Física` (o `Cedula  Fisica`) en otro del set, bajo la misma clave
- **THEN** el comando emite advertencia nombrando el código y ambos archivos,
  la tabla conserva una sola entrada para ese código exacto (con la
  descripción del primer XSD fuente en orden determinista, tras trim y
  colapso) y el comando termina con código 0

#### Scenario: Sin normalización Unicode en códigos

- **WHEN** un XSD declara `value="café"` en forma NFC y otro el mismo
  carácter en forma NFD
- **THEN** los dos valores se registran con sus bytes exactos como códigos
  distintos, sin normalizarlos

#### Scenario: Código auxiliar byte a byte se compara sin normalizar

- **WHEN** una tabla auxiliar aporta un código con acentos o espacios en los
  extremos
- **THEN** se conserva byte a byte como código de la tabla y solo su
  descripción pasa por trim y colapso

### Requirement: `codes.json` es un artefacto derivado commiteado y documentado

`packages/sdk/schemas/codes.json` SHALL vivir en el repo como artefacto
derivado del set vigente, regenerable con `pnpm codes:extract` y reemplazado
completo en cada regeneración (no merge incremental).
`packages/sdk/schemas/README.md` SHALL documentar su procedencia (extraído
de los XSD **y de las fuentes auxiliares vendorizadas** del `currentSet`),
la forma de regenerarlo, y que el SDK aún no lo consume. Este comando no
SHALL integrarse en `pnpm verify`, `spec:verify`, `spec:update` ni en el
workflow de deriva en este cambio.

#### Scenario: Regenerar tras un spec:update refleja el nuevo set

- **WHEN** `spec:update` (o cambio manual) actualiza los XSD del set vigente
  y luego se ejecuta `pnpm codes:extract`
- **THEN** `codes.json` refleja las enumeraciones del set actualizado

#### Scenario: El README declara origen y regeneración

- **WHEN** se lee `packages/sdk/schemas/README.md` tras este cambio
- **THEN** `codes.json` figura como derivado de los XSD **y de los
  auxiliares vendorizados** del `currentSet`, con el comando de
  regeneración y la nota de que el SDK no lo consume aún

## ADDED Requirements

### Requirement: El extractor también lee fuentes auxiliares vendorizadas sin red

Además de los XSD, `pnpm codes:extract` SHALL leer las siguientes fuentes
auxiliares vendorizadas bajo el directorio del `currentSet` en
`packages/sdk/schemas/`:

- `ANEXOS Y ESTRUCTURAS_V4.4.pdf` — notas 3, 5, 6, 8, 8.1, 9, 10, 10.1, 16,
  18, 20, 21, 22 y 23 (tablas código + descripción). La nota 3 aporta dos
  tablas que ningún XSD del set enumera: tipo de comprobante o documento
  asociado de la numeración (códigos `01`–`10`) y situación del comprobante
  electrónico (códigos `1`, `2`, `3`).
- `Codigodemoneda_V4.4.pdf` — nota 13.1 (descripciones de moneda).
- `Codificacionubicacion_V4.4.rar` — nota 14; archivo vendorizado con su
  hash en `manifest.json`, que contiene un `.xlsx` interno con provincia,
  cantón, distrito y barrio ("Barrio o Poblado").

El comando SHALL extraer texto de PDF con `pdftotext -layout`, SHALL
descomprimir el `.rar` con la tooling de extracción que fije el diseño (sin
acceso a red en tiempo de ejecución) y SHALL leer el `.xlsx` resultante como
tabla. Las rutas de origen registradas en `codes.json` (tabla `sources[]`,
valor `sources[]`, `generatedFrom`) SHALL ser las del archivo vendorizado
(p. ej. el `.rar`), no las de su contenido interno. El CSV o JSON derivado
del `.xlsx` es un artefacto interno del extractor: SHALL residir solo en
memoria o en un directorio temporal del sistema operativo y SHALL quedar
fuera del repositorio y fuera de `manifest.json`. El comando SHALL
continuar funcionando sin acceso a red y SHALL mantener intactos los XSD,
`manifest.json` y cualquier otro archivo: su única escritura en el
repositorio sigue siendo `codes.json` (reemplazo completo). Si falta una
fuente auxiliar requerida, no es legible, o su estructura no corresponde a
la tabulación esperada, el comando SHALL terminar con código distinto de
cero sin escribir `codes.json`, nombrando el archivo y el motivo.

#### Scenario: Extracción completa de fuentes auxiliares presentes

- **WHEN** se ejecuta `pnpm codes:extract` con los tres auxiliares
  vendorizados presentes y parseables
- **THEN** `codes.json` incluye las tablas de ubicación, las descripciones
  de moneda y las tablas de las notas listadas, terminando con código 0

#### Scenario: Auxiliar faltante o ilegible no escribe nada

- **WHEN** falta `Codificacionubicacion_V4.4.rar` (o uno de los dos PDFs
  auxiliares), o `pdftotext`/el descompresor/lector XLSX falla con él
- **THEN** el comando termina con código distinto de cero nombrando el
  archivo y el motivo, y `codes.json` queda byte a byte como estaba

#### Scenario: La nota 3 extrae sus dos tablas auxiliares

- **WHEN** se ejecuta `pnpm codes:extract` con
  `ANEXOS Y ESTRUCTURAS_V4.4.pdf` vendorizado
- **THEN** `codes.json` contiene `Nota3/TipoComprobanteDocumentoAsociado`
  (códigos `01`–`10`) y `Nota3/SituacionComprobante` (códigos `1`, `2` y
  `3`, con sus nombres oficiales), ambas con `sources[]` de tabla apuntando
  al PDF ANEXOS

#### Scenario: El `.rar` vendorizado lleva hash en el manifiesto

- **WHEN** se revisa `manifest.json` después de este cambio
- **THEN** `Codificacionubicacion_V4.4.rar` aparece entre los archivos del
  set con su SHA-256, y ningún CSV/JSON derivado del `.xlsx` figura en el
  manifiesto ni en el repositorio

#### Scenario: Sin red durante la extracción

- **WHEN** se ejecuta `pnpm codes:extract` sin conectividad con todas las
  fuentes en disco
- **THEN** termina con éxito sin realizar peticiones HTTP

### Requirement: Reglas de autoridad entre XSD y fuentes auxiliares

Para una misma clave de tabla declarada tanto en XSD como en una fuente
auxiliar, el XSD SHALL ser la fuente primaria del **conjunto de códigos** y
de la **estructura**: los códigos resultantes son exactamente los del XSD y
se comparan byte a byte. Un código presente solo en el auxiliar SHALL
descartarse con advertencia en stderr (nombre de clave, código y archivo),
terminando con código 0. Un código del XSD ausente en el auxiliar no SHALL
ser error: la tabla queda sin descripción auxiliar para ese código. El
auxiliar SHALL ser la fuente primaria de las **descripciones** cuando el XSD
no las declara para ese código (caso `CodigoMoneda`); cuando ambos declaran
descripción para el mismo código y, tras trim y colapso de espacios,
difieren, gana la del XSD y el extractor SHALL emitir advertencia en stderr
que nombre el código y ambos archivos, terminando con código 0. Para claves
que existen solo en auxiliares (tablas de ubicación y tablas de notas
extraídas exclusivamente del ANEXOS, p. ej.
`Nota3/TipoComprobanteDocumentoAsociado` y `Nota3/SituacionComprobante`), el
auxiliar es fuente primaria de códigos y descripciones. Las divergencias no
descritas aquí como
fatales SHALL ser advertencias: la salida de solo advertencias nunca SHALL
impedir la escritura de `codes.json`.

#### Scenario: Auxiliar con código extra es advertencia, no error

- **WHEN** la fuente ANEXOS declara el código `"99"`, que ningún XSD del set
  declara para esa clave
- **THEN** el comando emite advertencia nombrando la clave, el código y el
  PDF; la tabla no contiene `"99"`; termina con código 0

#### Scenario: Descripción auxiliar completa un código sin documentación XSD

- **WHEN** el XSD declara el código `CRC` de `CodigoMonedaType/CodigoMoneda`
  sin documentación y `Codigodemoneda_V4.4.pdf` (nota 13.1) proporciona su
  descripción
- **THEN** el valor queda `{code: "CRC", description: <del PDF>}` con
  `sources[]` que incluye el XSD y el PDF, sin advertencias

#### Scenario: Conflicto de descripción XSD vs auxiliar gana el XSD

- **WHEN** el código `"01"` tiene descripción `A` en el XSD y `B` en la
  fuente auxiliar para la misma clave
- **THEN** se conserva `A`, el comando emite advertencia en stderr nombrando
  el código, ambos archivos y ambas descripciones, y termina con código 0

#### Scenario: Tabla solo auxiliar usa el auxiliar como autoridad

- **WHEN** la clave de una tabla de ubicación no existe en ningún XSD del
  set
- **THEN** sus códigos y descripciones provienen del `.xlsx` extraído del
  `.rar`, sin validación contra XSD, y la tabla se publica en `codes.json`

### Requirement: Disposición declarada de las notas de ANEXOS no extraídas

El spec y la implementación SHALL declarar explícitamente la disposición de
cada nota de `ANEXOS Y ESTRUCTURAS_V4.4.pdf` que no está en la lista de
extracción. Esta tabla — Nota | Contenido | Disposición — es **el lugar
canónico de la declaración** y vive en este spec de la capacidad (contrato);
`proposal.md`, `design.md`, `tasks.md` y `packages/sdk/schemas/README.md`
solo la replican o referencian, sin divergir:

| Nota    | Contenido                                                                                                                    | Disposición                                                                  |
| ------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 4 y 4.1 | Tipo de identificación                                                                                                       | **Cubierta por XSD** — códigos ya viven en el set: `IdentificacionType/Tipo` |
| 11      | Mensajes de Hacienda y de receptor                                                                                           | **Cubierta por XSD** — `MensajeHacienda/Mensaje` y `MensajeReceptor/Mensaje` |
| 15      | Unidad de medida                                                                                                             | **Cubierta por XSD** — `UnidadMedidaType`                                    |
| 1       | Campos en la representación gráfica del comprobante                                                                          | **Informativa, sin tabla propia**                                            |
| 2       | Etiqueta y XML Schema por tipo de comprobante                                                                                | **Informativa, sin tabla propia**                                            |
| 7       | Mostrar la descripción para visualización e impresión                                                                        | **Informativa, sin tabla propia**                                            |
| 13      | Tipo de moneda en el comprobante — su tabla de códigos es la nota 13.1, que vive en `Codigodemoneda_V4.4.pdf` y sí se extrae | **Informativa, sin tabla propia**                                            |
| 12      | Tipo de código de producto/servicio                                                                                          | **Fuera de alcance** — sin enumeración en los XSD del set y no solicitada    |
| 17      | Catálogo CABYS                                                                                                               | **Fuera de alcance** — documento externo                                     |
| 19      | Forma farmacéutica                                                                                                           | **Fuera de alcance** — documento externo                                     |

Las notas marcadas como cubiertas por XSD no se extraen porque sus códigos ya
viven en el set. Ningún código de las notas marcadas como cubiertas o fuera
de alcance SHALL aparecer en `codes.json` por procedencia de ANEXOS.

#### Scenario: Nota 11 no se extrae porque el XSD la cubre

- **WHEN** se extrae `ANEXOS Y ESTRUCTURAS_V4.4.pdf` y se compara con las
  tablas publicadas
- **THEN** ninguna entrada de `MensajeHacienda/Mensaje` o
  `MensajeReceptor/Mensaje` declara el PDF ANEXOS en su `sources[]` (sus
  códigos provienen solo de los XSD)

#### Scenario: Nota 12 queda fuera de alcance

- **WHEN** se revisa `codes.json` después de la extracción
- **THEN** no existe ninguna tabla con el tipo de código de
  producto/servicio (01/02/03/04/99 de la nota 12)

#### Scenario: Notas fuera de alcance no generan tablas

- **WHEN** se extraen los códigos de las notas 17 (CABYS) o 19 (forma
  farmacéutica)
- **THEN** el extractor no las busca ni emite tablas derivadas de ellas

### Requirement: Tablas de ubicación publicadas desde `Codificacionubicacion_V4.4.rar`

`codes.json` SHALL incluir cuatro tablas nuevas de ubicación geográfica
extraídas del `.xlsx` interno del `.rar` vendorizado, con claves
`CodificacionUbicacion/Provincia`, `CodificacionUbicacion/Canton`,
`CodificacionUbicacion/Distrito` y `CodificacionUbicacion/Barrio`. Cada
tabla usa como `kind` un valor distinto de las formas XSD (p. ej.
`aux-table`) y como `name` el rótulo oficial; su `sources[]` contiene la
ruta relativa del `.rar` (relativa a `packages/sdk/schemas/`, misma
convención que `files[].path`). En la fuente los códigos de cantón,
distrito y barrio reinician en cada nivel (cantón 1 dentro de cada
provincia, distrito 1 dentro de cada cantón, barrio 1 dentro de cada
distrito), por lo que los códigos de las tablas de nivel inferior SHALL
ser **compuestos**: el código de provincia es el de la fuente (byte a
byte); el de cantón es `provincia.cantón`; el de distrito,
`provincia.cantón.distrito`; el de barrio,
`provincia.cantón.distrito.barrio` — separador `.` literal, componentes
conservados byte a byte desde la fuente, sin padding ni normalización — de
modo que cada tabla queda con códigos únicos. Las descripciones son las de
la fuente (byte a byte, con solo trim y colapso de espacios según el
requerimiento general). El extractor SHALL fallar sin escribir si la
estructura del `.xlsx` no corresponde a las columnas/secciones esperadas
(provincia, cantón, distrito y barrio con código y nombre), o si la
composición produce códigos duplicados dentro de una tabla, en lugar de
emitir tablas adivinadas o vacías.

#### Scenario: Las cuatro tablas de ubicación existen con claves fijas

- **WHEN** se ejecuta `pnpm codes:extract` con el `.rar` vendorizado
- **THEN** `codes.json` contiene las claves
  `CodificacionUbicacion/Provincia`, `CodificacionUbicacion/Canton`,
  `CodificacionUbicacion/Distrito` y `CodificacionUbicacion/Barrio`, cada
  una con `sources[]` apuntando a
  `2024/v4.4/Codificacionubicacion_V4.4.rar`

#### Scenario: Códigos compuestos por nivel no colisionan

- **WHEN** se extraen las tablas de ubicación de la fuente
- **THEN** `CodificacionUbicacion/Canton` registra entradas únicas como
  `1.1` (cantón 1 de la provincia 1) y `2.1` (cantón 1 de la provincia 2);
  `CodificacionUbicacion/Distrito` usa `1.1.1` y
  `CodificacionUbicacion/Barrio` usa `1.1.1.1`, sin códigos repetidos
  dentro de ninguna de las cuatro tablas

#### Scenario: Estructura inesperada del XLSX es error fatal

- **WHEN** el `.xlsx` extraído no tiene las columnas/hojas de
  provincia/cantón/distrito/barrio esperadas
- **THEN** el comando termina con código distinto de cero describiendo la
  estructura encontrada, y no escribe `codes.json`
