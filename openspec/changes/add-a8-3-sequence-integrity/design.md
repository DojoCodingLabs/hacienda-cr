## Context

Ver `proposal.md` - Why. El store de secuencias ya existe y está bien
construido (`packages/sdk/src/config/sequence-store.ts`: lock por `mkdir`,
escritura atómica por `rename`, timeout, overflow, corrupción contemplada) y el
MCP se niega a reiniciar en silencio una serie ya usada. Lo que falta es la
garantía del otro lado: que **todo consecutivo entregado pertenezca a un
documento persistido**, y que se pueda demostrar inyectando un crash en cada
punto del pipeline.

A8.3 se apoya en el outbox de A8.2 (es donde aterriza el documento) y no
necesita el calendario de A8.1.

## Goals / Non-Goals

**Goals:**

- Que no exista un consecutivo entregado que no pertenezca a un documento
  persistido.
- Que un consecutivo no se repita nunca, ni siquiera bajo concurrencia o crash.
- Que un consecutivo no usado quede **registrado** como descartado, no devuelto
  al pool en silencio.
- Que la garantía sea **demostrable**: un harness que recorre todos los puntos
  de fallo y comprueba las invariantes al reiniciar.

**Non-Goals:**

- No cambia el formato del store ni su disciplina de lock.
- No implementa la máquina de estados de la entrega (A8.2); sólo usa su
  almacén.
- No decide la política de reinicio de una serie: la mantiene explícita, con
  motivo registrado.
- No toca la firma ni el XML.

## Decisions

| Decisión                                                            | Racional                                                                                                              | Alternativas consideradas                                                              |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **La asignación y la persistencia son un solo paso**                | Es la única forma de garantizar "todo consecutivo entregado pertenece a un documento" sin una transacción distribuida | Reservar el consecutivo y persistir después (ventana de inconsistencia)                |
| **El número se pide con el documento, no suelto**                   | El reparto suelto es la fuente del hueco; la API legacy se conserva marcada, no recomendada                           | Borrar la API legacy (rompe a quien la usa)                                            |
| **Un consecutivo no vuelve al pool**                                | Un repetido es un rechazo de Hacienda; un saltado documentado es una respuesta auditable                              | Liberar el número al pool (repetido garantizado si el primer documento se emite tarde) |
| **El descarte es un registro, no un borrado**                       | El rastro de "este número no se usó y por qué" es lo que responde al auditor                                          | Silenciar el descarte (aparece como hueco sin explicación)                             |
| **Los puntos de fallo se enumeran en el código**                    | El harness debe recorrerlos todos; una lista implícita deja puntos sin probar                                         | Puntos implícitos en la implementación (alguien añade un paso y nadie lo prueba)       |
| **El crash se inyecta en un proceso hijo**                          | Un `throw` en el mismo proceso no reproduce un corte real: no hay buffer perdido ni escritura parcial                 | Inyectar excepciones (no reproduce el corte)                                           |
| **Las invariantes se comprueban después de reiniciar**              | El objetivo es probar que el estado en disco es consistente, no que el código no lanzó                                | Comprobar invariantes en memoria antes de morir (no prueba la persistencia)            |
| **El MCP deja de repartir números sueltos**                         | Un número suelto por MCP es exactamente el hueco que se quiere cerrar                                                 | Dejar el MCP como estaba (la garantía se pierde en esa puerta)                         |
| **La compatibilidad se preserva con una marca, no con un silencio** | `getNextSequence` sigue viva y documentada como legacy, con su advertencia                                            | Marcar deprecado sin explicar (el consumidor no sabe qué hacer)                        |

## Los puntos de fallo

El pipeline de emisión, con los puntos en que puede cortarse:

```
  1. asignar    el consecutivo se toma de la serie
  2. construir  el XML del documento
  3. firmar     la firma digital
  4. persistir  el documento entra al outbox
  5. enviar     el POST a Hacienda
  6. polear     la consulta del estado de la clave
  7. liquidar   el estado final (aceptado / rechazado)
```

El harness mata el proceso hijo en cada uno de esos puntos (y en los límites
entre ellos) y, al volver a arrancar, comprueba las invariantes.

### Las invariantes

1. **No hay entrega doble**: ningún consecutivo se ha entregado dos veces.
2. **Toda entrega está documentada**: todo consecutivo entregado pertenece a un
   documento persistido.
3. **Todo documento persistido es reanudable**: se puede listar, consultar y
   reintentar.

La tercera invariante es la que une A8.2 con A8.3: si el outbox guarda un
documento al que no se puede volver, el almacén es un hoyo negro.

## Risks / Trade-offs

- **[Riesgo: el harness de crash es lento y frágil]** cada punto es un caso
  aislado con un proceso hijo; el tiempo de ejecución se acota con un timeout
  por caso y el conjunto corre en la suite del SDK, no en el CI de integración.
- **[Riesgo: acoplar la asignación al outbox ata las dos changes]** es
  intencional: la garantía no se puede sostener en dos piezas. A8.3 depende de
  A8.2 y por eso va encima en la pila.
- **[Riesgo: un descarte acumulado infla el store]** el store crece con los
  descartes, que son raros; se acepta a cambio de la trazabilidad.
- **[Riesgo: el proceso hijo hereda el lock del padre]** el lock por `mkdir`
  tiene timeout y el harness lo respeta; un caso de prueba que no obtiene el
  lock en el tiempo previsto se reporta como fallo del harness, no como
  un resultado inválido.
- **[Riesgo: la API legacy sigue abierta]** es una puerta por la que se puede
  volver a abrir el hueco; por eso queda marcada y documentada, y el MCP deja
  de usarla.
