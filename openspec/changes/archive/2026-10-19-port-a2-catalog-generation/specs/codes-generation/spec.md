## MODIFIED Requirements

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

## ADDED Requirements

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
