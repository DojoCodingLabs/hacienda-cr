## ADDED Requirements

### Requirement: El consecutivo se asigna junto a un documento

Todo consecutivo que el SDK entregue SHALL quedar ligado a un documento
persistido en el mismo paso en que se entrega. El SDK SHALL NOT entregar un
consecutivo sin documento: la asignación sin documento SHALL ser una operación
distinta, explícita y marcada como legacy, que el consumidor puede seguir
usando pero que no es el camino documentado. La llave del documento y su
consecutivo SHALL coincidir: un documento nunca puede llevar el consecutivo de
otro.

#### Scenario: La asignación y la persistencia ocurren juntas

- **WHEN** se emite un comprobante
- **THEN** el consecutivo se entrega y el documento queda persistido con ese
  mismo consecutivo, en el mismo paso

#### Scenario: No hay consecutivos sin documento

- **WHEN** se revisan los consecutivos entregados y los documentos persistidos
- **THEN** todo consecutivo entregado pertenece a un documento persistido

#### Scenario: Un documento no puede llevar el consecutivo de otro

- **WHEN** se intenta persistir un documento con un consecutivo que ya
  pertenece a otro documento
- **THEN** la operación falla nombrando el conflicto

### Requirement: Un consecutivo no vuelve al pool

Cuando un documento con consecutivo asignado no se va a emitir, ese
consecutivo SHALL quedar registrado como **descartado**, con su motivo y su
fecha, y SHALL NOT volver a la serie disponible. La serie SHALL NOT reusar
un consecutivo descartado ni devolverlo al pool: un repetido es un documento
rechazado por Hacienda, mientras que un saltado documentado es una respuesta
auditable.

#### Scenario: Un documento descartado deja su consecutivo registrado

- **WHEN** se descarta un documento que ya tenía consecutivo
- **THEN** el consecutivo queda registrado como descartado, con su motivo, y no
  vuelve a la serie

#### Scenario: La serie no reusa un consecutivo descartado

- **WHEN** se pide el siguiente consecutivo de una serie con descartes
- **THEN** el consecutivo entregado es mayor que todos los entregados o
  descartados de esa serie

#### Scenario: El descarte queda consultable

- **WHEN** se consulta la serie de un emisor
- **THEN** devuelve los consecutivos entregados y los descartados, con sus
  motivos

### Requirement: Un crash en cualquier punto deja el almacén consistente

El SDK SHALL permitir inyectar un crash en cada punto discreto del pipeline de
emisión (asignar el consecutivo, construir el documento, firmarlo, persistirlo,
enviarlo, polear y liquidar) y SHALL comprobar, después de volver a
arrancar, que el almacén de consecutivos y el de documentos quedan consistentes.
Los puntos de fallo SHALL estar enumerados en el código, no implícitos en la
implementación, para que la prueba los recorra todos.

#### Scenario: Un crash antes de asignar no mueve la serie

- **WHEN** el proceso muere antes de asignar el consecutivo
- **THEN** la serie queda como estaba y no hay documento pendiente

#### Scenario: Un crash después de asignar deja el documento pendiente

- **WHEN** el proceso muere después de asignar el consecutivo
- **THEN** el documento queda persistido con su clave y su consecutivo, y la
  serie queda en el valor siguiente

#### Scenario: Un crash durante el envío no marca el documento como enviado

- **WHEN** el proceso muere mientras la petición de envío está en vuelo
- **THEN** el documento sigue pendiente, nunca `ENVIADO` a ciegas, y al
  reiniciar se consulta su estado antes de reenviar

#### Scenario: Los puntos de fallo están enumerados

- **WHEN** se revisa el harness de crash
- **THEN** declara cada punto del pipeline en el que puede interrumpirse

### Requirement: Las invariantes se comprueban después de cada crash

Tras cualquier crash inyectado, el SDK SHALL comprobar tres invariantes: ningún
consecutivo se ha entregado dos veces, todo consecutivo entregado pertenece a un
documento persistido, y todo documento persistido se puede reanudar. Las
pruebas SHALL correr esos crashes **en paralelo** para comprobar además que la
asignación bajo concurrencia no repite un consecutivo.

#### Scenario: Las tres invariantes se comprueban

- **WHEN** termina un crash inyectado
- **THEN** se comprueban las tres invariantes y el fallo de cualquiera de ellas
  hace fallar la prueba

#### Scenario: La concurrencia no repite un consecutivo

- **WHEN** varios emisores asignan consecutivos a la vez sobre la misma serie
- **THEN** los consecutivos entregados son distintos y contiguos

#### Scenario: Un documento pendiente se puede reanudar

- **WHEN** el proceso vuelve a arrancar tras un crash
- **THEN** los documentos pendientes se listan y se pueden reintentar

### Requirement: La serie por emisor y ambiente no se reinicia en silencio

La numeración SHALL seguir siendo por emisor, ambiente, tipo de comprobante,
sucursal y terminal, y una serie usada SHALL NOT reiniciarse sin una decisión
explícita del operador. El reinicio deliberado SHALL quedar registrado con su
motivo.

#### Scenario: Una serie usada no se reinicia sola

- **WHEN** se pide un consecutivo de una serie que ya tiene números
- **THEN** la serie continúa donde iba

#### Scenario: El reinicio deliberado queda registrado

- **WHEN** un operador reinicia una serie a propósito
- **THEN** el reinicio queda registrado con su motivo
