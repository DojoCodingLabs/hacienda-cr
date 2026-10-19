# codes-extraction Specification

## Purpose

Extrae las tablas oficiales de códigos incrustadas como enumeraciones en los
XSD vendorizados del set vigente y las publica como `codes.json`, artefacto
consultable y determinista para validación de comprobantes y fases
posteriores (INDENT 4.2/5.6/7).

## ADDED Requirements

### Requirement: `pnpm codes:extract` genera `codes.json` desde los XSD del set vigente sin red

El repositorio SHALL disponer de un comando `pnpm codes:extract` (implementado
bajo `scripts/codes-extract/`) que lea `packages/sdk/schemas/manifest.json`,
resuelva el set identificado por `currentSet`, parsee **todos** sus XSD
vendorizados y escriba `packages/sdk/schemas/codes.json`. El comando SHALL
funcionar sin acceso a red y SHALL mantener intactos los XSD, `manifest.json`
y cualquier otro archivo: su única escritura es `codes.json` (reemplazo
completo). El comando SHALL validar primero el manifiesto: si
`manifest.json` falta, no es JSON válido, no declara `currentSet`, o el
directorio del set vigente no existe bajo `packages/sdk/schemas/`, SHALL
terminar con código distinto de cero sin escribir `codes.json`. Si un XSD
del set vigente no es parseable como XML, SHALL terminar igualmente sin
escribir (ni dejarlo a medias).

#### Scenario: Generación limpia desde el set vigente

- **WHEN** se ejecuta `pnpm codes:extract` en un checkout con los XSD del
  `currentSet` presentes y parseables
- **THEN** el comando escribe `packages/sdk/schemas/codes.json`, termina con
  código 0 y no modifica ningún otro archivo

#### Scenario: Manifiesto inválido o set inexistente no escribe nada

- **WHEN** falta `manifest.json`, su JSON es inválido, no declara
  `currentSet`, o `currentSet` no corresponde a un directorio existente bajo
  `packages/sdk/schemas/`
- **THEN** el comando termina con código distinto de cero, nombra el campo o
  directorio en el error y `codes.json` queda como estaba

#### Scenario: XSD del set vigente ausente o malformado no escribe nada

- **WHEN** falta un XSD del set vigente o su XML es inválido
- **THEN** el comando termina con código distinto de cero, nombra el archivo
  en el error y `codes.json` queda byte a byte como estaba (ausente o
  anterior)

#### Scenario: El comando no necesita red ni credenciales

- **WHEN** se ejecuta `pnpm codes:extract` sin conectividad
- **THEN** termina con éxito siempre que los XSD estén en disco, sin
  realizar peticiones HTTP

### Requirement: Se extraen ambas formas de enumeración con claves no colisionantes

El extractor SHALL cubrir las dos formas en que Hacienda publica enumeraciones
en los XSD: **(a)** `xs:simpleType` con atributo `name` cuya restricción
contenga `xs:enumeration`; **(b)** `xs:element` que contenga un
`xs:simpleType` **anónimo** (sin `name`) con `xs:enumeration`. La **clave de
tabla** SHALL ser el nombre del tipo para la forma (a), y para la forma (b)
la **ruta completa de ancestros** elemento por elemento desde el elemento raíz
del XSD (p. ej. `MensajeHacienda/TipoIdentificacionEmisor`), de modo que dos
enumeraciones anónimas homónimas dentro del mismo XSD (dos `Tipo`) generen
claves distintas. Dos tablas del mismo XSD nunca SHALL compartir clave; un
choque de claves entre archivos SHALL ser un error fatal del extractor (sin
escribir `codes.json`). Solo se extraen enumeraciones por
`xs:restriction`+`xs:enumeration`: un XSD sin ningún elemento raíz
`xs:element`, o con formas no cubiertas (`xs:union`, `xs:simpleType` con
`name` declarado _dentro_ de un `xs:element`, u otras estructuras de
enumeración distintas de las dos formas), SHALL producir error fatal (sin
escribir `codes.json`), nunca una extracción vacía o parcial silenciosa.

#### Scenario: SimpleType nombrado usa el nombre del tipo como clave

- **WHEN** un XSD declara `<xs:simpleType name="TipoIdentificacion">` con
  enumeraciones
- **THEN** la tabla resultante tiene clave `TipoIdentificacion`

#### Scenario: SimpleType anónimo bajo elemento usa la ruta de ancestros

- **WHEN** dentro de `MensajeHacienda` el elemento
  `TipoIdentificacionEmisor` contiene un `xs:simpleType` anónimo con
  enumeraciones
- **THEN** la tabla resultante tiene clave
  `MensajeHacienda/TipoIdentificacionEmisor`

#### Scenario: Dos anónimas homónimas en el mismo XSD no colisionan

- **WHEN** el mismo XSD contiene dos elementos con el mismo nombre final bajo
  rutas de ancestros distintas
- **THEN** cada uno produce su propia tabla con clave de ruta completa, y el
  comando termina con éxito sin error de colisión

#### Scenario: XSD válido sin raíz `xs:element` es error fatal

- **WHEN** un XSD del set es XML válido pero no contiene ningún `xs:element`
  de primer nivel (p. ej. solo `xs:simpleType` a secas)
- **THEN** el comando termina con código distinto de cero nombrando el
  archivo, y no escribe `codes.json`

#### Scenario: Forma no soportada (`xs:union` o simpleType nombrado en línea) es error fatal

- **WHEN** un XSD del set declara enumeraciones mediante `xs:union`, o un
  `xs:simpleType` con `name` dentro de un `xs:element` (ninguna de las dos
  formas soportadas)
- **THEN** el comando termina con código distinto de cero nombrando el
  archivo y la forma encontrada, y no escribe `codes.json`

#### Scenario: Colisión real de claves es error fatal

- **WHEN** dos tablas extraídas producen exactamente la misma clave
- **THEN** el comando termina con código distinto de cero nombrando la clave
  y los archivos en conflicto, y no escribe `codes.json`

### Requirement: Cada tabla registra procedencia, identidad y valores oficiales

`codes.json` SHALL contener, por cada tabla extraída: la lista de archivos
XSD fuente (`sources[]`, rutas POSIX **relativas a
`packages/sdk/schemas/`** — misma convención que `files[].path` del
manifiesto —, más de un archivo
cuando el mismo tipo o la misma clave aparece en varios XSD del set), la
clave de la tabla, el nombre del tipo (forma nombrada) o del elemento (forma
anónima), la descripción del elemento o tipo tomada de su
`xs:annotation/xs:documentation` (ausente permitido), y los valores como
pares `{code, description}` donde `code` es el atributo `value` exacto del
`xs:enumeration` y `description` es su documentación oficial. La estructura
del archivo SHALL ser JSON válido con ordenación estable (tablas ordenadas
por clave; valores en orden de documento del primer XSD fuente) para que dos
ejecuciones sobre el mismo conjunto de XSD produzcan bytes idénticos. Cuando
varios XSD del set contribuyen valores a la misma clave, la tabla SHALL
fusionarlos por igualdad bytewise del código: un código exacto aparece una
sola vez; ante descripciones distintas para ese código se conserva la del
primer XSD fuente en orden determinista. Si los **conjuntos de códigos**
(bytewise) de la misma clave difieren entre XSD del set — no solo las
descripciones — el extractor SHALL tratarlo como inconsistencia real de
Hacienda: error fatal que nombra la clave y los archivos, sin escribir
`codes.json`.

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
  árbol vendorizado
- **THEN** ambas ejecuciones producen `codes.json` byte a byte idéntico

### Requirement: Los códigos se comparan byte a byte y las descripciones solo colapsan espacios

La igualdad de **códigos** entre enumeraciones SHALL ser estrictamente
bytewise sobre el valor UTF-8 del atributo `value`: sin normalización
Unicode, sin trim, sin cambio de mayúsculas/minúsculas (p. ej. `"a"` y
`"A"` son códigos distintos; `"é"` NFC y `"é"` NFD son códigos distintos).
Las **descripciones** (de valores, elementos y tipos) SHALL pasar
únicamente por trim de los extremos y colapso de espacios en blanco
internos; ningún otro cambio (tildes, mayúsculas, signos) está permitido.
Cuando el mismo código aparezca en varios XSD del set con descripciones que,
tras el colapso, difieran — o cuando los códigos solo difieran en
mayúsculas — el extractor SHALL emitir una **advertencia** en stderr que
nombre el código y los archivos, y seguir: una divergencia cosmética entre
XSD no es fallo.

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

### Requirement: `codes.json` es un artefacto derivado commiteado y documentado

`packages/sdk/schemas/codes.json` SHALL vivir en el repo como artefacto
derivado del set vigente, regenerable con `pnpm codes:extract` y reemplazado
completo en cada regeneración (no merge incremental).
`packages/sdk/schemas/README.md` SHALL documentar su procedencia (extraído de
los XSD del `currentSet`), la forma de regenerarlo, y que el SDK aún no lo
consume. Este comando no SHALL integrarse en `pnpm verify`, `spec:verify`,
`spec:update` ni en el workflow de deriva en este cambio.

#### Scenario: Regenerar tras un spec:update refleja el nuevo set

- **WHEN** `spec:update` (o cambio manual) actualiza los XSD del set vigente
  y luego se ejecuta `pnpm codes:extract`
- **THEN** `codes.json` refleja las enumeraciones del set actualizado

#### Scenario: El README declara origen y regeneración

- **WHEN** se lee `packages/sdk/schemas/README.md` tras este cambio
- **THEN** `codes.json` figura como derivado de los XSD del `currentSet`,
  con el comando de regeneración y la nota de que el SDK no lo consume aún
