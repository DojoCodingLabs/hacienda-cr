# codes-generation Specification

## Purpose

Convierte el catálogo extraído `codes.json` en tipos y constantes de
TypeScript no editables a mano, con detección automática de deriva en la
verificación y prohibición de literales de código en el resto del codebase,
de modo que los catálogos de Hacienda tengan una única fuente: los XSD y
auxiliares vendorizados (INDENT 5.8/8/7, fase 2). El árbol generado es esa
fuente: `shared/src/constants/` queda como fachada que lo reexporta y conserva
a mano los alias deprecados y los mapas de nombres curados.

## Requirements

### Requirement: `pnpm spec:generate` regenera `codes.json` y el código generado sin red

El repositorio SHALL disponer de un comando `pnpm spec:generate` con dos
modos. El modo completo regenera `packages/sdk/schemas/codes.json` (invocando
el extractor existente `codes:extract`) **y** escribe el código TypeScript
generado bajo `shared/src/generated/`. El modo `--no-extract` escribe el
TypeScript desde el `codes.json` commiteado, sin invocar la extracción y sin
modificar `codes.json`; SHALL funcionar en entornos sin los binarios del
extractor (p. ej. `pdftotext`). Ambos modos SHALL funcionar sin acceso a red
y SHALL ser deterministas: sobre un árbol idéntico, su salida SHALL ser byte
a byte idéntica. En modo completo, si la extracción falla (manifiesto
inválido, set inexistente, XSD irparseable), el comando SHALL terminar con
código distinto de cero sin reemplazar ni `codes.json` (garantía que ya
posee el extractor) ni el código generado. En modo `--no-extract`, si
`codes.json` falta o no es JSON válido, SHALL terminar igual sin escribir
nada. Su única escritura SHALL ser `shared/src/generated/**` y, solo en modo
completo, `codes.json`.

#### Scenario: Regeneración limpia

- **WHEN** se ejecuta `pnpm spec:generate` en un checkout con el manifiesto y
  el set vigente vendorizados
- **THEN** el comando termina con código 0, `codes.json` y
  `shared/src/generated/**` reflejan las fuentes del árbol, y ningún otro
  archivo cambia

#### Scenario: Determinismo

- **WHEN** se ejecuta `pnpm spec:generate` dos veces seguidas sobre el mismo
  árbol (en cualquiera de los dos modos)
- **THEN** la segunda ejecución no modifica ningún archivo

#### Scenario: Extracción fallida no escribe nada

- **WHEN** el modo completo se ejecuta con `manifest.json` inválido, sin
  `currentSet` o con un XSD del set vigente irparseable
- **THEN** termina con código distinto de cero y tanto `codes.json` como
  `shared/src/generated/**` quedan como estaban

#### Scenario: Modo `--no-extract` no toca `codes.json` ni requiere binarios

- **WHEN** se ejecuta `pnpm spec:generate -- --no-extract` en un checkout con
  `codes.json` commiteado válido
- **THEN** el comando termina con código 0, escribe `shared/src/generated/**`
  coincidente con el `codes.json` commiteado, no modifica `codes.json` y no
  invoca la extracción (funciona sin `pdftotext`)

### Requirement: Todo archivo generado lleva cabecera `NO EDITAR` con su procedencia

Cada archivo bajo `shared/src/generated/` SHALL empezar por una cabecera
`NO EDITAR` que declare que el archivo lo escribe `pnpm spec:generate`, que su
fuente es `packages/sdk/schemas/codes.json` más el registro explícito de
parejas tabla→export, y que las ediciones manuales se pierden y se detectan
(candado 1). La cabecera SHALL estar presente en la primera línea y ser
idéntica en todos los archivos generados salvo el nombre de su propio
artefacto.

#### Scenario: Cabecera presente

- **WHEN** se lee cualquier archivo bajo `shared/src/generated/`
- **THEN** su primera línea es la cabecera `NO EDITAR` y menciona
  `pnpm spec:generate` como escritor

#### Scenario: Edición manual es visible en la cabecera

- **WHEN** un desarrollador edita a mano un archivo generado y corre
  `pnpm spec:generate`
- **THEN** la regeneración sobrescribe la edición y el candado 1 hace fallar
  la verificación hasta que el artefacto commiteado vuelva a coincidir con la
  regeneración

### Requirement: La API pública existente se conserva; nada se adivina

El código generado SHALL reemplazar las tablas de códigos escritas a mano
conservando **el mismo nombre de exportación, las mismas claves y los mismos
valores** que el reemplazado; las exportaciones nuevas solo SHALL sumar. El
generador SHALL cubrir únicamente las tablas con entrada explícita en el
registro de parejas (en esta fase, las que respaldan la API pública actual);
las demás tablas de `codes.json` SHALL quedar reportadas como sin pareja
configurada, sin generarlas. Para una tabla emparejada, si `codes.json`
contiene un código sin clave configurada, o el registro declara una clave sin
código en `codes.json`, el comando SHALL terminar con código distinto de cero
nombrando tabla y código para revisión, **sin inventar** nombre ni valor.
`codes.json` es la única fuente de valores: ningún literal de código de catálogo
SHALL vivir en el código generado a partir de otra procedencia.
Los **alias deprecados** que el árbol vigente publica (p. ej. `COMPRA_PAGO`
("08") y `GASTO_VIAJE` ("09"), y los códigos de estado y situación) SHALL
sobrevivir a la generación como aliases declarados a mano en la fachada de
constantes, SHALL apuntar al valor canónico generado y SHALL quedar
documentados como alias en el registro de parejas; el generador NO SHALL
emitirlos como catálogos nuevos ni el registro SHALL declararlos como
paridad de valor.

#### Scenario: Paridad con la API actual

- **WHEN** se compara cada exportación reemplazada (p. ej. `PaymentMethod`,
  `SaleCondition`, `TaxCode`, `CURRENCY_CODES`) contra su tabla generada
- **THEN** nombre de exportación, claves y valores string son idénticos a los
  de la versión escrita a mano que reemplazan

#### Scenario: Código nuevo en una tabla emparejada pide revisión

- **WHEN** Hacienda publica un código nuevo que `codes:extract` incorpora a
  una tabla ya emparejada, y `pnpm spec:generate` se ejecuta sin haberse
  ampliado el registro de parejas
- **THEN** el comando termina con código distinto de cero, nombra la tabla y
  el código faltante, y no escribe salida parcial

#### Scenario: Tablas sin pareja quedan solo reportadas

- **WHEN** `codes.json` contiene tablas sin entrada en el registro de parejas
  (p. ej. las auxiliares de ubicación)
- **THEN** la generación termina con código 0, no genera constantes para esas
  tablas e informa su cantidad en el reporte de revisión

#### Scenario: Los alias deprecados sobreviven a la generación

- **WHEN** se genera el árbol y se lee la fachada de constantes
- **THEN** los alias deprecados publicados siguen exportados con su valor
  canónico, el registro los declara como alias y la paridad de valor no los
  cuenta como desviación

### Requirement: La fachada de constantes reexporta el código generado

`shared/src/constants/**` SHALL dejar de contener catálogos de valores y SHALL
reexportar el código generado, conservando a mano únicamente los alias
deprecados y los mapas de nombres legibles curados. Ningún archivo de
`shared/src/constants/**` SHALL declarar un valor de código que también exista
en `shared/src/generated/**`, salvo los alias declarados como tales.

#### Scenario: Una constante no duplica un valor generado

- **WHEN** se recorre `shared/src/constants/**` buscando literales de catálogo
- **THEN** los únicos valores presentes son alias declarados o mapas de nombres

#### Scenario: Los alias apuntan al valor canónico

- **WHEN** se lee un alias deprecado de la fachada
- **THEN** su valor es igual al de la constante canónica generada

### Requirement: La verificación falla ante deriva entre el árbol y la regeneración (Candado 1)

`scripts/verify.mjs` SHALL ejecutar `spec:generate --no-extract` y, acto
seguido, un `git diff --exit-code` **acotado a `shared/src/generated/**`**; si
esas rutas difieren de lo que el generador produce desde el `codes.json`
commiteado, la verificación SHALL terminar con código distinto de cero. El
candado SHALL distinguir en su mensaje "la generación falló" (el paso de
generación terminó con código distinto de cero; el paso de diff no se
ejecuta) de "la regeneración produjo diff" (la generación terminó en cero y
el diff divergió, indicando que debe correrse `pnpm spec:generate` y
commitearse el resultado). El acotamiento SHALL excluir archivos fuera de esa
ruta: un árbol con trabajo sin commiter en otras partes NO SHALL hacer fallar
este candado. La frescura de `codes.json` frente a sus fuentes vendorizadas
SHALL quedar cubierta por la prueba de frescura de `codes-extraction`, no por
este candado. Al ser `pnpm verify` el gate de CI, el candado SHALL aplicar
también en CI.

#### Scenario: Árbol en sincronía

- **WHEN** `pnpm verify` corre sobre un checkout cuyo código generado coincide
  con la regeneración desde el `codes.json` commiteado
- **THEN** el candado 1 pasa y el resto de la verificación continúa

#### Scenario: Deriva detectada

- **WHEN** alguien edita a mano un archivo generado, o edita `codes.json` de
  modo que el generador produciría otro TypeScript, y corre `pnpm verify`
- **THEN** la verificación termina con código distinto de cero y señala las
  rutas divergentes bajo las rutas acotadas

#### Scenario: Trabajo sin commiter ajeno no contamina

- **WHEN** `pnpm verify` corre con archivos modificados fuera de
  `shared/src/generated/`
- **THEN** el candado 1 pasa

#### Scenario: La generación fallida se distingue del diff

- **WHEN** `spec:generate --no-extract` termina con código distinto de cero
  (p. ej. `codes.json` ilegible, o una tabla emparejada con un código sin
  clave configurada)
- **THEN** la verificación termina con código distinto de cero atribuyendo el
  fallo al paso de generación, sin ejecutar el paso de diff

### Requirement: Literales de código de catálogo prohibidos fuera de la carpeta generada (Candado 2)

El lint del repositorio SHALL fallar ante un literal de cadena que sea un
código de uno o dos dígitos numéricos (p. ej. `"01"`, `"02"`, `"1"`) escrito
en un archivo TypeScript de negocio, fuera de `shared/src/generated/**`. El
negocio SHALL referenciar los códigos únicamente mediante las constantes
generadas. Las únicas excepciones permitidas son: la propia carpeta generada,
los archivos de prueba (`*.spec.ts`, que fijan fixtures) y un allowlist
explícito en la config de lint con su justificación por archivo — en esta
fase, `packages/sdk/src/api/error-codes.ts`, cuyo catálogo de códigos de
rechazo de la API de Hacienda no proviene de los XSD ni de `codes.json`. El
candado SHALL cubrir las categorías de una y dos cifras que esta fase exporta
(incluidas las provincias, `"1"`–`"7"`); los códigos compuestos de ubicación
(con puntos) y los alfabéticos de tres letras (monedas) quedan fuera del
candado, y sus exclusiones SHALL estar documentadas en la config de lint con
su motivo (no existe aún constante generada a la que referirse / tasa de
falsos positivos insostenible). La regla SHALL estar demostrada por una
prueba automatizada que fije la detección: el literal plantado fuera de la
carpeta generada produce error, el mismo literal dentro produce ninguno, y el
allowlist declarado produce ninguno. La regla SHALL instalarse sobre el árbol
vigente (`main`), incluyendo los archivos que hoy declaran catálogos a mano,
y su allowlist SHALL registrar el motivo de cada excepción.

#### Scenario: Literal de código en negocio se rechaza

- **WHEN** un archivo TypeScript de negocio (p. ej. un validador) compara un
  campo contra `"02"` en lugar de usar la constante generada
- **THEN** `turbo lint` (y por tanto CI) termina con error apuntando al
  literal y a la constante como alternativa permitida

#### Scenario: Literales permitidos en sus excepciones

- **WHEN** `"01"` aparece dentro de `shared/src/generated/**`, en un
  `*.spec.ts` o en el archivo con allowlist declarado
- **THEN** el lint no reporta error

#### Scenario: La regla está probada

- **WHEN** se ejecutan las pruebas del repo
- **THEN** una prueba automatizada verifica las tres condiciones del escenario
  anterior, de modo que una regla ausente o debilitada hace fallar la suite

#### Scenario: El allowlist declara el motivo de cada excepción

- **WHEN** se revisa la config de lint del árbol vigente
- **THEN** cada excepción del allowlist declara el motivo por el que existe

### Requirement: La generación queda preparada para `names.json` sin inventar nombres

El generador SHALL tratar `packages/sdk/schemas/names.json` como fuente
opcional de nombres legibles. Mientras el archivo no exista, la generación
SHALL funcionar y los mapas de nombres legibles curados a mano SHALL seguir
siendo la autoridad vigente (los generados no los reemplazan en esta fase).
Cuando `names.json` exista, el generador SHALL emitir los mapas de nombres
desde él; si falta un nombre para un código de una tabla emparejada que declara
fuente de nombres, SHALL terminar con código distinto de cero nombrando la
ausencia, sin adivinarla. El registro de parejas tabla→export con sus claves
SHALL estar versionado en el repo, de modo que toda pareja sea explícita y
auditable; las tablas sin pareja evidente SHALL quedar listadas para revisión
en cada corrida, nunca emparejadas a ciegas.

#### Scenario: Sin `names.json` (estado vigente)

- **WHEN** se corre `pnpm spec:generate` sin `packages/sdk/schemas/names.json`
- **THEN** el comando termina con código 0, genera tipos y constantes de
  código, no genera mapas de nombres, y el informe lista las tablas pendientes
  de pareja o de nombre legible para revisión

#### Scenario: Con `names.json` completo

- **WHEN** existe `names.json` con nombre para cada código de las tablas
  emparejadas que declaran fuente de nombres
- **THEN** los mapas de nombres se generan desde `names.json` y la
  regeneración es determinista

#### Scenario: `names.json` incompleto no se rellena adivinando

- **WHEN** `names.json` existe pero falta un nombre para un código de una
  tabla que declara fuente de nombres
- **THEN** el comando termina con código distinto de cero nombrando tabla y
  código faltante

### Requirement: Correcciones sancionadas de paridad con cita de fuente primaria

El requisito de paridad («La API pública existente se conserva; nada se
adivina») rige por defecto y sus escenarios no cambian. Este requisito define
la única excepción: una **corrección sancionada** es una entrada del registro
de parejas de `scripts/codes-generate/` que declara un desvío de paridad con
**(a)** el tipo de desvío (sustituir valor, eliminar clave o valor, renombrar
clave), **(b)** la cita de la fuente primaria del informe de conformidad del
repo (`docs/conformity-report.md`) y **(c)** la referencia a un Changeset
publicado que declare el rompimiento y sus notas de migración. `pnpm
spec:generate` SHALL aplicar las correcciones sancionadas y SHALL reportar
cada desvío aplicado con su tabla, clave y cita; una corrección sancionada
sin cita o sin Changeset de referencia SHALL hacer terminar el comando con
código distinto de cero sin escribir salida parcial. Un desvío de paridad
no declarado como corrección sancionada SHALL seguir haciendo fallar el comando bajo el requisito de paridad, nombrando tabla y clave.

#### Scenario: Una corrección sancionada se aplica y se reporta

- **WHEN** el registro de parejas declara una corrección con tipo y cita para
  una tabla (p. ej. `ExonerationType` sin el valor «12», o `DocumentTypeCode`
  con el catálogo oficial de 10 tipos del ANEXOS V4.4 p. 65 inciso c) y se
  ejecuta `pnpm spec:generate`
- **THEN** el comando termina con código 0, la salida generada refleja el
  desvío declarado (clave eliminada, renombrada o valor sustituido) y el
  reporte lista cada desvío con su tabla, clave y cita

#### Scenario: Corrección sin cita o sin Changeset se rechaza

- **WHEN** el registro de parejas declara un desvío de paridad sin cita de
  fuente primaria o sin referencia a Changeset publicado
- **THEN** el comando termina con código distinto de cero nombrando tabla,
  clave y el campo faltante de la corrección, sin escribir salida parcial

#### Scenario: Un desvío no declarado sigue haciendo fallar

- **WHEN** la tabla generada difiere de la versión escrita a mano en una clave
  o valor que el registro no declara como corrección sancionada
- **THEN** el comando termina con código distinto de cero nombrando tabla,
  clave y tipo de desvío, sin escribir salida parcial
