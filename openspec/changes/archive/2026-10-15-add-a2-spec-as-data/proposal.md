# Proposal: add-a2-spec-as-data

## Why

A2 (Ruta A, línea A2 del brief — «La especificación como datos», diseñada en el
INDENT `INDENT_Actualizacion_Facturacion.md`) tiene su fase 2 y 3 desarrolladas
pero **sin landear**: el stack de PRs `#53` (auxiliares → `codes.json`) → `#54`
(generación de catálogos) → `#55` (digest de la política en `spec:verify`) está
en draft, y su implementación descansa sobre specs ya archivados
(`codes-extraction`, `codes-generation`, `spec-integrity`). Además la fase 2
quedó incompleta en el punto que más duele: las tablas escritas a mano siguen
a mano con los valores que el informe A1 (`docs/conformity-report.md`) marcó
como «no coincide», de modo que hoy el SDK **se contradice a sí mismo**
(`codes.json` ya contiene el catálogo oficial de 10 tipos de comprobante;
`shared/src/constants/document-types.ts` declara 9 desplazados) y la política
de firma publicada sigue siendo la Resolución vieja con SHA-1 pese a que el
manifiesto y `spec:verify` ya exigen la Resolución General vigente con
SHA-256. Sin cerrar este tramo —del XSD vendorizado al código publicado—, la
promesa del INDENT («ningún cambio de la especificación pasa en silencio»)
no cubre su último eslabón y los paquetes publicados siguen emitiendo
catálogos que contradicen la fuente primaria citada.

## What Changes

- **Landear el stack en orden** `#53` → `#54` → `#55` (rebase y CI verde en
  cada eslabón), cerrando la implementación de los specs ya archivados de
  fases 2 y 3.
- **Correcciones de catálogo P0/P1 del informe A1**, con cita de fuente
  primaria y Changeset (BREAKING para el paquete publicado):
  - `DocumentTypeCode` → catálogo oficial de 10 tipos (ANEXOS V4.4, p. 65
    inciso c; `Nota3/TipoComprobanteDocumentoAsociado` ya extraído en
    `codes.json`): 05/06/07 confirmaciones, 08 compras, 09 exportación,
    10 REP; desaparecen las claves desplazadas «Compra de Pago»/«Gasto de
    Viaje».
  - `ExonerationType` sin el valor «12» (enum XSD oficial: 01–11 + 99) y
    etiqueta 06 corregida a «Servicios turísticos ICT».
  - `UNITS_OF_MEASURE` unificado a `U+2126` (homógrafo OHM sign).
  - Regeneración determinista completa: `shared/src/generated/` y las
    constantes que reemplaza quedan consistentes con `codes.json`.
- **Corrección de la política de firma (fase 3)**: `xades-policy.ts` pasa de
  la URI v4.1 + SHA-1 (`Ohixl6upD6av8N7pEvDABhEL6hM=`) a la Resolución
  General vigente con `ds:DigestMethod` SHA-256 y digest
  `DWxin1xWOeI8OuWQXazh4VjLWAaCLAA954em7DMh0h8=` (Anexo 2 p. 87);
  `manifest.policy.sdkStatus` pasa a `aligned` y un gate obliga a que las
  constantes publicadas coincidan con el manifiesto (BREAKING: cambia la
  firma emitida).
- **Cierre documentado de `REFERENCE_*`**: transición de las constantes de
  referencia al set 2026 con fecha límite `2026-11-01` y registro del diff
  PDF↔XSD del código 02 («Corrige monto» vs «Corrige texto»).
- **`HaciendaStatus` / `HaciendaRejectionCode`**: verificar casing contra una
  fuente oficial (manual REST de la API de Hacienda); si la fuente confirma
  la discrepancia, corregir con Changeset; si no aparece, quedar como supuesto
  documentado — nada se adivina.
- **Fuera de alcance** (registrado, no abandonado): `names.json` (decisión 10
  del INDENT: sin responsable), PR automático de actualización, borrador
  automático de Changeset, multiversión en paralelo, corrección documental de
  `docs/specs/v4.4-compliance.md` §3.1/§1.9 (item P2 de A1) y consultas
  externas a Hacienda (item P2).

## Capabilities

### New Capabilities

_(ninguna — las capacidades de fases 2 y 3 ya existen; este cambio cierra su
implementación y ajusta dos requisitos que las correcciones de A1 ponen en
tensión.)_

### Modified Capabilities

- `codes-generation`: se añade el requisito «Correcciones sancionadas de
  paridad con cita de fuente primaria», la única excepción a la paridad
  absoluta (mismas claves y valores que la tabla reemplazada) del requisito
  existente: una corrección declarada en el registro de parejas, con cita de
  la fuente primaria del informe de conformidad y referencia a un Changeset
  publicado, puede eliminar o renombrar claves/valores; una desviación sin
  declarar sigue haciendo fallar el comando. Es lo que permite generar
  `DocumentTypeCode` (10 oficiales sobre 9 desplazados) y `ExonerationType`
  (sin el «12») sin apagar el candado. Además se canonizan los encabezados
  «Candado 1/2» del spec principal (forma no canónica que los pliega al
  requisito anterior a los ojos del maquinario de deltas).
- `spec-integrity`: requisito nuevo — las constantes publicadas de la
  política de firma (`shared/src/constants/xades-policy.ts`) SHALL coincidir
  con el bloque `policy` del manifiesto (identificador, algoritmo SHA-256,
  digest en Base64); con la corrección aplicada `sdkStatus` pasa a `aligned`
  y cualquier divergencia futura falla la verificación en CI.

## Impact

- **Paquetes publicados** (`shared` → `@dojocodinglabs/hacienda-cr`, CLI,
  MCP): BREAKING en constantes de catálogo (claves eliminadas/renombradas de
  `DocumentTypeCode`, valor eliminado de `ExonerationType`, homógrafo Ω) y en
  la política de firma (URI + algoritmo + digest) — Changeset obligatorio con
  notas de migración.
- **Clave numérica y firmas**: `DocumentTypeCode` alimenta la clave; la
  política de firma cambia el XAdES-EPES emitido. Riesgo de compatibilidad
  asumido y declarado: los catálogos nuevos son los que Hacienda valida.
- **CI**: no se añaden workflows nuevos; los candados 1 y 2 y `spec:verify`
  ya corre `pnpm verify` (specs archivados), y el gate de política nueva es
  una prueba colocada que `pnpm verify` ejecuta.
- **GitHub**: landear `#53` → `#54` → `#55` (drafts) y encimar las
  correcciones; PR final de A2 sobre `main`.
- **Dependencia A1**: el informe `docs/conformity-report.md` (PR `#56`,
  pendiente de la decisión de la tarea 4.2 de A1) es la lista de
  correcciones sancionadas que este cambio ejecuta; su cita por fila es la
  fuente de cada corrección.
