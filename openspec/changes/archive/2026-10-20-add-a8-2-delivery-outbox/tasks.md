## 1. El almacén durable

- [x] 1.1 Definir la interfaz del almacén de comprobantes: persistir, listar pendientes, leer, transicionar y consultar el historial.
- [x] 1.2 Implementar el almacén de archivo del SDK: un archivo por documento, escritura atómica (temporal + rename), sin lock global.
- [x] 1.3 Guardar en el documento su XML, su clave, su situación, su fecha de generación, su plazo y su historial de transiciones.
- [x] 1.4 Permitir que el consumidor sustituya el almacén por el suyo mediante la interfaz.
- [x] 1.5 Definir la retención: nada se borra solo; el valor por defecto conserva lo que el reglamento exige (5 años, art. 22).

## 2. La máquina de estados

- [x] 2.1 Declarar la tabla de transiciones: cada estado, de dónde se llega a él y qué operación lo produce.
- [x] 2.2 Implementar la transición como una operación que falla con nombre de transición inválida y estado vigente.
- [x] 2.3 Registrar el historial de transiciones junto al documento.
- [x] 2.4 Implementar la consulta de estado y de pendientes.

## 3. La situación y su obligación

- [x] 3.1 Declarar la situación como dato del documento, fijada al generar e inmutable; fallar si se intenta cambiarla.
- [x] 3.2 Verificar que el dígito de situación de la clave coincide con la situación registrada.
- [x] 3.3 Declarar la obligación por situación: `normal` envío inmediato; `sin internet` plazo en días hábiles sin referencia a provisional; `contingencia` referencia al provisional y plazo desde que la contingencia se superó.
- [x] 3.4 Validar que un documento `sin internet` no referencia un provisional y que uno de `contingencia` sí lo referencia.
- [x] 3.5 Exponer la obligación junto al documento persistido.

## 4. El plazo

- [x] 4.1 Evaluar el plazo con la aritmética de días hábiles de A8.1, con el número de días como parámetro y el default del reglamento.
- [x] 4.2 Marcar `VENCIDO` cuando el plazo se pasó, y exponer en qué día hábil venció.
- [x] 4.3 Probar el plazo con la tabla real: dentro, fuera, y en el borde de un feriado.

## 5. El envío

- [x] 5.1 Conducir el envío desde el almacén: se toma el documento persistido, se envía y se transiciona.
- [x] 5.2 Distinguir enlace caído de rechazo: error de red o 5xx ⇒ `ALMACENADO`; respuesta válida de Hacienda ⇒ `ENVIADO` y luego `ACEPTADO` o `RECHAZADO`.
- [x] 5.3 Ante un envío ambiguo, consultar el estado de la misma clave antes de decidir un reenvío.
- [x] 5.4 Reenviar siempre con la misma clave; el SDK no genera un consecutivo nuevo para resolver una ambigüedad.
- [x] 5.5 Reintentar los documentos `ALMACENADO` cuando el enlace se restablezca, sin cambiar su clave.

## 6. El mock

- [x] 6.1 Añadir al mock un interruptor de enlace caído, con la misma forma de interruptor que los demás casos del mock.
- [x] 6.2 Probar end to end, sin red: documento persistido → enlace caído → `ALMACENADO` → enlace restablecido → `ENVIADO` → `ACEPTADO`.

## 7. Integración

- [x] 7.1 Exportar la API desde el barrel del SDK: el almacén, la máquina de estados y las operaciones de plazo.
- [x] 7.2 Dar a `submitAndWait` la opción de persistir y de reanudar desde el almacén, sin romper su comportamiento actual.
- [x] 7.3 Documentar el modelo de entrega, las obligaciones por situación y el trato del enlace caído en `docs/reference.md`.

## 8. OpenSpec

- [x] 8.1 Verificar que `openspec validate add-a8-2-delivery-outbox` pasa.
- [x] 8.2 Verificar que `openspec validate --specs` no presenta regresiones.

## 9. Puertas

- [x] 9.1 Ejecutar `pnpm verify` y la suite E2E del SDK contra el mock con el interruptor de enlace caído.
