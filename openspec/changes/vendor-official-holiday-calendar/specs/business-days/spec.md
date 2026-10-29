## MODIFIED Requirements

### Requirement: El calendario de feriados es un dato vendorizado con procedencia verificable

El repositorio SHALL mantener el calendario de feriados costarricenses como un
**artefacto de datos** versionado, no como código, junto con su procedencia
(de dónde salió cada fecha) y su hash. La cobertura SHALL ser explícita y
acotada: 2025–2026, con una carta oficial del MTSS por año. El calendario SHALL
entrar en la verificación de integridad offline (`pnpm spec:verify`) junto con
los XSD y el PDF de Anexos, de modo que una edición local se detecte como
deriva.

La frescura **remota** no la vigila `spec:check`: la vigila un job de refresco
dedicado, documentado, que sólo propone un cambio y nunca lo aplica solo. La
documentación del calendario SHALL decir esto explícitamente, para no prometer
una verificación que no ocurre.

#### Scenario: La tabla vendorizada declara su procedencia

- **WHEN** se lee el manifiesto y el README de los feriados vendorizados
- **THEN** declaran la carta oficial de origen, el rango 2025–2026 que cubre y
  el hash de sus bytes, igual que hace el manifiesto de los esquemas

#### Scenario: Una edición local de la tabla se detecta

- **WHEN** alguien edita a mano la tabla de feriados vendorizada
- **THEN** `pnpm spec:verify` falla señalando el archivo y su hash

#### Scenario: La fuente oficial se distingue de la externa

- **WHEN** se lee la documentación del calendario vendorizado
- **THEN** declara si su procedencia es una superficie oficial o externa, y en
  el caso externo declara el alcance de la garantía que da

#### Scenario: La frescura remota no se atribuye a `spec:check`

- **WHEN** se lee el spec o el runbook de actualización
- **THEN** distingue la integridad local (`spec:verify`) del sondeo remoto del
  job de refresco, y no afirma que `spec:check` detecta una carta nueva

## REMOVED Requirements

### Requirement: El feriado se cuenta en su fecha observada

**Reason**: La regla de traslado que describía (martes/miércoles al lunes
anterior; jueves a domingo al lunes siguiente) no está vigente. La Ley 9875 fue
un transitorio enumerado para 2020–2024, y las cartas del MTSS de 2025 y 2026
declaran las fechas nominales como día de disfrute.

**Migration**: Usar el requisito nuevo "El feriado se observa en la fecha que
declara la fuente oficial". Los traslados que una fuente oficial enumere se
registran como override explícito en el calendario vendorizado.

### Requirement: La aritmética se verifica contra la tabla real

**Reason**: El requisito anterior referenciaba el feriado de 2030 y los
traslados a lunes, ambos fuera de la cobertura y del comportamiento vigente.

**Migration**: Usar el requisito nuevo "La aritmética se verifica contra la
tabla real y el rango cubierto", que prueba 2025–2026 y el fallo fuera de rango.

## ADDED Requirements

### Requirement: El feriado se observa en la fecha que declara la fuente oficial

El calendario SHALL distinguir la fecha **nominal** de un feriado de su fecha
**observada**, que es la fecha en que el feriado no se trabaja. La fecha
observada SHALL ser igual a la nominal salvo que una fuente oficial enumere,
para ese feriado y ese año, un traslado a otro día. Un traslado SHALL
registrarse como **override explícito en los datos**, nunca inferirse de la
letra del día de la semana ni de una fórmula general. La aritmética de días
hábiles SHALL contar los días observados, nunca los nominales.

#### Scenario: Un feriado de martes se observa ese mismo martes

- **WHEN** se calcula un plazo que cae sobre el 15 de setiembre de 2026, que la
  carta del MTSS declara martes
- **THEN** ese martes no se cuenta como hábil y el lunes anterior sí se cuenta

#### Scenario: Un feriado de viernes se observa ese mismo viernes

- **WHEN** se calcula un plazo que cae sobre el 25 de diciembre de 2026, que la
  carta del MTSS declara viernes
- **THEN** ese viernes no se cuenta como hábil y el lunes siguiente sí se cuenta

#### Scenario: Un traslado enumerado se registra como override

- **WHEN** una fuente oficial enumera un traslado para un feriado y un año
- **THEN** el calendario vendorizado declara la fecha observada explícita para
  ese feriado y año, y la aritmética usa esa fecha

#### Scenario: La fecha nominal se conserva para la trazabilidad

- **WHEN** se inspecciona el calendario vendorizado
- **THEN** cada feriado declara su fecha nominal, y su fecha observada se lee
  del override cuando existe o es igual a la nominal cuando no existe

### Requirement: La aritmética se verifica contra la tabla real y el rango cubierto

Las pruebas de la aritmética de días hábiles SHALL usar las fechas de la tabla
vendorizada —Semana Santa de 2025 y 2026, el 31 de agosto, el 15 de setiembre y
el 25 de diciembre de 2026— y no fechas inventadas, de modo que una regresión en
la observación se detecte contra el calendario real. Las pruebas SHALL cubrir
también el fallo explícito fuera de la cobertura.

#### Scenario: La Semana Santa no cuenta

- **WHEN** se cuenta un plazo que atraviesa el jueves y el viernes santos de la
  tabla vendorizada
- **THEN** ninguno de los dos días cuenta como hábil

#### Scenario: El feriado de martes no se traslada al lunes

- **WHEN** se cuenta un plazo del año 2026 que cae sobre el 15 de setiembre
- **THEN** el 15 de setiembre no cuenta como hábil y el 14 de setiembre sí

#### Scenario: El feriado de fin de semana no mueve el lunes

- **WHEN** se cuenta un plazo del año 2026 que cae sobre el 15 de agosto, sábado
- **THEN** el viernes anterior y el lunes siguiente se cuentan como hábiles

#### Scenario: Un año fuera de cobertura falla en vez de adivinar

- **WHEN** se intenta calcular un día hábil para 2024 o para 2027
- **THEN** la operación falla con un error que nombra la cobertura 2025–2026, en
  vez de devolver un resultado

### Requirement: El año nuevo se detecta antes de que venza la cobertura

El repositorio SHALL ofrecer un job de refresco, fuera del runtime del SDK, que
sondee la carta del año siguiente y una carta ya publicada como **control**.
El sondeo SHALL usar `GET`, porque la fuente rechaza `HEAD`. El job SHALL
distinguir tres resultados y SHALL NOT aplicar fechas automáticamente.

#### Scenario: La carta nueva todavía no está publicada

- **WHEN** el control responde 200 y el año siguiente responde 404
- **THEN** el job informa "aún no publicado" y no trata el 404 como un cambio de
  ruta

#### Scenario: La ruta de la fuente cambió

- **WHEN** el control responde 404
- **THEN** el job falla con una alerta de mantenimiento, porque el patrón de URL
  dejó de ser confiable

#### Scenario: La carta nueva aparece

- **WHEN** el año siguiente responde 200
- **THEN** el job descarga el PDF, calcula su hash y produce un diff de fechas
  contra el año anterior para revisión humana

#### Scenario: El job no cambia el calendario por su cuenta

- **WHEN** el job encuentra una carta nueva o un hash distinto
- **THEN** deja el calendario y el manifiesto sin modificar hasta que una
  persona revise y apruebe la transcripción

#### Scenario: El sondeo no corre en el SDK

- **WHEN** una aplicación usa el SDK en producción
- **THEN** el SDK no hace ninguna petición de red para resolver un feriado y
  sigue funcionando con el calendario vendorizado

### Requirement: Fuera de la cobertura el cálculo falla explícitamente

Las operaciones de días hábiles SHALL fallar con un error explícito cuando la
fecha cae fuera del rango 2025–2026, en vez de asumir que el día es hábil o de
extender la cobertura por inferencia. El mensaje SHALL nombrar el rango cubierto.

#### Scenario: Una fecha anterior a la cobertura falla

- **WHEN** se pide un cálculo para el 31 de diciembre de 2024
- **THEN** la operación falla y el mensaje nombra la cobertura 2025–2026

#### Scenario: Una fecha posterior a la cobertura falla

- **WHEN** se pide un cálculo para el 1 de enero de 2027
- **THEN** la operación falla y el mensaje nombra la cobertura 2025–2026
