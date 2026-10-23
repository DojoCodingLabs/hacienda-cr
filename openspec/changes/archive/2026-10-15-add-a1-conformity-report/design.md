## Context

Ver `proposal.md` (Why). Contexto necesario para las decisiones:

- El repo actual (rama `feat/verify-signing-policy-digest`, `597a556`) ya contiene la
  vendorización (`packages/sdk/schemas/` con sets `2024/v4.4` vigente y `2026/v4.4`
  revisión abril, `manifest.json`), `codes.json` (52 tablas / 8 288 valores) y el código
  generado en `shared/src/generated/`. La lectura de fuentes primarias, por tanto, ya no
  es previa al código.
- La rama remota más reciente **sin** vendorización es `origin/release/v0.4.1` (`a0c6b67`,
  2026-10-05), equivalente en contenido a `main` pre-vendorización salvo contadores de
  descargas de npm. Ese estado sí tiene los XSD de `2024/v4.4/` y `2026/v4.4/` (se
  vendorizaron antes que los PDF), pero **no** el PDF de Anexos, el PDF de códigos de
  moneda, el `.rar` de ubicación, la Resolución General, `manifest.json` ni `codes.json`.
- `docs/specs/v4.4-compliance.md` (auditoría previa, 2026-08-24) existe también en ese
  baseline, así que la cuarentena debe ser operativa, no estructural.
- `pdftotext` y `xmllint` están disponibles en la máquina de trabajo.

## Goals / Non-Goals

**Goals:**

- Un informe que cualquiera pueda auditar sin repetir la lectura: procedencia exacta,
  cita reproducible por fila, veredicto con vocabulario cerrado.
- Que la primera pasada sea genuinamente independiente de las lecturas previas del equipo
  (auditoría e INDENT) y de la maquinaria posterior (`codes.json`, catálogos generados).
- Que el resultado se reconcilie con la auditoría previa y con el estado actual del repo,
  de modo que A2 reciba una lista de hallazgos accionable.

**Non-Goals:**

- Corregir tablas, añadir scripts, candados de CI o cambios de comportamiento (eso es A2).
- Automatizar la extracción o el informe: automatizarlo lo colapsa en A2 y elimina la
  segunda lectura independiente que el brief quiere como evidencia.
- Verificar la estructura del documento (nodos, orden, campos) — territorio de la
  auditoría previa y de A4, no de A1.

## Decisions

**D1 — El código auditado es un checkout baseline fuera del repo, en
`../hacienda-cr-a1-baseline`, clonado localmente y con HEAD en `a0c6b67`
(`origin/release/v0.4.1`).**
La auditoría se hace sobre el SDK tal como estaba antes de cualquier fase del INDENT:
catálogos escritos a mano en `shared/src/constants/*.ts`,
`packages/sdk/src/api/error-codes.ts` y el catálogo de la clave numérica. Alternativas:
(a) auditar la rama actual — descartada: `codes.json` y los catálogos generados serían la
respuesta antes de la pregunta; (b) `git worktree` del repo actual — descartada por
comodidad de contexto, no por tecnología: un clon local del repo completo pesa 8 MB y
aisla de verdad el checkout (sin metadatos compartidos ni riesgo de tocar el repo madre).
_Nota verificada_: los XSD del baseline y de la rama actual son byte a byte idénticos, así
que el baseline puede leer los XSD desde su propio árbol.

**D2 — Las fuentes primarias se copian a `codigo/INDENTS/fuentes-primarias/`, fuera de
ambos repos, con un `README.md` de procedencia (origen, commit, SHA-256 por archivo).**
El PDF de Anexos, el PDF de moneda, el `.rar` de ubicación y la Resolución General no
están en el baseline; la copia evita abrir el repo modificado para leer la fuente. Se
incluye también `manifest.json` del repo actual como archivo de procedencia (superficies
oficiales y hashes declarados), y los XSD de ambos sets. Alternativa: leer los PDF desde
`packages/sdk/schemas/` del repo actual — descartada: la auditoría debe poder leerse y
reproducirse sin abrir el árbol que contiene el código que se contrasta después.

**D3 — Cuarentena explícita y declarada en el informe.**
Primera pasada solo con fuentes primarias + código baseline; `docs/specs/v4.4-compliance.md`
y el INDENT se abren después, y el informe dice cuándo. La cuarentena es un compromiso de
proceso registrado, no una barrera técnica: el valor es que la reconciliación posterior sea
comparable, no que se finja ignorancia.

**D4 — El informe se redacta con el baseline a la vista y se entrega como
`docs/conformity-report.md` en la rama actual.**
El deliverable del brief es "un informe en markdown en el repo". El baseline es el lugar
donde se produce la lectura; el repo actual es donde vive el artefacto. No se commitea nada
en el baseline ni en `origin/release/v0.4.1`.

**D5 — Formato de la tabla de resultados: una fila por tabla del SDK con columnas
Tabla/Export · Set · Fuente primaria (cita) · Veredicto · Hallazgos; diff inline en bloques
de código cuando el veredicto no es "coincide".**
El inventario completo se declara antes de la tabla, para que la cobertura sea verificable
fila por fila. Códigos comparados byte a byte (sin normalización Unicode, sin trim); las
descripciones se comparan con trim y colapso de espacios, y las diferencias de mayúsculas
son advertencia. Cuando una tabla exista en ambos sets (XSD 2024 base y revisión 2026),
la fila declara ambos veredictos: la revisión de abril cambia valores que hoy el SDK
publica a mano.

**D6 — La reconciliación tiene dos anclas: la auditoría previa
(`docs/specs/v4.4-compliance.md`) y el estado actual del repo.**
Por cada hallazgo se indica si el trabajo de las fases 1a–3 ya lo cubrió (catálogo
generado, pareja declarada en `table-map.mjs`, hueco documentado) o si sigue abierto.
Así A1 entrega a A2 una lista accionable sin contaminar la primera pasada.

**D7 — Idioma español.**
La audiencia del informe es el equipo de la práctica (demo de viernes en español); los
`docs/` del repo están en inglés, pero este artefacto es un entregable de la práctica, no
documentación de mantenimiento del SDK. Se enlaza desde el mapa de documentación en
`AGENTS.md`.

## Risks / Trade-offs

- **[Independencia comprometida si se lee la auditoría antes]** → cuarentena declarada
  (D3) y tareas ordenadas con la reconciliación al final.
- **[Falso veredicto por mezclar sets]** → cada fila declara el set; las tablas presentes
  en 2024 y 2026 se juzgan por separado (D5).
- **[Lectura ruidosa del PDF con `pdftotext -layout`]** → citas de nota + página, y cada
  cita se reproduce con `pdftotext -f <página> -l <página>` antes de cerrar la fila.
- **[El informe envejece en cuanto Hacienda publique cambios]** → es un entregable fechado,
  no un gate vivo; se anota fecha de corte y A2 pone los candados que lo mantendrán
  honesto. El drift real lo cubre `spec:check` y el job mensual, ya existentes.
- **[El baseline no tiene dependencias instaladas]** → la auditoría es de lectura de código
  y fuentes; correr la suite en el baseline es opcional (`pnpm install --frozen-lockfile`)
  y no condiciona el informe.

## Migration Plan

Sin despliegue ni rollback: es un artefacto documental. El PR agrega
`docs/conformity-report.md` y su enlace en `AGENTS.md`; revertir el PR retira el informe
sin efectos sobre paquetes publicados. Los directorios de trabajo fuera del repo
(`hacienda-cr-a1-baseline/`, `INDENTS/fuentes-primarias/`) no se commitean ni se
publican; quedan documentados para reproducibilidad.

## Open Questions

- Si el tutor entrega una auditoría distinta de `docs/specs/v4.4-compliance.md`, la sección
  de reconciliación se amplía para incluirla sin tocar la primera pasada.
- Confirmar con el tutor si el inventario debe incluir también las tablas que el SDK
  acepta como entrada pero no emite (p. ej. catálogo CABYS, fuera del repo por ser fuente
  externa del BCCR). Por defecto quedan en "fuera de alcance", declaradas en su fila.
