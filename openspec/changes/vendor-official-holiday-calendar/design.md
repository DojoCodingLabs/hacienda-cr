## Context

Ver `proposal.md` — Why. El estado actual que condiciona el diseño:

- `packages/sdk/schemas/feriados/` contiene un PDF y un JSON sólo de 2026. El
  JSON deriva las fechas de `CARTA-MTSS-DAJ-AER-1076-2025` y ya incluye el 31
  de agosto, que la tabla de terceros omitía.
- `calculateObservedDate` es identidad y `observed.spec.ts` afirma "without
  Monday transfers", pero `openspec/specs/business-days/spec.md` exige la regla
  de traslado y pruebas contra traslados. El docstring de la función todavía
  describe la regla vieja.
- `CALENDAR_RANGE` está hardcodeado en `types.ts` y duplica el `yearRange` del
  JSON.
- Las entradas de feriados en `manifest.json` tienen `set: null`. Por eso
  `spec:verify` valida su hash local, pero `spec-watch` no las sondea: su modelo
  de superficies es ATV/OVI/CDN y sus sets son de XSD.
- La fuente rechaza `HEAD` con 403 detrás de Cloudflare; `GET` responde 200. El
  `Last-Modified` del PDF 2026 es octubre de 2026 aunque la carta es de
  diciembre de 2025, así que no sirve como señal de frescura.
- Las cartas se publican a fines de noviembre o principios de diciembre. Hoy
  2027 responde 404 y la ruta sigue siendo válida.

## Goals / Non-Goals

**Goals:**

- Que 2025 y 2026 tengan una fuente oficial, un hash y una transcripción
  revisada, con el mismo gate offline que los XSD.
- Que el contrato del spec describa lo que la ley y las cartas dicen: sin
  traslado obligatorio, con override explícito sólo si una fuente lo enumera.
- Que el año siguiente se detecte por un job reproducible, sin meter red en el
  SDK ni actualizar fechas sin revisión.
- Que el rango tenga una sola fuente de verdad y que fuera de él el fallo sea
  explícito.

**Non-Goals:**

- No se implementa un motor de reglas de traslado ni se codifica la Ley 9875.
- No se hace fetch en runtime ni se resuelven feriados desde la red.
- No se cubre 2024 ni 2027; fuera de 2025–2026 el SDK falla.
- No se pronuncia sobre cierres administrativos de Hacienda ni sobre el
  calendario fiscal: el disclaimer existente se mantiene.
- No se refactoriza `spec-watch` para volverlo genérico; el refresco de
  feriados es un job separado.
- No se modelan obligaciones de pago ("obligatorio" / "no obligatorio"); el SDK
  sólo necesita el día no hábil.

## Decisions

| Decisión                                             | Racional                                                                                                                                                                                        | Alternativas consideradas                                                                                                                                     |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fuente oficial: cartas MTSS 2025 y 2026**          | Son la fuente que la issue pide, existen en un patrón estable y ya probaron que la tabla de terceros estaba mal (31/08/2026)                                                                    | Seguir con `calendariocostarica.com` (sin hash oficial y con datos incorrectos)                                                                               |
| **La fecha observada es dato, no fórmula**           | La Ley 9875 fue un transitorio enumerado 2020–2024, no una regla; el proyecto 23.981 propone un traslado angosto y sigue sin aprobar. Una fórmula inventaría traslados que la fuente no declara | Regla configurable martes/miércoles→lunes anterior y jueves–domingo→lunes siguiente (codifica una regla inexistente)                                          |
| **`observed` se conserva y es override opcional**    | Evita un cambio incompatible; si una ley futura enumera un traslado, se agrega el dato sin tocar la aritmética                                                                                  | Borrar `observed` y volver nominal-only (más chico, pero rompe la API y obliga a reintroducirlo)                                                              |
| **Cobertura 2025–2026**                              | 2025 ya está publicado y permite calcular plazos de documentos de ese año; 2026 es el año vigente. 2027 todavía no existe                                                                       | Sólo 2026 (deja un agujero histórico evitable)                                                                                                                |
| **Un JSON combinado `feriados.json`**                | `HolidaysData` ya modela `dates` por año y `yearRange`; un archivo con ambos años conserva la forma, da un solo origen al rango y hace que el diff anual sea aditivo. El nombre deja de mentir  | Un archivo por año y un loader que los concatene (más código y una `source` por archivo); seguir con `feriados-2026.json` y meter 2025 adentro (nombre falso) |
| **Un solo origen para el rango**                     | `CALENDAR_RANGE` y `yearRange` pueden divergir; el rango debe leerse del JSON y el export se mantiene por compatibilidad                                                                        | Dejar dos constantes y un test que las compare (sigue habiendo dos ediciones)                                                                                 |
| **Job dedicado `scripts/holidays-watch.mjs`**        | `spec-watch` está acoplado a sets y superficies de XSD; forzar feriados ahí agrega un tipo de superficie y toca otro contrato                                                                   | Extender `spec-watch` con una superficie "yearly-pdf" (más machinery y más superficie de fallo)                                                               |
| **Sondeo con control + siguiente, por `GET`**        | Un 404 solo no distingue "no publicado" de "ruta rota"; el control resuelve la ambigüedad. `HEAD` da 403                                                                                        | Sondear sólo el año siguiente y tratar 404 como ruta rota (falso positivo cada año)                                                                           |
| **El job propone, no aplica**                        | Un cambio de fechas fiscales necesita revisión humana; el PDF puede reemitirse con la misma ruta y otro contenido                                                                               | Auto-actualizar el JSON cuando el hash cambia (riesgo fiscal directo)                                                                                         |
| **Manifiesto: `vendored: true`, `set: null`**        | Mantiene la integridad offline sin fingir que los feriados son un set de XSD; el README declara que la frescura remota es el job                                                                | Crear un set ficticio para feriados (rompe la semántica de `currentSet`)                                                                                      |
| **Transcripción con `pdftotext -layout` + revisión** | Es la misma herramienta con la que se verificó el PDF 2026; no agrega dependencia al SDK                                                                                                        | Parsear PDF en CI (dependencia nueva y frágil)                                                                                                                |
| **Cron desde el 15 de noviembre**                    | Las cartas salen a fin de noviembre; sondear en enero es tarde para el año fiscal                                                                                                               | Cron diario todo el año (ruido y 404 esperados)                                                                                                               |

El flujo del job queda así:

```
GET control (2026) ──┐
                     ├─ 404 → ruta cambió → fallar y alertar
GET siguiente (2027) ┘
                     ├─ control 200 + siguiente 404 → aún no publicado → salir 0
                     ├─ control 200 + siguiente 200 → descargar, hash, diff → salir 1
                     └─ control 200 + siguiente 200 + hash igual → sin cambios → salir 0
```

## Risks / Trade-offs

- **[El proyecto 23.981 se convierte en ley y 2027 traslada feriados]** → el
  modelo de overrides ya lo soporta; el job y el runbook obligan a revisar la
  carta 2027 antes de ampliar el rango. No se amplía por inferencia.
- **[MTSS cambia la ruta o el nombre del PDF]** → el control probe falla con un
  mensaje de mantenimiento, no con un "no publicado" silencioso.
- **[El PDF se reemite con las mismas fechas y otro hash]** → `spec:verify`
  falla y obliga a revisar; es el comportamiento deseado, no un falso positivo.
- **[El calendario laboral no es el calendario fiscal]** → se mantiene el
  disclaimer; el cambio no promete cierres administrativos de Hacienda. Es una
  decisión de alcance, no un olvido.
- **[2027 no está publicado y alguien calcula un plazo]** → el SDK falla con un
  mensaje que nombra 2025–2026; el cron avisa cuando la carta aparezca.
- **[El job necesita red y el repo es offline-first]** → el job es de
  mantenimiento y no forma parte de `pnpm verify`; el gate offline sigue igual.
- **[Performance del calendario]** → `isObservedHoliday` reconstruye la lista en
  cada llamada. Con dos años es aceptable; si el rango crece, se indexa. Fuera
  de alcance de este cambio.

## Migration Plan

1. Datos primero: agregar PDF y JSON de 2025, actualizar README y manifiesto;
   `spec:verify` debe pasar con los hashes nuevos.
2. Contrato: actualizar el delta del spec y el README; el código puede seguir
   igual porque `observed = nominal` ya es el comportamiento.
3. Código: derivar el rango del JSON, corregir el docstring y ampliar
   `CALENDAR_RANGE` a 2025–2026.
4. Pruebas: 2025, 2026, años fuera de rango y la tabla real; actualizar
   `observed.spec.ts`.
5. Job: `scripts/holidays-watch.mjs`, entrada en `package.json`, workflow de CI
   y runbook.
6. Changeset: cambio de comportamiento en paquete publicado → minor.

Rollback: revertir el commit de datos y el del rango restaura 2026-only y el
fallo explícito; el spec y el job son independientes y pueden quedarse.
