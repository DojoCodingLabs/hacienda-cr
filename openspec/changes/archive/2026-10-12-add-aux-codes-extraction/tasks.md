# Tasks: add-aux-codes-extraction

## 1. Vendorización de fuentes

- [x] 1.1 Verificar que `Codificacionubicacion_V4.4.rar` está presente en
      `packages/sdk/schemas/2024/v4.4/` y que su SHA-256/bytes coinciden
      con la entrada de `manifest.json` (ya vendorizado en la
      vendorización inicial del set). Si falta o difiere, obtenerlo del
      paquete oficial de ATV (URL indicada en INDENT 4.3) o del archivo
      suministrado por el equipo; si el resultado no es un `.rar` cuya
      estructura interna corresponda al `.xlsx` esperado, detenerse y
      preguntar antes de continuar
- [x] 1.2 Actualizar `packages/sdk/schemas/README.md`: `codes.json` como
      derivado de XSD + auxiliares vendorizados (ANEXOS, Codigodemoneda,
      Codificacionubicacion) y referenciar la tabla canónica de disposición
      de notas de la capacidad `codes-extraction`
      (`openspec/specs/codes-extraction/spec.md`; se sincroniza desde la
      delta al archivar este cambio — no editar el spec principal a mano).
      Documentar la semántica de los **códigos compuestos** de las cuatro
      tablas de ubicación (D5b: `provincia[.cantón[.distrito[.barrio]]]`,
      separador `.`, componentes byte a byte) con un ejemplo de búsqueda
      (p. ej. cantón 5 de la provincia 3 → `3.5`).
      **No** agregar hash del README en el manifiesto: `README.md` es
      allowlist de `spec:verify`, no archivo con entrada en `files[]`
- [x] 1.3 Verificar que ningún CSV/JSON derivado del `.xlsx` existe en el
      repo ni en el manifiesto
- [x] 1.4 Extraer el `.xlsx` del `.rar` ya vendorizado, inspeccionar
      hojas/columnas reales (secciones provincia/cantón/distrito/barrio,
      columna "Barrio o Poblado", confirmación de que los códigos
      reinician en cada nivel y del formato de código compuesto de D5b) y
      documentar los hallazgos en
      `design.md` (D8/Open Questions), ajustando el diseño si difiere de
      lo asumido — **antes** de implementar `aux-xlsx.mjs`

## 2. Dependencias y seams

- [x] 2.1 Agregar `node-unrar-js` y `exceljs` como devDependencies raíz
      (pnpm, versión fijada por lockfile)
- [x] 2.2 Verificar la licencia de `node-unrar-js` (código UnRAR bajo
      licencia restrictiva — revisar términos vigentes y dejar constancia
      en el PR; solo devDependency, nunca en paquetes publicados)
- [x] 2.3 Definir seams inyectables en `extract.mjs` (`runPdftotext`,
      `extractRar`, `readXlsx`) con defaults a las implementaciones reales

## 3. Lectores auxiliares

- [x] 3.1 Implementar `lib/aux-rar.mjs`: extraer el `.xlsx` del `.rar` a
      `os.tmpdir()` con `mkdtemp`, devolver ruta, limpiar en `finally`;
      ausencia/extractor fallo ⇒ error fatal
- [x] 3.2 Implementar `lib/aux-xlsx.mjs` con `exceljs`, conforme a la
      estructura real documentada en la task 1.4: hoja única `Hoja1`,
      fila 1 de cabecera (pares combinados código+nombre en B..I:
      provincia, cantón, distrito, "Barrio o Poblado"), una fila
      denormalizada por barrio desde la fila 2; códigos de celda numéricos
      o texto ⇒ `String(valor)` sin padding; dedupe por clave con primera
      aparición no vacía; construir los **códigos compuestos por nivel**
      de D5b
      (`provincia[.cantón[.distrito[.barrio]]]`, componentes byte a byte,
      sin padding) y fallar si la composición produce duplicados en la
      tabla barrio; estructura inesperada ⇒ error fatal nombrando lo
      encontrado
- [x] 3.3 Implementar `lib/aux-pdf.mjs`: runner `pdftotext -layout` y
      parsers de notas 3, 5, 6, 8, 8.1, 9, 10, 10.1, 16, 18, 20, 21, 22,
      23 de ANEXOS con manejo de renglones partidos y pies de nota — la
      nota 3 genera dos tablas con parsers separados anclados a sus
      encabezados de sub-tabla dentro de la nota (no al `Nota 3/`
      genérico): `Nota3/TipoComprobanteDocumentoAsociado`
      (códigos `01`–`10`) y `Nota3/SituacionComprobante` (códigos `1`,
      `2`, `3`, descripción = nombre oficial de la fila); 0 filas
      en una nota listada ⇒ fatal (la nota 13.1 se maneja en 3.4 y la 14
      vía 3.1/3.2; las no listadas no se parsean — ver disposición en el
      spec)
- [x] 3.4 Implementar en `aux-pdf.mjs` el parser de la nota 13.1
      (`Codigodemoneda_V4.4.pdf`): código byte a byte + descripción desde
      la tabla del PDF

## 4. Fusión de autoridades

- [x] 4.1 Implementar `lib/aux-merge.mjs`: clave compartida ⇒ códigos
      fijados por XSD, descripción auxiliar solo donde falta, conflicto
      descripción ⇒ gana XSD + advertencia, código solo-auxiliar ⇒
      descarte + advertencia
- [x] 4.2 Clave solo-auxiliar ⇒ tablas `kind: "aux-table"` con `sources`
      de tabla (ubicación: `["2024/v4.4/Codificacionubicacion_V4.4.rar"]`;
      nota 3: `["2024/v4.4/ANEXOS Y ESTRUCTURAS_V4.4.pdf"]`, rutas
      relativas a `packages/sdk/schemas/`, misma convención que
      `files[].path`) y **valores sin `sources[]` por valor** (decisión
      D5: una sola fuente por tabla, basta la de la tabla); claves:
      `CodificacionUbicacion/{Provincia,Canton,Distrito,Barrio}` con los
      códigos compuestos de D5b y
      `Nota3/{TipoComprobanteDocumentoAsociado,SituacionComprobante}`
- [x] 4.3 Extender `lib/render.mjs`: `sources[]` por valor **solo en
      tablas fusionadas** (XSD + auxiliar con clave compartida; XSD en
      orden del set, luego auxiliares en orden fijo) — las `aux-tables`
      no lo llevan (D5) —, `generatedFrom` con XSD + las tres rutas
      auxiliares, preservar orden por clave e idempotencia
- [x] 4.4 Cablear el pipeline en `extract.mjs`: manifiesto → XSD →
      auxiliares (fallo ⇒ sin escribir) → fusión → render; advertencias
      por stderr con exit 0

## 5. Tests

- [x] 5.1 Tests de `aux-pdf.mjs` con texto sintético vía seam (notas con
      renglones partidos, código extra en ANEXOS ⇒ advertencia, 0 filas ⇒
      fatal)
- [x] 5.2 Tests de `aux-merge.mjs` (autoridad XSD, conflicto de
      descripción, moneda sin documentación completada desde PDF, claves
      solo-auxiliar)
- [x] 5.3 Tests de `aux-xlsx.mjs` con XLSX de fixture generado en el
      propio test (exceljs): estructura inválida ⇒ fatal; códigos
      compuestos por nivel generados correctamente y duplicados tras la
      composición ⇒ fatal
- [x] 5.4 Tests de `extract.mjs` end-to-end con seams stubeados: exit 0 +
      `codes.json` byte a byte idéntico en doble corrida; auxiliar
      faltante ⇒ exit ≠ 0 sin tocar `codes.json`
- [x] 5.5 Test de ruta real del `.rar` vendorizado con skip si el archivo
      no está presente (usa `node-unrar-js`, agregada en task 2.1); si la
      librería no puede cargar en CI (WASM/permisos), omitir el test con
      un skip que explique el motivo — la suite no debe fallar por eso

## 6. Regeneración y verificación

- [x] 6.1 Ejecutar `pnpm codes:extract` y revisar `codes.json`: cuatro
      claves de ubicación (incl. `Barrio`) con códigos compuestos únicos
      por tabla (D5b), descripciones de moneda,
      `sources[]` por entrada, `generatedFrom` completo, y ninguna entrada
      cuyo `sources[]` declare procedencia de la extracción PDF de las
      notas 12/17/19
- [x] 6.2 Revisar stderr de la regeneración: solo advertencias esperadas
      (si las hay), exit 0
- [x] 6.3 Verificar que `codes:extract` sigue fuera de
      `pnpm verify`/`spec:verify`/deriva, y correr la suite del extractor
      y `pnpm verify` completo
- [x] 6.4 Verificar que el contrato de este cambio —incluida la tabla
      canónica de disposición de notas— vive en la delta
      `openspec/changes/add-aux-codes-extraction/specs/codes-extraction/spec.md`
      y que `proposal.md`, `design.md`, `tasks.md` y
      `packages/sdk/schemas/README.md` lo replican sin contradicción
      (mismas notas y disposiciones). **No** editar a mano
      `openspec/specs/codes-extraction/spec.md`: la sincronización con el
      spec principal ocurre solo al archivar el cambio
      (`openspec archive`)
- [x] 6.5 Revisar `docs/testing.md` y `docs/reference.md`: hoy ninguno
      menciona `codes:extract`; si este cambio añade una mención,
      actualizar el alcance (XSD + auxiliares vendorizados) y los
      prerrequisitos nuevos de entorno local (`pdftotext`). La doc de
      procedencia vive en `packages/sdk/schemas/README.md` (task 1.2);
      no crear un README en `scripts/codes-extract/`
- [x] 6.6 Si la implementación revela ajustes de contrato (p. ej. el
      formato real de los códigos compuestos de ubicación), editarlos en
      la delta `openspec/changes/add-aux-codes-extraction/specs/codes-extraction/spec.md`
      —artefacto ya creado por `openspec new`— y mantener `proposal.md`,
      `design.md` y `tasks.md` coherentes con él; `openspec/specs/` solo
      se actualiza vía `openspec archive`/sync
