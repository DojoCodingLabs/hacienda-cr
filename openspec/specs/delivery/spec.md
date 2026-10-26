## Purpose

El outbox durable de comprobantes y la máquina de estados de la entrega, con las obligaciones por situación y el plazo legal evaluado en días hábiles.

## Requirements

### Requirement: El documento se persiste antes de enviarlo

Todo comprobante que el SDK emite SHALL quedar **persistido** en un almacén
duradero (outbox) antes de su primer intento de envío, con su XML, su clave,
su situación y su plazo. El envío SHALL conducirse desde ese almacén, no desde
la memoria del proceso: un documento persistido es un documento que se puede
retomar tras una interrupción. El SDK SHALL ofrecer una implementación de
archivo de ese almacén, con escritura atómica por documento, y SHALL permitir
que el consumidor sustituya el almacén por el suyo mediante una interfaz.

#### Scenario: El documento entra al almacén antes de enviarse

- **WHEN** se emite un comprobante y se intenta enviarlo
- **THEN** el comprobante ya está persistido en el almacén con su XML, su clave,
  su situación y su plazo

#### Scenario: Un proceso que muere conserva el documento

- **WHEN** el proceso se interrumpe después de persistir el documento y antes
  de que Hacienda responda
- **THEN** al volver a arrancar, el documento sigue en el almacén y se puede
  reintentar su envío

#### Scenario: El almacén del consumidor puede sustituir al del SDK

- **WHEN** el consumidor entrega su propia implementación del almacén
- **THEN** el SDK la usa y no escribe en su propio almacén

### Requirement: La entrega es una máquina de estados explícita

El estado de entrega de un comprobante SHALL ser uno de `FIRMADO`, `PENDIENTE`,
`ENVIADO`, `ACEPTADO`, `RECHAZADO`, `ALMACENADO` o `VENCIDO`, y cada transición
SHALL ser una operación explícita y registrada, no una rama dispersa. El
almacén SHALL registrar el estado vigente de cada documento, de modo que el
estado se pueda consultar, reanudar y auditar. Una transición inválida SHALL ser
un error explícito, no un estado silenciosamente cambiado.

#### Scenario: Las transiciones posibles están declaradas

- **WHEN** se consulta la tabla de transiciones de la entrega
- **THEN** declara cada estado, de dónde se llega a él y qué operación lo produce

#### Scenario: Una transición inválida falla

- **WHEN** se pide pasar un comprobante de `ACEPTADO` a `ENVIADO`
- **THEN** la operación falla nombrando la transición inválida y el estado
  vigente

#### Scenario: El estado se puede consultar

- **WHEN** se consulta el estado de entrega de un comprobante persistido
- **THEN** devuelve su estado vigente y su historial de transiciones

### Requirement: La situación se fija al generar y no cambia

La situación del comprobante (`normal`, `contingencia`, `sin internet`) SHALL
decidirse al generar el documento, SHALL quedar registrada junto a él y SHALL ser
inmutable: ningún flujo puede cambiar la situación de un comprobante ya
persistido. La clave del documento y su situación SHALL coincidir siempre.

#### Scenario: La situación no cambia después de persistir

- **WHEN** se intenta cambiar la situación de un comprobante persistido
- **THEN** la operación falla y el comprobante conserva su situación original

#### Scenario: La clave y la situación coinciden

- **WHEN** se persiste un comprobante
- **THEN** el dígito de situación de su clave es el mismo que su situación
  registrada

### Requirement: Cada situación tiene su propia obligación

El SDK SHALL asociar a cada situación su obligación, y la obligación SHALL ser
parte del contrato, no una constante interna:

- `normal`: envío inmediato, en el mismo acto.
- `sin internet`: transmisión dentro del plazo en días hábiles desde la
  generación, y el documento **no** referencia un comprobante provisional
  preimpreso.
- `contingencia`: el documento electrónico sustituye a un comprobante físico
  emitido por contingencia, y por tanto **referencia** ese provisional; su
  transmisión vence en el plazo en días hábiles desde que la contingencia se
  superó.

#### Scenario: Un documento sin internet no referencia un provisional

- **WHEN** se genera un comprobante con situación `sin internet`
- **THEN** su referencia de información no apunta a un comprobante provisional

#### Scenario: Un documento de contingencia referencia el provisional

- **WHEN** se genera un comprobante con situación `contingencia`
- **THEN** su referencia de información apunta al comprobante provisional que
  sustituye

#### Scenario: La obligación viaja con el documento

- **WHEN** se consulta un comprobante persistido
- **THEN** devuelve su situación y la obligación que esa situación impone

### Requirement: El plazo se evalúa en días hábiles

El plazo de transmisión de un comprobante SHALL evaluarse con la aritmética de
días hábiles contra el calendario de feriados vendorizado y en la zona
`America/Costa_Rica`, y el número de días hábiles SHALL ser un parámetro
explícito. Un comprobante cuyo plazo se pasó SHALL quedar en el estado
`VENCIDO`, que es una infracción y no un fallo de envío.

#### Scenario: Un comprobante dentro del plazo no vence

- **WHEN** se evalúa el plazo de un comprobante cuya fecha de generación está
  dentro del plazo en días hábiles
- **THEN** el comprobante no está vencido

#### Scenario: Un comprobante fuera del plazo queda vencido

- **WHEN** se evalúa el plazo de un comprobante cuya fecha de generación ya
  pasó el plazo en días hábiles
- **THEN** el comprobante queda en estado `VENCIDO` y se puede consultar en
  qué día hábil venció

### Requirement: Un fallo ambiguo se consulta antes de reenviar

Cuando un envío termine en un estado ambiguo —la respuesta no permite saber si el comprobante llegó a Hacienda— el SDK SHALL consultar el estado de **esa misma clave** antes de decidir un reenvío, y el reenvío, si lo hay, SHALL usar la misma clave. El SDK SHALL NOT enviar un comprobante con un consecutivo nuevo para resolver una ambigüedad.

#### Scenario: La ambigüedad se resuelve consultando

- **WHEN** un envío queda ambiguo
- **THEN** el SDK consulta el estado de la misma clave antes de reenviar

#### Scenario: El reenvío conserva la clave

- **WHEN** un reenvío ocurre después de una ambigüedad
- **THEN** el comprobante reenviado tiene la misma clave y el mismo
  consecutivo que el original

### Requirement: El enlace caído se detecta, el documento se almacena y se reenvía

Cuando el enlace con Hacienda no esté disponible, el comprobante SHALL pasar al
estado `ALMACENADO` y SHALL reintentarse cuando el enlace se restablezca, sin
cambiar su clave ni su situación. El SDK SHALL distinguir "el enlace está
caído" de "el comprobante fue rechazado": un rechazo es una respuesta de
Hacienda y un enlace caído no lo es.

#### Scenario: El enlace caído deja el documento almacenado

- **WHEN** el envío falla porque el enlace con Hacienda no está disponible
- **THEN** el comprobante queda en estado `ALMACENADO` y su clave no cambia

#### Scenario: El reintento usa la misma clave

- **WHEN** un comprobante almacenado se reintenta tras restablecerse el
  enlace
- **THEN** se envía con la misma clave y pasa a `ENVIADO`

#### Scenario: Un rechazo no es un enlace caído

- **WHEN** Hacienda responde que rechaza el comprobante
- **THEN** el comprobante queda en estado `RECHAZADO` y no en `ALMACENADO`
