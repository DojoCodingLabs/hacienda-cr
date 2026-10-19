## 1. Calendario vendorizado

- [ ] 1.1 Crear `packages/sdk/schemas/feriados/` con la tabla 2026–2030 como dato (no como código), su README de procedencia y su manifiesto.
- [ ] 1.2 Declarar en el manifiesto el origen, el rango de años y el hash de los bytes, con la misma forma que el manifiesto de los esquemas.
- [ ] 1.3 Declarar explícitamente que la procedencia actual es externa y no oficial, y cuál es el alcance de la garantía que da ese dato.
- [ ] 1.4 Vincular la issue #105, que trackea la vendorización desde la superficie oficial y la confirmación de la regla de traslado, y dejar el calendario externo declarado como externos mientras no cierre.

## 2. La fecha observada

- [ ] 2.1 Implementar la regla de traslado de feriados a la fecha observada en un solo lugar: martes o miércoles al lunes anterior, jueves a domingo al lunes siguiente, lunes se queda.
- [ ] 2.2 Derivar la fecha observada de la nominal; no escribirla a mano en la tabla.
- [ ] 2.3 Probar los siete casos de la regla (lunes, martes, miércoles, jueves, viernes, sábado y domingo) contra fechas con día de la semana conocido.

## 3. La aritmética de días hábiles

- [ ] 3.1 Implementar `isBusinessDay` sobre días de calendario en `America/Costa_Rica`: lunes a viernes y no feriado observado.
- [ ] 3.2 Implementar `addBusinessDays`, que salta días no hábiles y feriados observados.
- [ ] 3.3 Implementar `businessDaysBetween`, con el extremo inicial incluido y el final excluido, y cero cuando ambos caen el mismo día hábil.
- [ ] 3.4 Implementar la consulta de plazo: si venció a la fecha de referencia, y en qué día hábil venció, con el número de días hábiles recibido como parámetro.
- [ ] 3.5 Rechazar explícitamente las fechas fuera del rango cubierto por la tabla, en vez de contarlas como día hábil.

## 4. Zona y bordes

- [ ] 4.1 Calcular sobre días de calendario de la zona, no sobre milisegundos: el resultado no puede depender de la zona de la máquina.
- [ ] 4.2 Probar el resultado a ambos lados del cambio de horario de Costa Rica.

## 5. Verificación contra la tabla real

- [ ] 5.1 Probar la aritmética con las fechas de la tabla vendorizada: la Semana Santa, el feriado que la tabla declara sólo para 2030, y los traslados a lunes.
- [ ] 5.2 Probar el vencimiento y el no vencimiento de un plazo en fechas conocidas.

## 6. Integración

- [ ] 6.1 Exportar la API desde el barrel del SDK con su tipo de opciones.
- [ ] 6.2 Conectar el calendario a la verificación de frescura (`pnpm spec:verify`) y al job de deriva, para que un cambio en la tabla se detecte como deriva.
- [ ] 6.3 Documentar la API y la procedencia del calendario en `docs/reference.md`.

## 7. OpenSpec

- [ ] 7.1 Verificar que `openspec validate add-a8-1-business-days` pasa.
- [ ] 7.2 Verificar que `openspec validate --specs` no presenta regresiones.

## 8. Puertas

- [ ] 8.1 Ejecutar `pnpm verify` y documentar el alcance de años que cubre la tabla.
