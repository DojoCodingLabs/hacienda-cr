## Why

La situación de un comprobante existe hoy **sólo como dígito de la clave**
(`Situation.NORMAL|CONTINGENCIA|SIN_INTERNET`): cualquiera puede generar un "sin
internet" y no transmitirlo nunca, o transmitir un "normal" tres meses después, y
nadie lo detecta. El Reglamento 44739-H obliga a otra cosa (art. 21): "si no hay
internet, máximo 2 días hábiles después de la generación, indicando situación
'sin internet'; si el enlace de Hacienda está fuera de servicio, se almacenan y
se envían cuando se restablezca" - y el SDK no tiene dónde alojar esa obligación.

Y el pipeline de envío es en memoria: `submitAndWait` firma, envía y polea. Si el
proceso muere entre generar y enviar, el documento no existe y su consecutivo se
gasta. El brief de A8 pide exactamente esto resuelto: "cuando el enlace de
Hacienda está caído, usted almacena y reenvía", con una máquina de estados
explícita y no `if` dispersos.

## What Changes

- **Un outbox durable**: el documento (XML, clave, situación, plazo) se persiste
  **antes** de enviarlo, de forma atómica; el envío se conduce desde el
  outbox, no desde la memoria del proceso. Un documento persistido es un
  documento que se puede retomar.
- **Una máquina de estados explícita de la entrega**: `FIRMADO -> PENDIENTE -> 
ENVIADO -> ACEPTADO|RECHAZADO`, con la rama `ALMACENADO` (el enlace de
  Hacienda está caído) y el estado `VENCIDO` (el plazo legal se pasó: eso es
  una infracción, no un fallo de envío).
- **La situación se fija al generar y es inmutable**: `normal`, `contingencia` y
  `sin internet` se declaran en el documento y no se pueden cambiar después;
  cada una con su obligación y su referencia (la contingencia referencia el
  comprobante provisional).
- **El plazo se evalúa con la aritmética de días hábiles** de A8.1, y el número
  de días es parámetro, no constante.
- **Un fallo ambiguo se consulta antes de reenviar**: se pregunta por la misma
  clave; nunca se reenvía con un consecutivo nuevo (la regla que ya está en el
  `AGENTS.md` raíz, ahora con almacenamiento detrás).
- **El mock gana un interruptor de "enlace caído"**: la rama `ALMACENADO` y el
  reintento se prueban **offline, end to end, sin red**; A7 y A8 se componen.
- **La generación del documento y su persistencia son un solo paso**: el
  documento entra al outbox con su clave ya asignada (A8.3 ata el consecutivo
  a esa misma escritura).

**BREAKING**: ninguno en las APIs existentes (el outbox es superficie nueva); sí
cambia el contrato de `submitAndWait` si se le da la opción de persistir.

## Capabilities

### New Capabilities

- `delivery`: el outbox durable de comprobantes y la máquina de estados de la
  entrega, con las obligaciones por situación y el plazo legal evaluado en días
  hábiles.

### Modified Capabilities

Ninguna.

## Impact

- **Código afectado**: `packages/sdk/src/delivery/**` (nuevo: el almacén, la
  máquina de estados, el plazo), `packages/sdk/src/api/orchestrator.ts` (el envío
  se conduce desde el outbox), `packages/sdk/src/index.ts` (exports).
- **Mock afectado**: `packages/mock/src/server.ts` gana el interruptor de enlace
  caído, para probar la rama `ALMACENADO` sin red.
- **Dependencias**: esta change usa la aritmética de días hábiles de **A8.1**;
  la integridad del consecutivo la aporta **A8.3** (el outbox ya guarda la clave
  que el consecutivo asignó).
- **Riesgo de alcance**: el outbox es la pieza más grande de A8. Si el almacén
  durable resultara inviable, el fallback es una interfaz de persistencia
  inyectable (el SDK define el contrato, la app lo implementa), pero el SDK trae
  su implementación de archivo, con la misma disciplina de lock y rename que el
  store de secuencias.
