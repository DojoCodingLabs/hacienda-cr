## Context

Ver `proposal.md` — Why. A8.2 es el núcleo de "corrección del protocolo bajo
falla": un almacén durable de comprobantes (outbox) y una máquina de estados
explícita de la entrega, con las obligaciones por situación del Reglamento
44739-H (arts. 21 y 23) y el plazo evaluado en días hábiles con la aritmética
de A8.1.

La decisión de fondo que ya está tomada: **el documento se persiste antes de
enviarse** (outbox), en vez de liberar el consecutivo al pool cuando el envío
falla. La razón es que un consecutivo liberado puede acabar en otro documento
—un repetido es un rechazo— mientras que un documento persistido siempre se
puede mandar.

## Goals / Non-Goals

**Goals:**

- Que un documento emitido exista fuera de la memoria del proceso.
- Que el estado de entrega sea un dato consultable, con transiciones
  explícitas y auditables.
- Que las obligaciones del reglamento vivan en el modelo y no en la
  documentación.
- Que la rama "enlace caído" se pruebe **sin red**, contra el mock.

**Non-Goals:**

- No define la política de emisión ni la interfaz de usuario (eso es la Ruta B).
- No resuelve la integridad del consecutivo (A8.3); esta change sólo garantiza
  que la clave y el documento viajan juntos.
- No implementa un worker: entrega el almacén y las operaciones; quién las
  dispara es del consumidor.
- No toca la autenticación, la firma ni el XML.

## Decisions

| Decisión                                                                 | Racional                                                                                                          | Alternativas consideradas                                                           |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **El outbox es un almacén de documentos, no un registro de eventos**     | Un documento es la unidad que el reglamento obliga a guardar y reenviar; un log de eventos obliga a reconstruirlo | Outbox de eventos (el estado se deriva, la reconstrucción es frágil)                |
| **Un archivo por documento, escritura atómica por documento**            | Evita el lock global: el lock queda sólo para el contador de consecutivos (A8.3)                                  | Un único archivo de estado con lock (el store de secuencias ya lo hace, y funciona) |
| **El estado se guarda junto al documento**                               | El estado y el XML no pueden separarse sin una transacción                                                        | Estado aparte (ventana de inconsistencia)                                           |
| **La interfaz del almacén es inyectable**                                | El SDK define el contrato; el consumidor puede implementarlo sobre su base de datos                               | Sólo la implementación de archivo (obligaría a la app a usar archivos               |
| **La situación es un dato, no un parámetro de flujo**                    | Es inmutable por ley: se declara al generar y no se toca después                                                  | Flujo que "decide" la situación (permitiría corregirla en silencio)                 |
| **La obligación viaja con el documento**                                 | El SDK no debe decidir en el call site qué obligation aplica                                                      | Que el consumidor la aplique (el SDK no garantiza nada)                             |
| **El plazo es un parámetro con default del reglamento**                  | El default refleja la ley; el parámetro permite otros plazos sin cambiar el código                                | Plazo fijo (la ley se queda incrustada)                                             |
| **La ambigüedad se resuelve consultando la clave**                       | Ya es la regla del `AGENTS.md` raíz; el outbox la hace posible sin estado extra                                   | Reenviar a ciegas (documento duplicado)                                             |
| **"Enlace caído" es una señal del transporte, no un estado de Hacienda** | Un rechazo es respuesta; un enlace caído no la tiene                                                              | Tratar ambos como error (se reintentaría un rechazo, que no se reintenta)           |
| **El mock gana un interruptor de enlace caído**                          | La rama `ALMACENADO` se prueba offline, end to end                                                                | Probarlo contra el sandbox real (requiere red y credenciales)                       |

## Risks / Trade-offs

- **[Riesgo: el outbox crece sin límite]** → retención configurable; el
  reglamento exige 5 años de almacenamiento (art. 22), así que el valor por
  defecto es conservador y el almacén no borra solo.
- **[Riesgo: el almacén de archivo no escala]** → la interfaz es inyectable
  desde el principio: el consumidor de la Ruta B lo implementa sobre su base de
  datos sin cambiar el SDK.
- **[Riesgo: persistir antes de enviar cambia la latencia]** → la escritura es
  de un archivo por documento; el costo es del orden de una escritura de disco.
- **[Riesgo: el estado `VENCIDO` no es recuperable]** → es correcto: un plazo
  vencido es una infracción (art. 24); el SDK lo hace visible, no lo arregla.
- **[Riesgo: "enlace caído" mal clasificado]** → un error de red y un 5xx se
  tratan como enlace caído; un 4xx o una respuesta válida, no. La clasificación
  es explícita y probada.
- **[Riesgo: el SDK empieza a tener estado]** → es el precio de "almacena y
  reenvía"; el estado vive en el archivo del consumidor, no en un servidor del
  SDK.

## La tabla de transiciones

```
                 ┌───────────────┐
   persistir ───▶│   FIRMADO     │  (situación y plazo fijados)
                 └───────┬───────┘
                         │ enviar
                         ▼
                 ┌───────────────┐   enlace caído   ┌───────────────┐
                 │   PENDIENTE   │─────────────────▶│  ALMACENADO   │
                 └───────┬───────┘                  └───────┬───────┘
                         │                                  │ reintentar
                         │ respuesta                        │
             ┌───────────┴───────────┐                      │
             ▼                       ▼                      │
     ┌───────────────┐       ┌───────────────┐              │
     │   ENVIADO     │──────▶│   ACEPTADO    │              │
     └───────┬───────┘       └───────────────┘              │
             │                                            │
             ▼                                            │
     ┌───────────────┐                                     │
     │  RECHAZADO    │                                     │
     └───────────────┘                                     │
                                                          │
     ┌───────────────┐   el plazo se pasó                 │
     │   VENCIDO     │◀──────────────────────────────────┘
     └───────────────┘
```

Las transiciones que la tabla **no** permite (aceptado → enviado, vencido →
enviado) son errores explícitos, no estados silenciosos.
