## Why

Hoy el consecutivo se **gasta en la asignación**: `getNextSequence()` lo
devuelve y el documento que lo lleva todavía no existe. Si el proceso muere
entre asignar y enviar, el número queda saltado; si un consumidor reintenta
mal, el mismo número puede acabar en dos documentos. Hacienda **verifica** la
secuencia al validar el comprobante (los ANEXOS v4.4 lo dicen: "se verificará
el cumplimiento de la secuencia en la generación de la numeración
consecutiva"), así que un repetido es un documento rechazado y un saltado es una
pregunta de un auditor.

El store de secuencias ya está bien encaminado —lock por `mkdir`, escritura
atómica por `rename`, con timeout, overflow y corrupción contemplados— y el MCP
además se niega a reiniciar en silencio una serie usada. Lo que falta es la
mitad complementaria: que **todo consecutivo entregado pertenezca a un
documento persistido**, y que eso se pueda demostrar con un crash inyectado en
cualquier punto del pipeline de envío.

## What Changes

- **El consecutivo se asigna junto a un documento**: la asignación y la
  persistencia del documento ocurren en el mismo paso; no existe un consecutivo
  entregado que no pertenezca a un documento persistido.
- **Un consecutivo no vuelve al pool**: si un documento no se va a emitir, se
  marca como descartado con su motivo (queda registrado y auditable); no se
  libera para que otro documento lo use. Un repetido es un rechazo; un saltado
  documentado es una respuesta.
- **Un crash inyectado deja el almacén consistente**, con los puntos de fallo
  enumerados: antes y después de cada paso del pipeline (asignar, construir,
  firmar, persistir, enviar, polear, liquidar).
- **Las invariantes son tres y comprobables**: ningún consecutivo se entrega dos
  veces; todo consecutivo entregado pertenece a un documento persistido; todo
  documento persistido se puede reanudar.
- **El camino del MCP**: la herramienta que reparte consecutivos deja de dar un
  número suelto y lo ata a un documento, o deja de existir como repartir
  suelto.

**BREAKING**: sí, en la superficie de reparto de consecutivos: `getNextSequence`
suelto deja de ser la forma recomendada de asignar (el número se pide con el
documento). La API existente se conserva, marcada como tal, para no romper a
quien la use, pero el camino nuevo es el documentado.

## Capabilities

### New Capabilities

- `sequence-integrity`: la garantía de que el consecutivo no se repite ni se
  salta sin registro, bajo concurrencia y bajo crash.

### Modified Capabilities

Ninguna.

## Impact

- **Código afectado**: `packages/sdk/src/config/sequence-store.ts` (extendido
  con la asignación junto al documento y el registro de descartes),
  `packages/sdk/src/delivery/**` (el outbox de A8.2 es donde queda el documento),
  `packages/mcp/src/tools/issuer-sequence.ts` (deja de repartir números sueltos).
- **Dependencias**: esta change se apoya en el outbox de **A8.2** (el documento
  persistido es donde aterriza la asignación) y no necesita el calendario de
  A8.1.
- **Riesgo de alcance**: el _harness_ de crash inyectado es la parte más
  grande: mata el proceso en puntos discretos del pipeline y comprueba las
  invariantes al volver a arrancar. Sale de la suite del SDK, no del CI de integración.
- **Riesgo de compatibilidad**: `getNextSequence` sigue existiendo (no se
  rompe a nadie), pero el camino documentado pasa a ser "asignar con el
  documento".
