## 1. Vendorizar los datos oficiales

- [x] 1.1 Descargar `https://www.mtss.go.cr/temas-laborales/feriados/feriados_calendario_2025.pdf` y verificar que sea `OFP-MTSS-DAJ-AER-956-2024`, del 22 de noviembre de 2024, con los 12 feriados de la tabla.
- [x] 1.2 Renombrar `packages/sdk/schemas/feriados/feriados-2026.json` a `feriados.json`; agregar las fechas de 2025 a cada entrada, fijar `yearRange` en `[2025, 2026]` y actualizar `description`/`source` para declarar ambas cartas y el patrón de URL.
- [x] 1.3 Copiar el PDF de 2025 a `packages/sdk/schemas/feriados/feriados-calendario-2025.pdf` y actualizar `packages/sdk/schemas/feriados/README.md` con las dos cartas, sus fechas, la vigencia vencida de la Ley 9875, la ausencia de traslados en 2025–2026 y el estado del proyecto 23.981.
- [x] 1.4 Actualizar `packages/sdk/schemas/manifest.json`: renombrar la entrada del JSON, agregar el PDF de 2025, recalcular `sha256` y `bytes` y mantener `set: null` y `vendored: true`.
- [x] 1.5 Ejecutar `pnpm spec:verify` y confirmar que los hashes nuevos pasan y que el árbol no tiene archivos no declarados.

## 2. Contrato y documentación

- [x] 2.1 Revisar que el delta `specs/business-days/spec.md` cubra los cuatro cambios de contrato: procedencia/frescura, observada sin fórmula, pruebas contra la tabla real y fallo explícito fuera de rango.
- [x] 2.2 Crear `docs/holidays-refresh.md` con el runbook: cuándo sondear, cómo leer el resultado del job, cómo revisar el diff, cómo actualizar JSON/manifiesto/rango/pruebas y qué hacer si la ruta cambió.
- [x] 2.3 Actualizar el README de feriados y el runbook para distinguir explícitamente `spec:verify` (integridad local) de `holidays:watch` (frescura remota).

## 3. Código del calendario

- [x] 3.1 Cambiar el import de `holidays.ts` a `feriados.json` y derivar `getCalendarRange()` del `yearRange` del JSON, sin otra constante.
- [x] 3.2 Reemplazar `CALENDAR_RANGE` hardcodeado en `types.ts` por un valor derivado del JSON (importar el JSON directamente para no crear un ciclo con `holidays.ts`), manteniendo el export público por compatibilidad.
- [x] 3.3 Agregar `observed?: Record<string, string>` a `HolidayEntry` y hacer que `calculateObservedDate` acepte un override opcional: si existe, lo devuelve; si no, devuelve la nominal.
- [x] 3.4 Corregir el docstring de `calculateObservedDate` para que describa la regla real (nominal por defecto, override sólo si la fuente lo enumera) y eliminar la referencia a la regla vencida.
- [x] 3.5 Actualizar `getObservedHolidaysForYear` para usar el override del año cuando exista y la nominal cuando no.

## 4. Pruebas

- [x] 4.1 Actualizar `packages/sdk/src/calendar/observed.spec.ts` para 2025–2026: el 15/09/2026 y el 25/12/2026 se observan su propio día; el 14/09/2026 y el 28/12/2026 son hábiles.
- [x] 4.2 Agregar la Semana Santa de 2025 (17 y 18 de abril) y la de 2026 (2 y 3 de abril) como días no hábiles.
- [x] 4.3 Agregar pruebas de fallo explícito para `2024-12-31` y `2027-01-01`, verificando que el mensaje nombre la cobertura 2025–2026.
- [x] 4.4 Agregar una prueba que compare `CALENDAR_RANGE` con el `yearRange` del JSON vendorizado.
- [x] 4.5 Agregar una prueba de tabla dorada que compare las 24 fechas nominales (12 por año) contra el JSON, para detectar una transcripción incompleta.
- [x] 4.6 Agregar una prueba unitaria de `calculateObservedDate` con y sin override, sin depender de un año real.
- [x] 4.7 Ejecutar las pruebas del SDK (`pnpm --filter @hacienda-cr/sdk test`) y confirmar que no queda ninguna aserción que exija traslados.

## 5. Job de refresco

- [x] 5.1 Crear `scripts/holidays-watch.mjs` con el protocolo control + siguiente: `GET` (nunca `HEAD`), control 200 y siguiente 404 → "aún no publicado"; control 404 → "ruta cambiada"; siguiente 200 → descargar, calcular hash y emitir el diff.
- [x] 5.2 Hacer que el job acepte `--year` y `--control-year`, use un timeout acotado, no siga redirecciones a hosts ajenos y no escriba el JSON ni el manifiesto.
- [x] 5.3 Agregar `scripts/holidays-watch.test.mjs` con `fetch` simulado para los tres resultados y para el caso "hash igual, sin cambios".
- [x] 5.4 Agregar `"holidays:watch": "node scripts/holidays-watch.mjs"` a `package.json` y verificar que `pnpm holidays:watch` corre sin red en las pruebas.
- [x] 5.5 Agregar un workflow de CI con cron semanal desde el 15 de noviembre hasta el 15 de enero, que ejecute el job y falle cuando corresponda alertar.
- [x] 5.6 Verificar que el job no se ejecuta desde el SDK ni desde `pnpm verify`, y que el gate offline sigue igual.

## 6. Verificación y entrega

- [x] 6.1 Ejecutar `pnpm spec:verify`, `pnpm --filter @hacienda-cr/sdk test` y `pnpm --filter @hacienda-cr/sdk lint`.
- [x] 6.2 Ejecutar `pnpm verify` completo y confirmar que el calendario nuevo no rompe build, tipos ni consumidores empaquetados.
- [x] 6.3 Agregar un changeset minor para el SDK por la ampliación de cobertura 2025–2026 y el cambio de contrato documentado.
- [x] 6.4 Formatear sólo los archivos tocados y revisar `git status` para no arrastrar cambios ajenos.
- [x] 6.5 Comentar en la issue #105 el hallazgo de la Ley 9875 (transitorio vencido) y cerrar la issue. Comentario publicado: https://github.com/DojoCodingLabs/hacienda-cr/issues/105#issuecomment-6387003052 — issue cerrada el 2026-10-26; el merge del PR #121 queda como seguimiento separado del PR.
