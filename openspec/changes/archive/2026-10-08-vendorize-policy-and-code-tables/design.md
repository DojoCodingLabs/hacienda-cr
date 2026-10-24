## Context

`packages/sdk/schemas/` ya contiene versionados los 18 XSD (`2024/v4.4/`, `2026/v4.4/` — verificado con `git ls-files`: 20 rutas = 18 XSD + `xmldsig-core-schema.xsd` + `README.md`; ambos sets tienen 9 archivos, ninguno vacío; verificado además que los 18 XSD son byte a byte idénticos a los respaldos de `/tmp/opencode/spec-baseline/{atv-2024,ovi-2026}/`, descargados hoy 2026-10-08 09:23), `xmldsig-core-schema.xsd` y un `README.md` de procedencia básico. No hay `manifest.json`, ni el PDF de Anexos, ni los documentos auxiliares, ni el PDF de la política; el directorio `2016/` contiene solo `v4.1/` vacío: sobró de una vendorización previa de la DGT-R-48-2016 que la decisión 11 ya no incluye. **No está versionado** — quitarlo no cambia ni el commit ni el diff; el marco sigue siendo la decisión 11 revisada, pero en repositorio es simplemente limpieza de un directorio no rastreado. El INDENT es la fuente de decisiones (3 → decisiones 4, 9, 13, 15, 16; 4.1 → vigencia de la revisión 2026; 5.1–5.2 → layout y contenido del manifiesto; 5.7 → política; 9 → riesgos; 11.9–11.11 → preguntas abiertas). La herramienta `spec:verify` de un cambio previo no está en este checkout y queda fuera de alcance (ver propuesta).

## Goals / Non-Goals

**Goals:**

- Los cuatro documentos faltantes vendorizados en el layout del INDENT 5.1, sin duplicados en el repo.
- `manifest.json` completo según 5.2 (superficies, sets, vigencia, hashes, bloque de política) con formato estable.
- README actualizado: procedencia + supuestos marcados como no verificados.

**Non-Goals:**

- Corregir `XADES_POLICY_HASH`/`XADES_POLICY_URI` en `shared/` (fase 3 con Changeset y sandbox autorizada).
- Restaurar `spec:verify` / `spec:check` / `spec:update` / job mensual (cambio aparte).
- `codes.json`, tablas del Reglamento, forma farmacéutica, catálogo CABYS.
- Vendorizar la Resolución DGT-R-48-2016 (ya no es la política vigente; decisión 11 no la incluye en la decisión 9).
- Entradas `vendored: false` para los archivos no vendorizados de la superficie (`.doc`, Reglamento, HTML de la API, `.xlsx`): llegan con el cambio de `spec:check`, que es quien las consume (D9).

## Decisions

**D1 — Ubicación de los cuatro documentos: `2024/v4.4/`.**
El árbol del INDENT 5.1 los coloca ahí (ANEXOS junto con los auxiliares de la misma versión base y el PDF de la política como "input del digest"). Alternativa descartada: una carpeta `policy/` aparte — rompe la uniformidad `<año>/<versión>/` de la decisión 4 y la referencia explícita de 5.1.

**D2 — Identifier verbatim del Anexo 2 vs. URL servida; nombre local canónico (ASCII exacto).**
Verificado contra la fuente primaria (extraído con `pdftotext` del `ANEXOS Y ESTRUCTURAS_V4.4.pdf`, 2026-10-08): el `xades:Identifier` del Anexo 2 es `https://cdn.comprobanteselectronicos.go.cr/xmlschemas/Resoluci%C3%B3n_General_sobre_disposiciones_t%C3%A9cnicas_comprobantes_electr%C3%B3nicos_para_efectos_tributarios.pdf` — la errata real es **`xmlschemas` sin guion** (esa URL responde 403 hoy); no existe `t%C3%A9ncinas` en el PDF (5 ocurrencias, todas `t%C3%A9cnicas`). El INDENT 5.7 transcribió mal tanto la errata (`t%C3%A9ncinas`, inexistente) como el digest (`DWxin1xWOel8…h0h8`, 43 chars sin `=` — el Anexo 2 dice `DWxin1xWOeI8OuWQXazh4VjLWAaCLAA954em7DMh0h8=`, 4 ocurrencias, que coincide con el SHA-256 de la descarga del 2026-10-08). En el manifiesto, `policy.identifier` se guarda **verbatim** como lo publica el Anexo 2 (es el valor que un verificador XAdES reconstituye). Para descargar: la URL literal del Identifier (`/xmlschemas/`) da 403, así que se usa la servida en `/xml-schemas/` con ortografía corregida (200); se registra cuál resolvió. El nombre local usa **la forma ASCII exacta de la decisión 9** — `Resolucion_General_sobre_disposiciones_tecnicas_comprobantes_electronicos_para_efectos_tributarios.pdf`: sin tilde, sin errata, portable en cualquier sistema de archivos (los nombres publicados por ATV sí traen tildes y espacios — `Resolución_General_...`, `ANEXOS Y ESTRUCTURAS_V4.4.pdf` — que solo se manejan al codificar la URL de descarga). Alternativa descartada: propagar la errata al nombre del archivo — un identificador local con un error tipográfico viaja para siempre en rutas y referencias. Alternativa descartada: nombre local NFC con tilde — menos portable sin ganar fidelidad (la fidelidad vive en `policy.identifier`, no en la ruta local).

**D3 — Hash en hexadecimal en el manifiesto, Base64 solo en el bloque de política.**
Todas las entradas `files[].sha256` usan 64 hex (columna única, comparación directa con `sha256sum`). El digest del Anexo 2 se publica en Base64 sobre SHA-256; el manifiesto lo guarda tal cual en el bloque `policy` y la vendorización verifica una sola vez que ambas codificaciones describen los mismos bytes (decodificar Base64 → comparar con el hex). Alternativa descartada: guardar todo en Base64 — obligaría a reformatear todas las entradas y a un formato heterogéneo.

**D4 — Estructura del manifiesto: un campo `policy` nuevo.**
Claves de primer nivel en orden fijo: `schemaVersion` (1), `lastSyncedAt`, `currentSet`, `nextSet` (opcional), `surfaces[]`, `sets[]`, `policy`, `files[]`. `policy` concentra `identifier`, `digestMethod`, `digestValue`, `citation`, `sourceSurface` y `sdkStatus`. Alternativa descartada: meter el digest dentro de la entrada del PDF — la política es un hecho del conjunto (identificador + algoritmo + fuente), no una propiedad del archivo. Las fechas (`lastSyncedAt`, `downloadedAt`) se definen en D10. `nextSet` es opcional: **la clave se omite** cuando no hay un próximo set con fecha (nunca `null`); tras el 2026-11-01 se elimina la clave, `currentSet` pasa a `2026/v4.4` y **`2024/v4.4` permanece en `sets[]`** — los sets vendorizados no se retiran del manifiesto (el layout histórico de la decisión 4 sigue en disco); solo cambia el puntero de vigencia. `sdkStatus` documenta que el bloque `policy` describe lo que la especificación exige mientras `shared/` aún declara otro valor (sin él, un lector asumiría que el SDK ya usa la política correcta); no es texto libre: valores conocidos `pending-sdk-migration` y `aligned`; cualquier valor nuevo exige actualizar el README (semántica en D10 y README).

**D5 — Sets declarados: solo los que tienen archivos; `currentSet` = en vigor hoy, no último publicado.**
`sets` = `2024/v4.4` (base, ATV) y `2026/v4.4` (revisión, OVi) — ambos verificados con 9 XSD en disco (tarea 2.3). **`currentSet: "2024/v4.4"`**: el INDENT 4.1 dice que la revisión de abril 2026 es "obligatoria desde el 2026-11-01", de modo que hoy (2026-10-08) el set en vigor es la base 2024. La revisión publicada se registra como `nextSet: { "id": "2026/v4.4", "effectiveFrom": "2026-11-01" }` hasta esa fecha (decisión 15, "coexisten hasta el 2026-11-01"). Semántica escrita en README: `currentSet` = **vigente** (en vigor), `nextSet` = publicado pero aún no obligatorio; sin esta distinción, una generación de `codes.json` saldría de los XSD que _van_ a regir, no de los que rigen hoy. Alternativa descartada: renombrar el campo a `latestPublishedSet` — rompe el vocabulario de la decisión 15; alternativa descartada: `currentSet: "2026/v4.4"` — apunta al set que aún no rige. No se declara `2016/v4.1`: no llevará ningún archivo vendorizado (la DGT-R-48-2016 queda fuera, decisión 11) y un set vacío en el manifiesto sería engañoso. El directorio `2016/` (con su `v4.1/` vacío) se elimina: limpieza de un directorio no rastreado que sobró de la vendorización previa de la DGT-R (la decisión 11 la excluye); no aparece en el diff porque nunca estuvo en git. `xmldsig-core-schema.xsd` queda en `files[]` con `set: null`.

**D6 — Orden de descubrimiento de los auxiliares y freno por formato (preguntas 9–10).**
Los auxiliares no aparecían en la observación previa de la página ATV con sus nombres exactos, aunque el INDENT 11.9 registra que esa lista menciona "PDF de monedas" y ".rar de ubicaciones". Orden de búsqueda: página ATV → `cdn.comprobanteselectronicos.go.cr/xml-schemas/` → listado OVi. El descubrimiento se hace sobre los **href**, no sobre el texto del enlace (4.1: los títulos son inconsistentes — un `.rar` se titula como zip). Si el formato publicado difiere del pedido (p. ej. `.rar` en vez de `.csv`), o si solo existe comprimido, se **detiene** y se consulta antes de vendorizar: el nombre del artefacto es un requisito del INDENT 4.3/9, no un detalle de implementación. **Resuelto 2026-10-08:** ambos auxiliares están en ATV (`docs/esquemas/2024/v4.4/`); `Codigodemoneda_V4.4.pdf` es PDF como la decisión 9, y `Codificacionubicacion_V4.4` solo existe como `.rar` que contiene `Codificacionubicacion_V4.4.xlsx` (314 939 B, 2024-11-20) — el CSV de la nota 14 no está publicado en ninguna superficie (404/403/404). Decisión del usuario en revisión: **vendorizar el `.rar` completo** (bytes originales de la fuente; no se extrae ni se convierte). La superficie que resulte exitosa se anota en `surfaces[]` con su `sourceSurface`.

**D7 — Manifiesto escrito a mano, formato garantizado por el formateador.**
No se restaura el serializador del cambio previo (fuera de alcance). Se autorea el JSON con el orden de claves fijo de D4 y se pasa `prettier --write`; la verificación de hashes se hace generando un check file desde el manifiesto y corriendo `sha256sum -c` (formato `hash  ruta` — maneja nombres con espacios como `ANEXOS Y ESTRUCTURAS_V4.4.pdf`; no parsear la salida de `sha256sum` con `awk '{print $2}'`: el separador es doble espacio y los nombres lo contienen), más `stat` para `bytes`. Trade-off aceptado: hasta que exista de nuevo un verificador en el build, la completitud del manifiesto depende de la revisión del PR (riesgo abajo).

**D8 — Un solo commit para archivos + manifiesto + README.**
La regla "mismo commit" (5.2) se cumple preparando un único commit con los cuatro documentos, `manifest.json` y el `README.md`. El commit lo ejecuta quien solicite el trabajo (AGENTS.md: no commitear sin petición explícita).

**D9 — `files[]` en este cambio solo contiene entradas `vendored: true`.**
La decisión 9 dice que los demás archivos de la versión "solo se hashean", y la sección 5.2 prevé `vendored: false` para ellos (`.doc`, Reglamento, HTML de la API, `.xlsx` de forma farmacéutica). Aquí **no se declaran**: hashes de archivos que nadie todavía compara solo producen un baseline que `spec:check` tendrá que rehacer (cualquier reemplazo in-place lo invalida), y obligarían a descargar ~15 archivos solo para guardarlos. Entran con el cambio de `spec:check`, que es quien los consume. Declarado en Non-Goals y en la propuesta para que la ausencia no se lea como omisión.

**D10 — Fechas: `downloadedAt` = descarga verificada; `lastSyncedAt` con fallback temporal.**
`sets[].downloadedAt` — el "fecha de descarga" por set que pide el INDENT 5.2 (el identificador `downloadedAt` es el nuestro) = **fecha de la última descarga del set desde su superficie cuyos bytes se confirmaron idénticos a los vendorizados**. No es semántica de "último toque": una descarga que verifica sin cambiar nada también la actualiza; el job puede reportar "última descarga verificada: Y" con precisión, y una actualización real moverá la fecha por definición. Quién la actualiza: **`spec:check` no escribe el manifiesto y por tanto no actualiza `downloadedAt`**; solo `spec:update` lo hace, aunque el contenido del set no cambie — verificar no es sincronizar. Valores iniciales: ambos sets `2026-10-08` — los respaldos de `/tmp/opencode/spec-baseline/{atv-2024,ovi-2026}/` se descargaron hoy 09:23 desde la fuente y se verificó byte a byte contra los 18 XSD del repo (tarea 2.4); si 2.4 encuentra una diferencia, no se escribe la fecha: se detiene primero. Alternativa descartada: renombrar a `lastVerifiedAt` — se sale del vocabulario "fecha de descarga" del INDENT 5.2 sin ganar algo (la descarga de hoy ocurrió de verdad); alternativa descartada: derivar la fecha de `git log` — fecha de commit ≠ fecha de descarga. `lastSyncedAt` (primer nivel, INDENT "fecha de la última sincronización") = **última regeneración y verificación del manifiesto contra las superficies y los bytes en disco**. Mientras `spec:check`/`spec:update` no existan, el README lo documenta como "fecha de escritura manual" y advierte que la semántica pasará a "última ejecución del job" cuando el job exista (hoy ambas lecturas dan `2026-10-08`). Una sola definición por campo; el README refleja cuál está vigente.

**D11 — Orden de `files[]`: lexicográfico global por `path`.**
Las entradas se ordenan por `path` ascendente: determinista, sin campo de orden nuevo, los prefijos `2024/v4.4/` y `2026/v4.4/` agrupan sus sets solos y `xmldsig-core-schema.xsd` queda al final. Alternativa descartada: agrupar por set y luego por path — produce el mismo orden hoy a costa de una regla más compleja; ordenar como se descargó — no es estable ante reordenaciones del checklist.

**D12 — Vocabulario de superficies.**
Tres superficies (decisión 13), cada una una entrada de `surfaces[]` con campos `id`, `url` y `type`:

| `id`  | `type`            | `url`                                                                                                             |
| ----- | ----------------- | ----------------------------------------------------------------------------------------------------------------- |
| `atv` | `atv-page`        | `https://atv.hacienda.go.cr/ATV/ComprobanteElectronico/frmAnexosyEstructuras.aspx`                                |
| `ovi` | `ovi-list`        | `https://www.hacienda.go.cr/docs/` (enlazada desde `https://ovitribucr.hacienda.go.cr/comprobantes-electronicos`) |
| `cdn` | `cdn-xml-schemas` | `https://cdn.comprobanteselectronicos.go.cr/xml-schemas/`                                                         |

La página ATV y el listado OVi son superficies **distintas** (dos URLs, dos superficies), no una con dos URLs. `sets[].sourceSurface` y `policy.sourceSurface` son **claves** que apuntan al `id` de `surfaces[]` (no URLs sueltas); toda referencia a una superficie que no exista en la lista es un error del manifiesto (se valida en el requisito del spec «El manifiesto declara las superficies oficiales consultadas»). Vocabulario cerrado: un valor nuevo de `id` o `type` exige actualizar esta tabla, el spec y el README.

## Risks / Trade-offs

- [Los auxiliares no están en ninguna superficie alcanzable, o en formato distinto] → orden D6 con freno explícito; el trabajo se detiene con un informe de qué se buscó y dónde, en vez de vendorizar un sustituto.
- [El PDF de la política publicado no coincide con `DWxin1xWOeI8…`] → escenario del spec: no avanza; se registran ambos valores. Nunca se acepta el archivo "porque sí".
- [Redistribución restringida o superficies inaccesibles desde CI] → supuestos 7/8/11 marcados como no verificados en README; ninguna dependencia de build/CI sobre esas superficies (solo descargas manuales).
- [El manifiesto se desincroniza sin verificador en el build] → tareas de recálculo de hashes al cierre + el cambio de `spec:verify` (posterior) cierra el ciclo; aquí la red de seguridad es la revisión del PR.
- [Hacienda reemplazó un archivo in-place desde la última observación] → los bytes descargados son la autoridad; si el respaldo local de `/tmp` difiere de la descarga fresca, se registra la diferencia (decisión 14) y gana la descarga.
- [La revisión de abril 2026 de la v4.4 usa otra política] → fuera de alcance aquí; el bloque `policy` queda citado al Anexo 2 vendorizado, que es el de la base 2024. Se deja registrado en preguntas abiertas.

## Migration Plan

Cambio aditivo: archivos nuevos + `manifest.json` + README. Rollback = `git revert` del commit. Sin despliegue, sin cambios de API, sin Changeset.

## Open Questions

- Superficie exacta y formato real de `Codigodemoneda_V4.4` / `Codificacionubicacion_V4.4` (resuelto en D6/2026-10-08: ATV, PDF y `.rar`-con-`.xlsx`; se vendoriza el `.rar` completo).
- Si la revisión de abril 2026 publicó un Anexo 2 con política distinta (no bloquea esta tarea: el spec se ancla al Anexo 2 vendorizado de la base 2024; verificar cuando se aborde esa revisión).
- Quién/qué mueve `currentSet` a `2026/v4.4` después del 2026-11-01 — `nextSet.effectiveFrom` deja la fecha declarada, pero el flip sigue manual hoy (pertenece al flujo de `codes.json`/`spec:update`, futuro).
