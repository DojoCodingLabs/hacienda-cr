## ADDED Requirements

### Requirement: El calendario de feriados es un dato vendorizado con procedencia verificable

El repositorio SHALL mantener el calendario de feriados costarricenses como un
**artefacto de datos** versionado, no como código, junto con su procedencia
(de dónde salió cada fecha) y su hash. El calendario SHALL entrar en la
verificación de frescura de las fuentes (`pnpm spec:verify`) junto con los XSD
y el PDF de Anexos, de modo que un cambio en la tabla oficial se detecte como
deriva y no como un comportamiento que cambia solo en el entorno de quien lo
notó.

#### Scenario: La tabla vendorizada declara su procedencia

- **WHEN** se lee el manifiesto de los feriados vendorizados
- **THEN** declara el origen de la tabla, el rango de años que cubre y el hash
  de sus bytes, igual que hace el manifiesto de los esquemas

#### Scenario: Una edición local de la tabla se detecta

- **WHEN** alguien edita a mano la tabla de feriados vendorizada
- **THEN** la verificación de frescura falla señalando el archivo y su hash

#### Scenario: La fuente oficial se distingue de la externa

- **WHEN** se lee la documentación del calendario vendorizado
- **THEN** declara si su procedencia es una superficie oficial o externa, y en
  el caso externo declara el alcance de la garantía que da

### Requirement: El feriado se cuenta en su fecha observada

El calendario SHALL distinguir la fecha **nominal** de un feriado de su fecha
**observada**, que es la fecha en que el feriado no se trabaja. Un feriado que
cae en martes o miércoles se observa el lunes anterior; uno que cae de jueves a
domingo, el lunes siguiente; uno que ya cae en lunes se observa ese mismo
lunes. La aritmética de días hábiles SHALL contar los días observados, nunca los
nominales.

#### Scenario: Un feriado de martes se observa el lunes anterior

- **WHEN** se calcula un plazo que cae sobre un feriado nominal de martes
- **THEN** ese día no se cuenta como hábil, porque el feriado se observa el
  lunes anterior

#### Scenario: Un feriado de sábado se observa el lunes siguiente

- **WHEN** se calcula un plazo que cae sobre un feriado nominal de sábado
- **THEN** ese día no se cuenta como hábil, porque el feriado se observa el
  lunes siguiente

#### Scenario: La fecha nominal se conserva para la trazabilidad

- **WHEN** se inspecciona el calendario vendorizado
- **THEN** cada feriado declara su fecha nominal y su fecha observada, y la
  observación se deriva de la nominal por la regla, no se escribe a mano dos
  veces

### Requirement: Los días hábiles se calculan en `America/Costa_Rica`

El SDK SHALL ofrecer la aritmética de días hábiles sobre instantes, con la zona
`America/Costa_Rica` explícita: un día hábil es un día de lunes a viernes en
esa zona que no sea feriado observado. Las operaciones SHALL acceptar instantes
con zona y devolver instantes con zona, sin convertir a día local de la máquina
y sin aritmética de coma flotante sobre instantes.

#### Scenario: Un plazo cuenta sólo los días hábiles

- **WHEN** se suman dos días hábiles a un viernes que precede a un fin de
  semana
- **THEN** el resultado cae en el lunes siguiente, saltando el fin de semana

#### Scenario: Un plazo cuenta sólo los días hábiles que no son feriado

- **WHEN** se suman dos días hábiles a un día que precede a un feriado
  observado
- **THEN** el resultado salta el feriado y los días no hábiles intermedios

#### Scenario: La zona no depende de la máquina

- **WHEN** se calcula un plazo cerca del cambio de horario de Costa Rica
- **THEN** el resultado es el mismo con cualquier zona horaria del equipo que
  ejecuta el cálculo

#### Scenario: El conteo entre dos instantes no cuenta el extremo final

- **WHEN** se cuentan los días hábiles entre dos instantes
- **THEN** el conteo excluye el instante final e incluye el inicial, y es
  cero cuando ambos caen el mismo día hábil

### Requirement: El plazo se pide con su número, no queda escondido

El SDK SHALL recibir el número de días hábiles como parámetro explícito de la
operación de plazo, de modo que el plazo del reglamento (dos días hábiles) sea un
dato de quien lo invoca y no una constante incrustada en la lógica. El SDK
SHALL ofrecer la operación que responde si un plazo venció a la fecha de
referencia.

#### Scenario: El plazo se declara al invocarlo

- **WHEN** se calcula si un documento venció su plazo
- **THEN** la operación recibe el número de días hábiles del plazo y la fecha
  de referencia

#### Scenario: Un plazo vencido se detecta

- **WHEN** la fecha de referencia ya supera el plazo en días hábiles
- **THEN** la operación informa que el plazo venció, y en qué día hábil venció

#### Scenario: Un plazo por vencer se detecta

- **WHEN** la fecha de referencia todavía está dentro del plazo en días hábiles
- **THEN** la operación informa que el plazo no ha vencido y cuánto falta

### Requirement: La aritmética se verifica contra la tabla real

Las pruebas de la aritmética de días hábiles SHALL usar las fechas de la tabla
vendorizada —Semana Santa, el feriado que sólo aparece en 2030, los traslados a
lunes— y no fechas inventadas, de modo que una regresión en el traslado o en la
observación se detecte contra el calendario real.

#### Scenario: La Semana Santa no cuenta

- **WHEN** se cuenta un plazo que atraviesa el jueves y el viernes santos de la
  tabla vendorizada
- **THEN** ninguno de los dos días cuenta como hábil

#### Scenario: El feriado que aparece sólo en 2030 se respeta

- **WHEN** se cuenta un plazo del año 2030 que cae sobre el feriado que la
  tabla declara sólo para ese año
- **THEN** ese día no cuenta como hábil
