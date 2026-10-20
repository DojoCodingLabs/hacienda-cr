## Context

Ver `proposal.md` - Why. El brief de A8 pide "aritmética de días hábiles contra el
calendario de feriados costarricense, en `America/Costa_Rica`, con la tabla de
feriados como datos, probada contra fechas conocidas". Las obligaciones que
consumen esa aritmética están en el Reglamento 44739-H (arts. 21 y 23), que hoy
**no está vendorizado en el repo**: el dato disponible es una tabla de terceros
(`calendariocostarica.com`, 2026-2030) con las fechas **nominales**.

La secuencia de trabajo es: primero el calendario (esta change), después la
máquina de estados de la entrega (A8.2) que necesita el plazo, y por último la
integridad de la secuencia (A8.3), que comparte el almacén con A8.2.

## Goals / Non-Goals

**Goals:**

- Que la aritmética de días hábiles sea un dato verificable, no una suposición.
- Que el calendario se pueda auditar igual que los XSD: procedencia, hash, frescura.
- Que la API sea pequeña y explícita: días hábiles, no "fechas de negocio" ambiguas.

**Non-Goals:**

- No implementa la máquina de estados de la entrega (A8.2) ni el outbox.
- No toca el store de secuencias (A8.3).
- No decide la política de plazo: recibe el número de días (dos, el del reglamento).
- No vendoriza el Reglamento 44739-H: esa es una decisión posterior, con su propia
  issue.

## Decisions

| Decisión                                                    | Racional                                                                                                                                                         | Alternativas consideradas                                                                                             |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **El calendario es dato vendorizado, no código**            | Es la misma tesis de A2: la especificación es pública, legible por máquina y cambia con el calendario de otra persona                                            | Tabla en TypeScript (se desactualiza en silencio)                                                                     |
| **El calendario entra en `packages/sdk/schemas/feriados/`** | El directorio ya es la superficie de datos del SDK y ya tiene manifiesto, hash y job de deriva; el calendario entra por esa puerta y no por una segunda          | Un `src/calendar/datos.ts` (el dato y el código mezclados, sin hash)                                                  |
| **Nominal y observada son dos columnas**                    | El calendario recibido trae las nominales; la regla de traslado (martes/miércoles -> lunes anterior; jueves a domingo -> lunes siguiente) se aplica y se declara | Sólo las observadas (se pierde la trazabilidad legal) - sólo las nominales (el plazo cuenta un día que sí se trabaja) |
| **La regla de traslado se aplica, no se escribe a mano**    | Es una regla; escribir 60 fechas observadas a mano es una oportunidad de error por observación                                                                   | Observadas escritas a mano (imposible de revisar)                                                                     |
| **La zona es explícita en la API**                          | El plazo legal se cuenta en Costa Rica; la zona del servidor no puede cambiar el resultado                                                                       | Usar la zona local (el resultado depende del equipo)                                                                  |
| **Los plazos se pasan como parámetro**                      | El "2 días hábiles" es un dato del reglamento, no una constante del SDK; A8.2 compone el plazo sin duplicar el número                                            | `DIAS_HABILES_PLAZO = 2` exportado por el SDK (el dato de una ley vive en el código)                                  |
| **La fuente externa se declara como tal**                   | El dato disponible viene de un tercero; el SDK no debe presentarlo como la lista que exige el reglamento                                                         | Declararlo "oficial" (sería falso)                                                                                    |
| **Una issue abierta (#105) trackea la fuente oficial**      | Sin la superficie oficial, la garantía del calendario es "procedencia externa"; la issue es el mecanismo para subirla de nivel                                   | Dejarlo así para siempre (la garantía se queda en el nivel más bajo)                                                  |

## Risks / Trade-offs

- **[Riesgo: el calendario no es el oficial]** -> declarado en la procedencia del
  dato y trackeado en la issue #105; mientras tanto, A8.2 no puede presentar el
  calendario como la lista del reglamento, y el plazo se documenta como
  "según el calendario vendorizado".
- **[Riesgo: la regla de traslado se implementa con una fuente sin citar]** -> la
  regla queda en un solo lugar, con su procedencia declarada, y la issue exige
  confirmarla contra la norma; si la norma difiere, el cambio es un commit de
  datos, no de lógica.
- **[Riesgo: los años 2031+ no están cubiertos]** -> el SDK falla explícitamente
  ante una fecha fuera del rango en vez de contarla como día hábil (un plazo
  calculado sobre un calendario inexistente es peor que ningún plazo).
- **[Riesgo: 2026-2030 vence]** -> es la misma deriva que vigila el job de
  `spec-drift`: el calendario entra en la verificación de frescura y el
  desfase se detecta.
- **[Riesgo: sumar días hábiles sobre instantes es fácil de hacer mal]** -> la
  aritmética se hace en días de calendario en la zona (no en milisegundos) y
  las pruebas cubren el cambio de horario de Costa Rica.
