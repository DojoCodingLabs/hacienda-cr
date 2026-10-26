## 1. Descubrimiento y descarga

Red puntual: UA `curl`/`wget`, sin credenciales. Convención de respaldos: `/tmp/opencode/spec-baseline/` con `pdfs/` (PDFs), `atv-2024/` (XSD base) y `ovi-2026/` (XSD revisión); lo nuevo de esta fase se guarda en el subdirectorio que le corresponda.

- [x] 1.1 Listar la página ATV y registrar los **href** exactos (los títulos de enlace son inconsistentes — INDENT 4.1: un `.rar` se titula como zip) hacia `ANEXOS Y ESTRUCTURAS_V4.4.pdf`, la Resolución General de la política, el "PDF de monedas" y el ".rar de ubicaciones" (INDENT 11.9)
- [x] 1.2 Descargar el PDF de la política: intentar primero la URL literal del `xades:Identifier` del Anexo 2 (`/xmlschemas/…t%C3%A9cnicas…`, hoy 403) y, al no responder, la servida en `/xml-schemas/` con ortografía corregida (200); registrar cuál resolvió — resolvió `/xml-schemas/` (D2; la errata real del Identifier es `xmlschemas` sin guion, no `t%C3%A9ncinas`)
- [x] 1.3 Calcular SHA-256 del PDF de la política y comparar su codificación Base64 con `DWxin1xWOeI8OuWQXazh4VjLWAaCLAA954em7DMh0h8=` (digest literal del Anexo 2 — 4 ocurrencias en el PDF; el INDENT lo transcribe mal); si difiere, detener el cambio y reportar ambos valores (spec: digest publicado ≠ descarga). **Resultado 2026-10-08:** descarga = `0d6c629f…d21f` → `DWxin1xWOeI8…h0h8=` = Anexo 2 ✓ coincide
- [x] 1.4 Descubrir `Codigodemoneda_V4.4` y `Codificacionubicacion_V4.4` en el orden ATV → `cdn.comprobanteselectronicos.go.cr/xml-schemas/` → OVi (D6); registrar URL, superficie y formato; determinar si el ".rar de ubicaciones" de ATV **es** la publicación de `Codificacionubicacion_V4.4` o un artefacto distinto; si el formato publicado difiere del pedido (PDF / CSV) o solo existe comprimido, detenerse y preguntar (CSV extraído vs `.rar` completo) antes de continuar. **Resultado:** ambos en ATV; moneda = PDF ✓; ubicaciones = solo `.rar` que contiene `Codificacionubicacion_V4.4.xlsx` (CSV inexistente en las 3 superficies); freno consultado → **decisión: vendorizar el `.rar` completo**
- [x] 1.5 Descargar `ANEXOS Y ESTRUCTURAS_V4.4.pdf` fresco y compararlo byte a byte con el respaldo de `/tmp/opencode/spec-baseline/pdfs/`; si difiere, registrar la discrepancia y quedarse con la descarga (decisión 14). **Resultado:** idénticos (`2e36bd1101bbcabbb391ab1ec8ffc3773b93031341c7d98a05a5d0f0887d4305`, 1 508 073 bytes)

## 2. Vendorización (procede solo si 1.3 y 1.4 terminaron sin freno)

- [x] 2.1 Colocar los cuatro documentos en `packages/sdk/schemas/2024/v4.4/` con la forma ASCII exacta de la decisión 9 (D2: sin tilde y sin errata en el nombre del PDF de política)
- [x] 2.2 Limpiar el resto de la vendorización previa de la DGT-R-48-2016 (decisión 11 ya no la incluye): eliminar `packages/sdk/schemas/2016/`, que hoy contiene solo `2016/v4.1/` vacío. No está rastreado por git: no aparecerá en el diff ni en el commit (D5)
- [x] 2.3 Inventario **antes** de escribir el manifiesto: `ls packages/sdk/schemas/2024/v4.4/` y `.../2026/v4.4/` = 9 XSD cada uno; `git ls-files packages/sdk/schemas` = 20 rutas (18 XSD + `xmldsig-core-schema.xsd` + `README.md`); los cuatro documentos nuevos en `2024/v4.4/`; `git status` confirma que los 20 existentes no se modifican. Si el recuento no cuadra, detenerse antes de la sección 3
- [x] 2.4 Verificar `downloadedAt` con evidencia: comparar los 18 XSD del repo con los respaldos `/tmp/opencode/spec-baseline/atv-2024/` y `/tmp/opencode/spec-baseline/ovi-2026/` (descargados desde la fuente el 2026-10-08 09:23); si alguno difiere, detenerse y reportar (decisión 14). Coinciden → `downloadedAt: "2026-10-08"` para ambos sets = **fecha de descarga verificada** (D10: la descarga de hoy ocurrió y su resultado coincide con lo vendorizado, aunque no cambie ningún archivo)

## 3. `manifest.json`

- [x] 3.1 Escribir las claves de primer nivel en orden fijo (D4): `schemaVersion: 1`, `lastSyncedAt: "2026-10-08"` (hoy: fecha de escritura manual — el README declara esta semántica temporal; D10), `currentSet: "2024/v4.4"` (**en vigor hoy**; la revisión 2026 es obligatoria desde el 2026-11-01 — INDENT 4.1, decisión 15), `nextSet: { "id": "2026/v4.4", "effectiveFrom": "2026-11-01" }` (si no hubiera próximo set, la clave se **omite**, nunca `null` — D4), `surfaces[]` con `id`/`url`/`type` según el vocabulario cerrado de D12 (`atv`/`atv-page`, `ovi`/`ovi-list`, `cdn`/`cdn-xml-schemas`; ATV y OVi son superficies distintas), `sets[]` con `2024/v4.4` y `2026/v4.4` (id, año, versión, `downloadedAt: "2026-10-08"` = fecha de descarga verificada — D10/2.4, `sourceSurface` = clave `id` de `surfaces[]`; sin `2016/v4.1` — D5)
- [x] 3.2 Escribir el bloque `policy` con `identifier` verbatim del Anexo 2 (incluida la errata), `digestMethod`, `digestValue` Base64, `citation` al Anexo 2 del PDF de Anexos, `sourceSurface` y `sdkStatus: "pending-sdk-migration"` (5.2/5.7, D2/D4)
- [x] 3.3 Escribir `files[]` con una entrada por cada documento vendorizado (los 18 XSD, los cuatro documentos nuevos y `xmldsig-core-schema.xsd`), **ordenado lexicográficamente por `path`** (D11: `2024/…` primero, `2026/…` después, `xmldsig-core-schema.xsd` al final): `path` POSIX relativo a `schemas/`, `sha256` hex de 64, `bytes`, `vendored: true`, y `set` correspondiente (`null` para `xmldsig-core-schema.xsd`); `manifest.json` y `README.md` no llevan entrada; los archivos no vendorizados (`.doc`, Reglamento, HTML, `.xlsx`) quedan fuera (D9)
- [x] 3.4 Recalcular SHA-256 y tamaño de cada archivo en disco contra las entradas. Con **`sha256sum -c`** (formato `hash  ruta`, seguro con espacios — no parsear la salida de `sha256sum` con `awk '{print $2}'`):
  ```sh
  node -e 'const m=require("./packages/sdk/schemas/manifest.json");for(const f of m.files) console.log(f.sha256+"  "+f.path)' > /tmp/manifest.sha256
  (cd packages/sdk/schemas && sha256sum -c /tmp/manifest.sha256)
  ```
  Criterio: **23 líneas `OK`, cero `FAILED`** (18 XSD + 4 documentos + `xmldsig`), cero rutas duplicadas y cero archivos sin entrada. `bytes` contra `stat -c %s <archivo>` (o `fs.statSync` en Node); cero diferencias. Cierre del cruce Base64 ↔ hex (D3): decodificar el digest publicado y compararlo con el `sha256` hex que entró al manifiesto —
  ```sh
  base64 -d <<< "DWxin1xWOeI8OuWQXazh4VjLWAaCLAA954em7DMh0h8=" | xxd -p -c 256
  # debe ser idéntico al sha256 hex de files[] para el PDF de la política
  ```
- [x] 3.5 Formatear con Prettier y comprobar `prettier --check` sobre `manifest.json`

## 4. Documentación (`packages/sdk/schemas/README.md`)

- [x] 4.1 Ampliar la procedencia: superficie, URL de descarga y fecha de cada uno de los cuatro documentos nuevos, más el bloque de la política de firma con la cita del Anexo 2; documentar la semántica de los campos: `currentSet` = en vigor hoy, `nextSet` = publicado con `effectiveFrom` (se omite si no aplica; `2024/v4.4` permanece en `sets[]` tras el cambio), `lastSyncedAt` = hoy fecha de escritura manual con nota de que cambiará de semántica cuando exista `spec:check`/`spec:update` (D10), `downloadedAt` = fecha de descarga verificada (D10), valores de `sdkStatus` (`pending-sdk-migration` | `aligned` — valores nuevos requieren actualizar este README), y que `policy.identifier` es lo que exige el Anexo 2 mientras el SDK aún declara otra política (corrección = fase 3)
- [x] 4.2 Marcar explícitamente como **supuestos no verificados** la redistribución sin restricciones (decisiones 7 y 11) y el acceso a las superficies desde CI (decisión 8)

## 5. Aceptación

- [x] 5.1 Recorrer los escenarios del spec: los cuatro documentos en `2024/v4.4/`, digest Base64 = hex del PDF de política (incluido el cruce `base64 -d` ↔ `sha256` de 3.4), `currentSet` = `2024/v4.4` (en vigor) con `nextSet.effectiveFrom: "2026-11-01"`, `lastSyncedAt` y `downloadedAt` = `2026-10-08`, `surfaces[]` con `id`/`url`/`type` de D12 y todo `sourceSurface` apuntando a un `id` declarado, `policy.sdkStatus` = pendiente, auxiliares con `set` de la versión v4.4, `files[]` ordenado por `path`, toda entrada completa y única, semántica de campos documentada en el README
- [x] 5.2 `pnpm verify` verde (puerta offline del repo, sin red)
- [x] 5.3 `git status` muestra solo los archivos esperados (4 documentos + `manifest.json` + `README.md`); dejar preparado un único commit con archivos + manifiesto + README (D8), sin commitear hasta petición explícita
