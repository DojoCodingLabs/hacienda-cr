# Informe de conformidad A1 — tablas de códigos del SDK vs fuentes primarias de Hacienda

**Estado:** evidencia histórica + delta contra el main vigente ·
**Fecha de lectura de las fuentes:** 2026-10-14 ·
**Código auditado:** `a0c6b67` (checkout baseline `release/v0.4.1`) ·
**Apéndice §10 (estado de entonces):** `597a556` (rama `feat/verify-signing-policy-digest`) ·
**Reconciliación §11:** base revisada `cf1db1e4bde37498643f77c8259c0a29e51033a1`, cabeza
revisada `81c6e42179320bbacaf5c74c6fe8973fd871159b` (pasada de sólo lectura, 2026-10-18)

Este informe confronta cada tabla de códigos que el SDK define contra las fuentes
primarias de Hacienda (PDF de Anexos, XSD v4.4, PDF de códigos de moneda, catálogo de
ubicación y Resolución General), con cita verificable por fila y un veredicto de
vocabulario cerrado. **No** valida documentos XML contra XSD, ni la autenticidad de
firmas, ni la aceptación por Hacienda: son capas de validación distintas.

**Cómo leerlo.** Las secciones 1–9 y el apéndice §10 son la **foto** de una lectura
concreta: conservan sus hashes, sus citas y sus veredictos, y no se reescriben. La
sección §11 es el **delta**: el estado de cada hallazgo en el main vigente. Ninguna fila
histórica se reescribe como observación nueva; donde el main corrigió algo, la corrección
aparece en §11, no en el apéndice.

---

## 1. Procedencia de los bytes leídos

### 1.1 Sets

- `2024/v4.4/` — set **vigente** (`currentSet` del manifiesto): 9 XSD + PDF de Anexos +
  PDF de códigos de moneda + `.rar` de ubicación + Resolución General.
- `2026/v4.4/` — revisión de abril de 2026, **obligatoria desde 2026-11-01**: solo 9 XSD.

### 1.2 SHA-256 de cada archivo consultado

```
2e36bd1101bbcabbb391ab1ec8ffc3773b93031341c7d98a05a5d0f0887d4305  ./2024/v4.4/ANEXOS Y ESTRUCTURAS_V4.4.pdf
9772345b05f784d0fc6774f0a2429d89b2867897e22e07b31a0d173549e364f1  ./2024/v4.4/Codificacionubicacion_V4.4.rar
55d1e42c2f103fc1471d3f1083b954fe3a05012de7d6e224075f93ef9c6a9072  ./2024/v4.4/Codigodemoneda_V4.4.pdf
ae1e5b782b568d225b34e046858012ed808b2587fc5b1b5161fa707b4bdd8253  ./2024/v4.4/FacturaElectronicaCompra_V4.4.xsd
d710032a05cd3d41272c0cceb8130b4add37ce139b491dbaa7bd6a59163809bd  ./2024/v4.4/FacturaElectronicaExportacion_V4.4.xsd
d384afef665573606f6499b2182d6070850ada8c93bc40fa7f0f3901a25b9cc8  ./2024/v4.4/FacturaElectronica_V4.4.xsd
411d858b0e2e293322910a0d4204243d34a874a6e7939c7c492721246900f390  ./2024/v4.4/MensajeHacienda_V4.4.xsd
37bc1ffcf06a66a5a0b63b2908740dbd8f63fe0a4120426ea6a957862355c1c3  ./2024/v4.4/MensajeReceptor_V4.4.xsd
9af7dff4ee0c2787f8fc30cb63aef37b574c96846007be327d442e30e0ddf804  ./2024/v4.4/NotaCreditoElectronica_V4.4.xsd
ac2c63f93602502af22980a81f26032c6a561ed3a8c516ac28184ce1433b7b61  ./2024/v4.4/NotaDebitoElectronica_V4.4.xsd
81d7be9cd9fc3792c2bb3822079784b8d62a3e643e708df0c99bc67d1edcbdfa  ./2024/v4.4/ReciboElectronicoPago_V4.4.xsd
0d6c629f5c5639e23c3ae5905dace1e158cb5806822c003de787a6ec3321d21f  ./2024/v4.4/Resolucion_General_sobre_disposiciones_tecnicas_comprobantes_electronicos_para_efectos_tributarios.pdf
cda1c7dd97f9a235111c29948f05d7893864663cd73792fd3b51e3dae582cfdb  ./2024/v4.4/TiqueteElectronico_V4.4.xsd
57e4cedb12d5045884670ff2e4795d2027e69b96d45752f60cd1a1930e2768a3  ./2026/v4.4/FacturaElectronicaCompra_V4.4.xsd
e571d8296bb74e86cb9ef7889601844c61ac50bedca90aa8d52badf15198242e  ./2026/v4.4/FacturaElectronicaExportacion_V4.4.xsd
926ba81325bc21102755bd8e4e570a63caaca086e680a877c3a6d15d6ee8a62f  ./2026/v4.4/FacturaElectronica_V4.4.xsd
b2606156042b7aa7b7f7f61945f0ff1323661b43b5a1489ad5eafad1c52fd25e  ./2026/v4.4/MensajeHacienda_V4.4.xsd
b883e3a9321eadf2ccc1a9dc853d9e3bd483918dcd6e2152d902ddf2f244365f  ./2026/v4.4/MensajeReceptor_V4.4.xsd
b7ed3347c5599e78e5683d9ae83842695ab9497e173df9cd3be8d77c0851f556  ./2026/v4.4/NotaCreditoElectronica_V4.4.xsd
3709389ccc434fb1ef4571079b1a628654fa04f07c1f3f1044b2416ba12eb7ff  ./2026/v4.4/NotaDebitoElectronica_V4.4.xsd
86e3aa5f0615b757a3b2e9c300973d573ac321f76adba7b4b05e59d854da82b7  ./2026/v4.4/ReciboElectronicoPago_V4.4.xsd
d7783baf818f316596d0b58b17481be689595982a248d98102d707f72967ae6e  ./2026/v4.4/TiqueteElectronico_V4.4.xsd
b8963f433cabcbe45d8d4887731917d10fa21b773794eaa83c2c4143903d534b  ./manifest.json
35cf8197da812c85e40d57891b35c94187569ed474a2dac813ce5090dafcd35c  ./xmldsig-core-schema.xsd
```

Los 19 XSD de la tabla son idénticos byte a byte entre el checkout baseline y la rama
actual (verificado con SHA-256 en la fase 1.3), de modo que el código auditado y el
estado actual leen los mismos esquemas.

**Dos anexos, no uno.** El PDF de Anexos que A1 leyó y el que hoy está vigente **no son
los mismos bytes**:

| Anexo                                                      | SHA-256                                                            | Páginas | Estado                                                   |
| ---------------------------------------------------------- | ------------------------------------------------------------------ | ------- | -------------------------------------------------------- |
| Retenido en el repo (el que A1 leyó)                       | `2e36bd1101bbcabbb391ab1ec8ffc3773b93031341c7d98a05a5d0f0887d4305` | 98      | histórico; es la base de todas las citas de este informe |
| Oficial vigente (revisado aparte, en la preparación de A2) | `6e093226b29b38c5c8de825f70c1b1cb8ed81e2f4a6eb0b3ff52708fc1eb2769` | 99      | el que citan los contratos exactos de `main`             |

La diferencia de _source-set_ entre ambos **no está reconciliada** en este informe: las
citas de §§3–9 y del apéndice §10 remiten al anexo de 98 páginas, y ninguna fila se ha
re-leído contra el de 99. Lo que sí hace §11 es registrar qué encontró el main con el
anexo vigente, para que nadie lea este informe como si describiera el estado actual.

### 1.3 Herramientas

| Herramienta                   | Versión  | Uso                                                                                      |
| ----------------------------- | -------- | ---------------------------------------------------------------------------------------- |
| `pdftotext -layout` (Poppler) | 26.01.0  | extracción de tablas del PDF de Anexos y del PDF de moneda                               |
| Node.js                       | v24.19.0 | script de extracción de enumeraciones de los 18 XSD (parser regex de XML con `unescape`) |
| Python                        | 3.14.4   | comparación byte a byte y verificación de citas contra el texto extraído                 |
| `xmllint` (libxml2)           | 21502    | verificación independiente de enumeraciones XSD (§12)                                    |
| extractor de RAR              | —        | descompresión de `Codificacionubicacion_V4.4.rar` → XLSX                                 |

---

## 2. Protocolo de independencia

1. **Código congelado.** El código se lee en un checkout hermano
   (`hacienda-cr-a1-baseline`, HEAD `a0c6b67` = `origin/release/v0.4.1`), la última rama
   remota previa a la vendorización, limpio en `git status`.
2. **Cuarentena.** La primera pasada (inventario → extracción de fuentes → comparación,
   tareas 2.1–2.4) se hizo **sin** abrir `docs/specs/v4.4-compliance.md` ni el INDENT.
   Solo al cerrar la comparación (tarea 3.3) se levantó la cuarentena y se leyó la
   auditoría previa para la reconciliación (§9).
3. **Fuentes antes que código.** Las tablas oficiales se extrajeron de los archivos con
   SHA-256 declarados (§1.2) y se verificaron contra su página/ruta citada antes de
   compararlas con el SDK.

---

## 3. Inventario (lista cerrada: 27 filas)

Regla de agrupación: cada fila = una enumeración de códigos más sus tablas compañero
(mapas de nombres, porcentajes, longitudes, accessors) que comparten el mismo dominio
de claves. Sondeo: `grep -n 'export const' shared/src/constants/*.ts
packages/sdk/src/api/error-codes.ts`, `grep -rn 'z\.enum' shared/src packages/sdk/src`,
`grep -rn 'as const' shared/src packages/sdk/src`.

### A. Catálogos escritos a mano (`shared/src/constants/`)

| #   | Tabla (export)                                                                 | Archivo                   | Valores                                        |
| --- | ------------------------------------------------------------------------------ | ------------------------- | ---------------------------------------------- |
| 1   | `DocumentTypeCode` (+ `DOCUMENT_TYPE_NAMES`)                                   | `document-types.ts`       | 9 (01–09)                                      |
| 2   | `MensajeReceptorCode`                                                          | `document-types.ts`       | 3 (1–3)                                        |
| 3   | `SituationCode`                                                                | `document-types.ts`       | 3 (1–3)                                        |
| 4   | `IdentificationType` (+ `IDENTIFICATION_TYPE_NAMES`, `IDENTIFICATION_LENGTHS`) | `identification-types.ts` | 6 (01–06)                                      |
| 5   | `PaymentMethod` (+ `PAYMENT_METHOD_NAMES`)                                     | `payment-methods.ts`      | 8 (01–07, 99)                                  |
| 6   | `ProvinceCode` (+ `PROVINCE_NAMES`)                                            | `provinces.ts`            | 7 (1–7)                                        |
| 7   | `SaleCondition` (+ `SALE_CONDITION_NAMES`, `REP_SALE_CONDITIONS`)              | `sale-conditions.ts`      | 16 (01–15, 99); subconjunto REP = 2            |
| 8   | `TaxCode`                                                                      | `tax-codes.ts`            | 10 (01–08, 12, 99)                             |
| 9   | `IvaRateCode` (+ `IVA_RATE_PERCENTAGES`, `IVA_RATE_NAMES`)                     | `tax-codes.ts`            | 11 (01–11)                                     |
| 10  | `ExonerationType`                                                              | `tax-codes.ts`            | 13 (01–12, 99)                                 |
| 11  | `UNITS_OF_MEASURE` (+ accessors `UnitOfMeasure`)                               | `tax-codes.ts`            | 101; accessors 21                              |
| 12  | `CURRENCY_CODES` (+ accessors `CurrencyCode`)                                  | `currency-codes.ts`       | 168; accessors 3                               |
| 13  | `REFERENCE_DOC_TYPES`                                                          | `document-references.ts`  | 21 (01–20, 99)                                 |
| 14  | `REFERENCE_CODES`                                                              | `document-references.ts`  | 16 (01, 02, 04–16, 99)                         |
| 15  | `REP_REFERENCE_CODES`                                                          | `document-references.ts`  | 17 (= REFERENCE_CODES + 17)                    |
| 16  | `DISCOUNT_CODES`                                                               | `document-references.ts`  | 10 (01–09, 99)                                 |
| 17  | `OTHER_CHARGE_TYPES`                                                           | `document-references.ts`  | 11 (01–10, 99)                                 |
| 18  | `EXONERATION_INSTITUTIONS`                                                     | `document-references.ts`  | 13 (01–12, 99)                                 |
| 19  | `Environment`                                                                  | `environments.ts`         | 2 (sandbox, production) — configuración propia |
| 20  | `XADES_POLICY_*` (URI, hash, algoritmos)                                       | `xades-policy.ts`         | 6 escalares                                    |

### B. Catálogo de errores del SDK

| #   | Tabla (export)                                            | Archivo                               | Valores                                               |
| --- | --------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------- |
| 21  | `HaciendaRejectionCode` (+ `REJECTION_CODE_DESCRIPTIONS`) | `packages/sdk/src/api/error-codes.ts` | 12 (01–12)                                            |
| 22  | `HTTP_STATUS_DESCRIPTIONS`                                | `packages/sdk/src/api/error-codes.ts` | 10 (201, 202, 400, 401, 403, 404, 409, 500, 502, 503) |

### C. Catálogo de la clave numérica

| #   | Tabla (export)                                                                  | Archivo                           | Valores                                       |
| --- | ------------------------------------------------------------------------------- | --------------------------------- | --------------------------------------------- |
| 23  | `DocumentType` (alias de fila 1); `Situation` (alias de fila 3); `COUNTRY_CODE` | `packages/sdk/src/clave/types.ts` | 9 + 3 + 1 (506). **No define valores nuevos** |

### D. Listas literales en línea (fuera de `constants/`)

| #   | Tabla                                        | Archivo                               | Valores                                              |
| --- | -------------------------------------------- | ------------------------------------- | ---------------------------------------------------- |
| 24  | `HaciendaStatus`                             | `shared/src/types/api.ts`             | 5 (recibido, procesando, aceptado, rechazado, error) |
| 25  | `CodigoComercialSchema.tipo`                 | `shared/src/schemas/linea-detalle.ts` | 5 (01–04, 99)                                        |
| 26  | `LineaDetalleSchema.tipoTransaccion`         | `shared/src/schemas/linea-detalle.ts` | 13 (01–13)                                           |
| 27  | `CedulaTypeSchema` (config `~/.hacienda-cr`) | `packages/sdk/src/config/types.ts`    | 4 (01–04)                                            |

### E. Excluidos con motivo

- `DOCUMENT_SCHEMAS`, `SCHEMA_FRAGMENTS`, `DocumentVariant`: mapeos estructurales
  (raíz XML/namespace/flags), no catálogos de códigos.
- `API_BASE_URLS`, `IDP_*`, `CLIENT_IDS`: endpoints de entorno, no códigos.
- `EnvironmentSchema` (`config/types.ts`): duplica la fila 19.
- `z.enum(...)` sobre imports de `constants/` (`clave.ts`, `identification.ts`,
  `common.ts`, …): derivados de filas ya inventariadas.
- Catálogo CABYS (`codigoCabys`, regex de 13 dígitos): sin catálogo en el repo →
  fuera de alcance (§8), fuente externa del BCCR.

---

## 4. Método de comparación y vocabulario de veredictos

- **Códigos:** comparación **byte a byte** (sin normalización Unicode, sin `trim`, sin
  plegado de mayúsculas). Dos códigos son iguales solo si sus bytes son iguales.
- **Descripciones:** comparadas con `trim` + colapso de espacios consecutivos. Una
  diferencia **solo** de mayúsculas o acentuación se registra como **advertencia**, no
  como error. Diferencias de redacción (paráfrasis del JSDoc/comentario del SDK frente
  al texto oficial) se reportan como hallazgo **solo cuando contradicen el sentido
  oficial** o añaden información no publicada; la lista completa queda en los datos de
  trabajo de la comparación.
- **15 filas del PDF** tienen descripción en prosa continua que la extracción abrevió:
  sus códigos se verificaron contra la página citada, pero su descripción **no** se
  compara (marcadas `desc-sin-verificar`).
- **Veredictos (vocabulario cerrado):**
  - `coincide` — códigos byte a byte iguales en todas las fuentes primarias consultadas.
  - `no coincide` — al menos una fuente discrepa (el diff está en §6).
  - `parcial` — coincide con unas fuentes oficiales y no con otras (p. ej. set 2026 vs
    set 2024/PDF).
  - `sin fuente oficial verificada` — ninguna superficie consultada contiene el
    catálogo (se listan las superficies, §7).
  - `fuera de alcance` — no es un catálogo de códigos de Hacienda (§8).

---

## 5. Resultados — una fila por tabla

| #   | Tabla SDK                                        | Val | Fuente primaria (cita)                                                                  | Veredicto                                               |
| --- | ------------------------------------------------ | --- | --------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 1   | `DocumentTypeCode`                               | 9   | PDF Anexos, numeración consecutiva, **inciso c), p. 65** (10 tipos)                     | **no coincide** (§6.1)                                  |
| 2   | `MensajeReceptorCode`                            | 3   | PDF Anexos, **Nota 11, p. 75**; XSD `Mensaje`                                           | coincide                                                |
| 3   | `SituationCode`                                  | 3   | PDF Anexos, tabla «Situación del comprobante electrónico», **p. 67**                    | coincide                                                |
| 4   | `IdentificationType`                             | 6   | PDF Anexos, **Nota 4, p. 68**; XSD `TipoIdentificacionEmisor`/`…Receptor` (ambos sets)  | coincide                                                |
| 5   | `PaymentMethod`                                  | 8   | PDF Anexos, **Nota 6, p. 70**; XSD `TipoMedioPago`                                      | coincide                                                |
| 6   | `ProvinceCode`                                   | 7   | `Codificacionubicacion_V4.4.rar` → XLSX hoja 1, columnas B/C                            | coincide                                                |
| 7   | `SaleCondition`                                  | 16  | PDF Anexos, **Nota 5, p. 69**; XSD `CondicionVenta` (REP = {09, 11})                    | coincide                                                |
| 8   | `TaxCode`                                        | 10  | PDF Anexos, **Nota 8, p. 70**; XSD `CodigoImpuestoType`                                 | coincide                                                |
| 9   | `IvaRateCode`                                    | 11  | PDF Anexos, **Nota 8.1, p. 71**; XSD `CodigoTarifaIVAType`                              | coincide                                                |
| 10  | `ExonerationType`                                | 13  | PDF Anexos, **Nota 10.1, p. 74** (12 filas); XSD `TipoExoneracionType` (12, ambos sets) | **no coincide** (§6.2)                                  |
| 11  | `UNITS_OF_MEASURE`                               | 101 | PDF Anexos, **Nota 15, pp. 76–79**; XSD `UnidadMedidaType`                              | **no coincide** (§6.3)                                  |
| 12  | `CURRENCY_CODES`                                 | 168 | PDF «Códigos de moneda», columna CÓDIGO; XSD `CodigoMoneda`                             | coincide (168/168)                                      |
| 13  | `REFERENCE_DOC_TYPES`                            | 21  | PDF **Nota 10, p. 73** (19); XSD `TipoDocReferenciaType` 2024 (19) / 2026 (21)          | **parcial** (§6.4)                                      |
| 14  | `REFERENCE_CODES`                                | 16  | PDF **Nota 9, p. 72** (12); XSD `CodigoReferenciaType` 2024 (12) / 2026 (16)            | **parcial** (§6.4)                                      |
| 15  | `REP_REFERENCE_CODES`                            | 17  | XSD `CodigoReferenciaType` de `ReciboElectronicoPago`: 2024 (12) / 2026 (17)            | **parcial** (§6.4)                                      |
| 16  | `DISCOUNT_CODES`                                 | 10  | PDF **Nota 20, p. 80**; XSD `CodigoDescuentoType`                                       | coincide                                                |
| 17  | `OTHER_CHARGE_TYPES`                             | 11  | PDF **Nota 16, p. 79**; XSD `TipoDocOtrosCargosType`                                    | coincide                                                |
| 18  | `EXONERATION_INSTITUTIONS`                       | 13  | PDF **Nota 23, p. 82**; XSD `NombreInstitucion`                                         | coincide                                                |
| 19  | `Environment`                                    | 2   | — (configuración propia del SDK)                                                        | fuera de alcance (§8)                                   |
| 20  | `XADES_POLICY_*`                                 | 6   | PDF Anexos, **Anexo 2, ejemplos de firma, pp. 87–94**                                   | **no coincide** (§6.6)                                  |
| 21  | `HaciendaRejectionCode`                          | 12  | ninguna superficie consultada                                                           | sin fuente oficial verificada (§7)                      |
| 22  | `HTTP_STATUS_DESCRIPTIONS`                       | 10  | — (estándar HTTP)                                                                       | fuera de alcance (§8)                                   |
| 23  | Clave: `DocumentType`/`Situation`/`COUNTRY_CODE` | —   | derivadas de filas 1/3; país: PDF **p. 66, inciso a)** «código del país (506)»          | coincide (derivada)                                     |
| 24  | `HaciendaStatus`                                 | 5   | solo ejemplo JSON: PDF **Anexo 3, p. 98**, `"indEstado":"RECIBIDO"`                     | sin fuente oficial verificada (§7), observación en §6.5 |
| 25  | `CodigoComercial.tipo`                           | 5   | PDF **Nota 12, p. 75**; XSD `element Tipo` (dominio 01–04, 99)                          | coincide                                                |
| 26  | `tipoTransaccion`                                | 13  | PDF **Nota 22, p. 81**; XSD `TipoTransaccionType`                                       | coincide                                                |
| 27  | `CedulaType`                                     | 4   | derivada de `IdentificationType` (01–04 ⊆ 01–06)                                        | coincide (subconjunto derivado)                         |

**Resumen:** 16 `coincide` · 4 `no coincide` (filas 1, 10, 11, 20) · 3 `parcial`
(filas 13, 14, 15) · 2 `sin fuente oficial verificada` (filas 21, 24) ·
2 `fuera de alcance` (filas 19, 22). Advertencias de mayúsculas/acentuación en la
comparación de descripciones: **21**.

---

## 6. Hallazgos (diffs de las filas `no coincide` y `parcial`)

### 6.1 Fila 1 — `DocumentTypeCode`: semántica desplazada y falta el código 10

El PDF de Anexos (inciso c), p. 65) enumera **10** tipos; el SDK define **9** con otra
asignación de significados:

| Código | Fuente primaria (PDF p. 65)                                    | SDK (`DocumentTypeCode`)           |
| ------ | -------------------------------------------------------------- | ---------------------------------- |
| 05     | Confirmación de aceptación del comprobante electrónico         | Factura Electrónica de Compra      |
| 06     | Confirmación de aceptación parcial del comprobante electrónico | Factura Electrónica de Exportación |
| 07     | Confirmación de rechazo del comprobante electrónico            | Recibo Electrónico de Pago         |
| 08     | Factura electrónica de compras                                 | Compra de Pago                     |
| 09     | Factura electrónica de exportación                             | Gasto de Viaje                     |
| 10     | Recibo Electrónico de Pago                                     | _(ausente)_                        |

- Las cadenas **«gasto de viaje» y «compra de pago» no aparecen en ninguna página del
  PDF de Anexos** (98 pp., búsqueda case-insensitive) ni en los 18 XSD.
- El XSD **no** ofrece enumeración de tipos de comprobante: el `element TipoDocumento`
  que aparece en los esquemas es el catálogo de tipos de documento de **exoneración**
  (01–07, 99). Mapear esa enumeración contra esta fila sería inválido (trampa
  metodológica verificada y descartada).
- Códigos 01–04: iguales; advertencias de mayúsculas («Factura Electrónica» vs «Factura
  electrónica», 4 casos).

### 6.2 Fila 10 — `ExonerationType`: código «12» inexistente y etiqueta «06» errónea

- SDK: 13 valores (01–12, 99). Fuentes: **12** valores (01–11, 99) — PDF Nota 10.1
  p. 74 y XSD `TipoExoneracionType` en **ambos** sets (verificado con `xmllint`, §12).
  Diff: **solo en el SDK: `12`**.
- Código 06: SDK **«Transitorio IX»** vs oficial **«Servicios turísticos inscritos ante
  el Instituto Costarricense de Turismo»** (XSD) / «Exoneración de servicios
  turísticos… ICT» (PDF p. 74). Contradicción de sentido, no de forma.
- El resto de diferencias de descripción (5–9 según la fuente) son paráfrasis del
  JSDoc, sin cambio de significado.

### 6.3 Fila 11 — `UNITS_OF_MEASURE`: «Ω» con code point distinto

| Superficie                          | Carácter | Code point                          |
| ----------------------------------- | -------- | ----------------------------------- |
| SDK (`UNITS_OF_MEASURE`)            | Ω        | `U+03A9` GREEK CAPITAL LETTER OMEGA |
| XSD `UnidadMedidaType` (ambos sets) | Ω        | `U+2126` OHM SIGN                   |
| PDF Anexos Nota 15 (p. 76–79)       | Ω        | `U+2126` OHM SIGN                   |

Igualdad visual, bytes distintos: sin normalización Unicode (protocolo de este informe),
es un diff de un código sobre 101. Ya está declarado como no-pareja deliberada en
`scripts/codes-generate/table-map.mjs` (§10).

### 6.4 Filas 13–15 — `REFERENCE_*`: alineadas con la revisión 2026, no con el set vigente

| Tabla                 | Set/PDF 2024                | Set 2026 | SDK | Diff (solo SDK)              |
| --------------------- | --------------------------- | -------- | --- | ---------------------------- |
| `REFERENCE_DOC_TYPES` | 19 (PDF Nota 10 y XSD 2024) | 21       | 21  | `19`, `20`                   |
| `REFERENCE_CODES`     | 12 (PDF Nota 9 y XSD 2024)  | 16       | 16  | `13`, `14`, `15`, `16`       |
| `REP_REFERENCE_CODES` | 12 (XSD REP 2024)           | 17       | 17  | `13`, `14`, `15`, `16`, `17` |

- El SDK **coincide exactamente** con el set `2026/v4.4` (obligatorio desde
  2026-11-01) y **no** con el set vigente 2024 ni con el PDF de Anexos.
- Contradicción **entre fuentes oficiales**: el código `02` es «Corrige monto» en el PDF
  Nota 9 (p. 72) y «Corrige texto de ocumento de referencia» [sic] en el XSD 2026 — el
  SDK sigue la posición del XSD («Corrige texto de documento de referencia»).
- Erratas oficiales detectadas en el XSD 2026 (citadas literalmente): `02` «de
  **ocumento**», `05` «por **contigencia**». El SDK escribe ambas correctamente; son
  diffs de descripción, no de significado.

### 6.5 Fila 24 — `HaciendaStatus`: único rastro oficial en mayúsculas

- SDK: `recibido`, `procesando`, `aceptado`, `rechazado`, `error` (minúsculas).
- Único valor evidenciado en las superficies consultadas: ejemplo JSON del Anexo 3
  (p. 98): `"indEstado": "RECIBIDO"` (**mayúsculas**).
- El código **no normaliza el caso**: la única conversión de mayúsculas de la capa API
  es `Content-Type`.toLowerCase() (`http-client.ts:269`); la comparación de estados es
  cruda. Si Hacienda publica estados en mayúsculas (como el único ejemplo oficial), el
  SDK no los reconocería. Veredicto de la fila: `sin fuente oficial verificada` (§7).

### 6.6 Fila 20 — `XADES_POLICY_*`: política distinta a la de los ejemplos oficiales

| Superficie                           | URI de política                                                                                                                                                                | Digest                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| SDK (`xades-policy.ts`)              | `https://tribunet.hacienda.go.cr/docs/esquemas/2016/v4.1/Resolucion_Comprobantes_Electronicos_DGT-R-48-2016.pdf`                                                               | SHA-1 `Ohixl6upD6av8N7pEvDABhEL6hM=`                   |
| PDF Anexos, Anexo 2 (ejemplo, p. 87) | `https://cdn.comprobanteselectronicos.go.cr/xml-schemas/Resoluci%C3%B3n_General_sobre_disposiciones_t%C3%A9cnicas_comprobantes_electr%C3%B3nicos_para_efectos_tributarios.pdf` | SHA-256 `DWxin1xWOeI8OuWQXazh4VjLWAaCLAA954em7DMh0h8=` |

- La URI y el hash del SDK **no aparecen en ninguna superficie consultada** (búsqueda
  sobre los textos de Anexos, Resolución General y ambos sets XSD).
- La Resolución General (`MH-DGT-RES-0027-2024`) es texto legal: no contiene digests.
- Las fuentes **no establecen cuál política está vigente** (§13): los ejemplos del
  Anexo 2 son la única evidencia publicada. Hallazgo relacionado: la auditoría previa
  ya reportó esta discrepancia (§9.1) y la rama actual lo está tratando (§10).

---

## 7. Sin fuente oficial verificada

**Superficies consultadas para esta sección** (con sus SHA-256 en §1.2): PDF de Anexos
(98 pp., texto completo), los 18 XSD de ambos sets, PDF de códigos de moneda, catálogo
de ubicación (RAR→XLSX) y Resolución General.

| Tabla                                                  | Resultado de la búsqueda                                                                                                                                                        | Fuente esperada (no disponible en A1)                                    |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 21 · `HaciendaRejectionCode` (01–12 con descripciones) | El PDF de Anexos menciona «rechazo» en el contexto de confirmaciones, pero **no contiene ningún catálogo de causas/errores de rechazo**; los XSD no enumeran códigos de rechazo | Manual de la API REST de Hacienda (no incluido en las superficies de A1) |
| 24 · `HaciendaStatus` (5 valores)                      | No existe catálogo de `ind-estado` en ninguna superficie; único rastro: ejemplo p. 98 (`"RECIBIDO"`)                                                                            | Manual/contrato de la API REST de Hacienda                               |

---

## 8. Fuera de alcance

| Tabla                                    | Motivo                                                                                                                     |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 19 · `Environment` / `EnvironmentSchema` | Enumeración de configuración propia del SDK (`sandbox`, `production`), no un catálogo publicado por Hacienda.              |
| 22 · `HTTP_STATUS_DESCRIPTIONS`          | Códigos de estado HTTP (estándar IETF), sin relación con Hacienda.                                                         |
| Catálogo CABYS (`codigoCabys`)           | Catálogo del Banco Central de Costa Rica, externo al repo y a las superficies de A1 (pregunta abierta D6 del `design.md`). |
| Excluidos estructurales (§3.E)           | Mapeos de esquemas, endpoints y `z.enum` derivados: no son tablas de códigos independientes.                               |

---

## 9. Reconciliación con `docs/specs/v4.4-compliance.md` (auditoría previa, 2026-08-24)

Leída **después** de cerrar la primera pasada (cuarentena, §2).

### 9.1 Coincidencias (dos lecturas independientes que coinciden)

| Tema                                                          | Auditoría                                                               | A1                                                                                                                                                                |
| ------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Política XAdES (§1.10, §3.5)                                  | Reporta hash SHA-1 `Ohixl…` del SDK vs SHA-256 `DWxin…` de los ejemplos | Confirma byte a byte y añade que la URI/hash del SDK no aparecen en ninguna superficie (§6.6)                                                                     |
| Revisión abril 2026 (§2.4)                                    | Documenta tipos 19–20, códigos 13–16/17 y el 12 redefinido              | Confirma que las constantes igualan el set 2026 y divergen del 2024/PDF (§6.4)                                                                                    |
| `TaxCode` (§1.5)                                              | «`CodigoImpuestoType` = 01–08, 12, 99 matches our TAX_CODES»            | Confirma `coincide` (10/10)                                                                                                                                       |
| Exoneración 06 (§1.5)                                         | «Servicios turísticos ICT (was Transitorio IX)»                         | Confirma: la etiqueta oficial es «Servicios turísticos… ICT» y el SDK aún dice «Transitorio IX» (§6.2)                                                            |
| Medios de pago 06/07 (§1.7, «confirm labels from ANEXOS PDF») | Pregunta abierta                                                        | **Resuelta**: Nota 6 p. 70 → 06 «SINPE Móvil», 07 «Plataforma Digital»; SDK coincide                                                                              |
| Tarifas 09/10/11 (§1.5, «confirm percentages… do not guess»)  | Pregunta abierta                                                        | **Resuelta**: Nota 8.1 p. 71 + XSD → 09 «Tarifa reducida 0.5%», 10 «Tarifa Exenta», 11 «Tarifa 0% sin derecho a crédito»; `IVA_RATE_PERCENTAGES` del SDK coincide |
| Identificación 05/06 (§1.3)                                   | Tipos 05/06 (DIMEX/NITE)                                                | Confirma 01–06 byte a byte en PDF Nota 4 y XSD                                                                                                                    |
| `CondicionVenta` del REP (§1.2)                               | REP enumera solo 09/11                                                  | Confirma: `REP_SALE_CONDITIONS` = {09, 11}                                                                                                                        |

### 9.2 Desacuerdos (posición de la auditoría vs posición de A1)

1. **Exoneración: enumeración `01–12, 99` (auditoría, §1.5) vs `01–11 + 99` (A1).**
   - Posición de la auditoría: «`TipoDocumentoEX1` (enum 01–12, 99)».
   - Evidencia de A1: `simpleType TipoExoneracionType` = 01…11 + 99 (**12** valores) en
     los 6 XSD que lo definen, ambos sets (comando en §12); PDF Nota 10.1 p. 74 = 12
     filas. El código `12` no existe en ninguna fuente.
   - Hipótesis: la auditoría contó 12 entradas y las interpretó como «01–12». Efecto:
     la constante `ExonerationType` del SDK incluye un `12` que ninguna fuente soporta.

2. **Tipos de comprobante: el «enum v4.3 obsoleto» de la clave sí coincide con el PDF;
   el catálogo compartido es el desplazado (auditoría §3.1 y §1.9 vs A1).**
   - Posición de la auditoría: el enum de `clave/types.ts` (05 → confirmación de
     aceptación … 09 → factura de exportación) es «v4.3 obsoleto» y debe reemplazarse
     por `DOCUMENT_TYPES` (05 = compra, 06 = exportación, 07 = REP, 08 = compra de pago,
     09 = gasto de viaje), tratando 08/09 como «documentos sin XSD publicado».
   - Evidencia de A1: el PDF de Anexos **v4.4** (inciso c), p. 65) asigna 05/06/07 =
     confirmaciones, 08 = compras, 09 = exportación, 10 = REP; «compra de pago» y
     «gasto de viaje» no existen en ninguna superficie (§6.1). El XSD no enumera tipos
     de comprobante, de modo que la auditoría no pudo contrastarlo ahí.
   - Posición de A1: aplicar §3.1 tal cual propagaría los valores desplazados de
     `shared/src/constants/document-types.ts` a la clave y **omitiría el código 10**
     (REP). La corrección va en dirección contraria a la recomendada.

### 9.3 Hallazgos nuevos (no cubiertos por la auditoría)

| ID  | Hallazgo                                                                                                                                                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| N1  | `UNITS_OF_MEASURE`: Ω `U+03A9` (SDK) vs `U+2126` (fuentes) — diff de byte invisible (§6.3).                                                                                                                                                                                    |
| N2  | Contradicción **entre fuentes oficiales**: PDF Nota 9 código 02 «Corrige monto» vs XSD 2026 «Corrige texto…» (§6.4).                                                                                                                                                           |
| N3  | Erratas oficiales en el XSD 2026 («ocumento», «contigencia») que generan diffs de descripción.                                                                                                                                                                                 |
| N4  | `HaciendaStatus`: caso oficial «RECIBIDO» vs minúsculas del SDK y comparación sin normalizar (§6.5).                                                                                                                                                                           |
| N5  | `HaciendaRejectionCode`: ningún catálogo en las superficies de Hacienda consultadas (§7).                                                                                                                                                                                      |
| N6  | Contradicción interna en el repo actual: `packages/sdk/schemas/codes.json` **ya contiene** el catálogo oficial de 10 tipos (clave `Nota3/TipoComprobanteDocumentoAsociado`, fuente: PDF de Anexos) mientras las constantes escritas a mano siguen con los 9 desplazados (§10). |
| N7  | 21 advertencias de mayúsculas/acentuación en descripciones y 15 descripciones del PDF en prosa continua (limitación metodológica, §4).                                                                                                                                         |

---

## 10. Apéndice — evidencia histórica del estado en `597a556` (fases 1a–3) por hallazgo

> **Este apéndice es evidencia histórica, no el estado actual del código.** Describe el
> árbol en el commit `597a556` (rama `feat/verify-signing-policy-digest`), tal como se
> leyó el 2026-10-14. Sus filas no se reescriben: donde el main corrigió después algo,
> la corrección está en §11, no aquí.

Estado verificado sobre `597a556` (no sobre el baseline):

| Hallazgo / grupo                                                                                                                                                                                                                                                                                                                               | Catálogo generado (`shared/src/generated/`)                                                        | Pareja en `table-map.mjs`                                                                             | Hueco documentado                 | Estado para A2                                                                                           |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Filas `coincide` con pareja: `PaymentMethod`, `SaleCondition`, `TaxCode`, `IvaRateCode`, `MensajeReceptorCode`, `SituationCode`, `IdentificationType`, `ProvinceCode`, `CURRENCY_CODES`, `DISCOUNT_CODES`, `OTHER_CHARGE_TYPES`, `EXONERATION_INSTITUTIONS`, `COMMERCIAL_CODE_TYPES` (código comercial), `TRANSACTION_TYPES` (tipoTransaccion) | ✔ 14 catálogos                                                                                     | ✔ 14 `exportName`                                                                                     | —                                 | **Cubierto**                                                                                             |
| Fila 1 — `DocumentTypeCode` (§6.1)                                                                                                                                                                                                                                                                                                             | ✘ (pero `codes.json` ya tiene el catálogo oficial de 10: `Nota3/TipoComprobanteDocumentoAsociado`) | Declara no-pareja («catálogo de la clave, no una enumeración del XSD»), sin abordar el desplazamiento | ✘                                 | **Abierto para A2** (contradicción interna N6)                                                           |
| Fila 10 — `ExonerationType` (§6.2)                                                                                                                                                                                                                                                                                                             | ✘ (`codes.json` sí tiene `TipoExoneracionType` con 12)                                             | Declara no-pareja («el XSD no contiene el 12»)                                                        | ✔ (etiqueta 06 en auditoría §1.5) | **Abierto**: el `12` y la etiqueta 06 siguen en las constantes                                           |
| Fila 11 — Ω (§6.3)                                                                                                                                                                                                                                                                                                                             | ✘                                                                                                  | Declara no-pareja («deriva de code point: U+03A9 vs U+2126»)                                          | ✔ (en `table-map.mjs`)            | **Abierto** en constantes; decisión ya documentada                                                       |
| Filas 13–15 — `REFERENCE_*` (§6.4)                                                                                                                                                                                                                                                                                                             | ✘ (`codes.json` generado solo del set 2024: 19/12)                                                 | Declara no-parejas («la revisión abril 2026…»)                                                        | ✔ (auditoría §2.4)                | Constantes **correctas** para 2026-11-01; sin pareja por diseño. **Abierto**: N2 (contradicción PDF↔XSD) |
| Fila 20 — XAdES (§6.6)                                                                                                                                                                                                                                                                                                                         | n/a                                                                                                | n/a                                                                                                   | ✔ (auditoría §1.10/§3.5)          | **En curso**: rama `feat/verify-signing-policy-digest`; constantes aún sin cambios                       |
| Fila 24 — `HaciendaStatus` (§6.5)                                                                                                                                                                                                                                                                                                              | ✘                                                                                                  | ✘                                                                                                     | ✘                                 | **Abierto** (N4)                                                                                         |
| Fila 21 — `HaciendaRejectionCode` (§7)                                                                                                                                                                                                                                                                                                         | ✘                                                                                                  | ✘                                                                                                     | ✘                                 | **Abierto** (N5): buscar el manual de la API o deprecar                                                  |

---

## 11. Reconciliación histórica de la revisión cf1db1e / 81c6e42

Esta sección conserva el delta histórico de esa revisión; no describe el main actual.
Una tabla de estado por hallazgo — ni más ni menos: la reauditoría de las fuentes (§§3–9)
es un trabajo aparte y no se repite aquí.

### 11.1 Procedencia de esta pasada

| Dato                      | Valor                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------- |
| Base revisada             | `cf1db1e4bde37498643f77c8259c0a29e51033a1`                                             |
| Cabeza revisada           | `81c6e42179320bbacaf5c74c6fe8973fd871159b`                                             |
| Naturaleza de la revisión | sólo lectura: no ejecutó merge, cierre ni edición de fuentes                           |
| Anexo oficial consultado  | 99 páginas, SHA-256 `6e093226b29b38c5c8de825f70c1b1cb8ed81e2f4a6eb0b3ff52708fc1eb2769` |

### 11.2 Estado por hallazgo

| Hallazgo                                   | Estado en el main vigente                                                                                                                                                                                                                                                                                                        | Evidencia                                                                                           |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Fila 1 — `DocumentTypeCode` (§6.1)         | **Resuelto.** El catálogo oficial de 10 tipos está en las constantes: FEC `08`, FEE `09`, REP `10` y las confirmaciones `05`–`07`. Los alias deprecados `COMPRA_PAGO` y `GASTO_VIAJE` se conservan publicados y apuntan a `08` y `09`                                                                                            | `shared/src/constants/document-types.ts` en `main`; PR #60 y #70                                    |
| Fila 10 — `ExonerationType` (§6.2)         | **Resuelto.** El código `12` ya no existe y el `06` es `SERVICIOS_TURISTICOS_ICT`; el alias heredado `TRANSITORIO_IX` apunta a `06`                                                                                                                                                                                              | `shared/src/constants/tax-codes.ts` en `main`; PR #60 y #70                                         |
| Fila 11 — `Ω` de `UNITS_OF_MEASURE` (§6.3) | **Resuelto.** La constante usa `U+2126` OHM SIGN (`e2 84 a6`), el mismo code point que el XSD y el PDF                                                                                                                                                                                                                           | `shared/src/constants/tax-codes.ts` en `main`                                                       |
| Fila 20 — `XADES_POLICY_*` (§6.6)          | **Resuelto.** El identificador es el oficial vigente (`.../xml-schemas/Resolución_General…pdf`) y el digest es el SHA-256 `DWxin1xWOeI8OuWQXazh4VjLWAaCLAA954em7DMh0h8=` del PDF de Anexos; el verificador nativo contrasta esa política                                                                                         | `shared/src/constants/xades-policy.ts` y `packages/sdk/src/signing/policy-oracle.spec.ts` en `main` |
| Filas 13–15 — `REFERENCE_*` (§6.4)         | **Sin cambio, por diseño.** Siguen siendo curaduría manual (sin pareja exacta con `codes.json` mientras el set vendorizado no traiga los códigos 13–16 y 19–20) y sus valores son los de la revisión 2026, obligatoria desde el 2026-11-01. La contradicción N2 entre el PDF y el XSD 2026 para el código `02` sigue **abierta** | `shared/src/constants/document-references.ts` en `main`; §6.4 y §9.3                                |
| Fila 24 — `HaciendaStatus` (§6.5)          | **Abierto (N4).** Ninguna superficie oficial consultada publica el catálogo de `ind-estado`; el único rastro sigue siendo el ejemplo de p. 98 (`"RECIBIDO"`), en mayúsculas                                                                                                                                                      | §7 y §13                                                                                            |
| Fila 21 — `HaciendaRejectionCode` (§7)     | **Abierto (N5).** La procedencia de los códigos de rechazo vive en el manual de la API REST, que no está entre las superficies de A1                                                                                                                                                                                             | §7 y §13                                                                                            |
| Generación de catálogos (A2)               | **En curso.** La extracción vive en `main` (`scripts/codes-extract/`, `pnpm spec:verify`); el árbol tipado generado, el candado de literales y el candado de deriva están en el PR #57, rebaseado sobre `main` y pendiente de revisión                                                                                           | PR #57; `docs/specs/a2-policy-catalog-readiness.md`                                                 |

Lo que **no** pudo reconciliarse con fuentes públicas, y por eso se declara en vez de
omitirse: la procedencia de los **códigos de estado y de rechazo** del API y la de los
**códigos de los endpoints** (N4 y N5). Ninguna de las superficies de §7 publica esos
catálogos; el contrato real vive en el manual de la API REST, que A1 no consultó.

### 11.3 Lo que este informe no afirma

- **No afirma elegibilidad de régimen**, ni total ni parcial. Un catálogo de códigos
  correcto no habilita un régimen fiscal ni sustituye la habilitación que publica
  Hacienda.
- **No constituye aceptación real por Hacienda.** Probar que el código coincide con las
  fuentes es una capa de validación distinta de que un comprobante sea aceptado (§ preamble).
- **No es precondición de la corrección acotada de la NC exacta (0.7).** La
  reconciliación documental y ese trabajo avanzan en paralelo y ninguno bloquea al otro.
- **No re-audita las fuentes.** Las filas de §§3–9 y del apéndice §10 siguen siendo las
  de la lectura del 2026-10-14 contra el anexo de 98 páginas; la diferencia de
  source-set con el anexo vigente de 99 páginas no está reconciliada.

---

## 12. Reproducibilidad

Con los archivos de §1.2 en el directorio de trabajo declarado, cada cita se reproduce
así (comandos ejecutados y verificados el 2026-10-14):

```sh
# PDF de Anexos — tabla de tipos de comprobante (hallazgo §6.1, p. 65)
pdftotext -f 65 -l 65 -layout "2024/v4.4/ANEXOS Y ESTRUCTURAS_V4.4.pdf" - \
  | grep -E 'Confirmación|compras|exportación|Recibo'

# PDF de Anexos — exoneración (§6.2, p. 74) y Nota 22 tipoTransaccion (p. 81)
pdftotext -f 74 -l 74 -layout "2024/v4.4/ANEXOS Y ESTRUCTURAS_V4.4.pdf" -
pdftotext -f 81 -l 81 -layout "2024/v4.4/ANEXOS Y ESTRUCTURAS_V4.4.pdf" -

# PDF de Anexos — único rastro de ind-estado (§6.5, p. 98)
pdftotext -f 98 -l 98 -layout "2024/v4.4/ANEXOS Y ESTRUCTURAS_V4.4.pdf" - | grep -o '"RECIBIDO"'

# XSD — enumeración de exoneración: 12 valores, sin el 12 (§6.2)
xmllint --xpath '//*[local-name()="simpleType"][@name="TipoExoneracionType"]
  /*[local-name()="restriction"]/*[local-name()="enumeration"]/@value' \
  "2024/v4.4/FacturaElectronica_V4.4.xsd"

# XSD — códigos de referencia: 12 (2024) vs 16 (2026) y REP 12 vs 17 (§6.4)
xmllint --xpath '//*[local-name()="simpleType"][@name="CodigoReferenciaType"]
  /*[local-name()="restriction"]/*[local-name()="enumeration"]/@value' \
  "2024/v4.4/FacturaElectronica_V4.4.xsd"
xmllint --xpath '//*[local-name()="simpleType"][@name="CodigoReferenciaType"]
  /*[local-name()="restriction"]/*[local-name()="enumeration"]/@value' \
  "2026/v4.4/ReciboElectronicoPago_V4.4.xsd"

# XSD — code point de Ω (§6.3): espera "e2 84 a6" = U+2126 OHM SIGN
grep -oP 'value="\x{2126}"' "2024/v4.4/FacturaElectronica_V4.4.xsd" | head -1 | hexdump -C
# SDK — code point de Ω (§6.3): espera "ce a9" = U+03A9 GREEK OMEGA
# (ruta relativa al checkout auditado, hermano de INDENTS/)
grep -oP '"\x{03A9}"' ../../hacienda-cr-a1-baseline/shared/src/constants/tax-codes.ts | head -1 | hexdump -C

# PDF de moneda — 168 códigos distintos (fila 12): imprime 168
pdftotext -layout "2024/v4.4/Codigodemoneda_V4.4.pdf" - | grep -oE '  [A-Z]{3}$' | sort -u | wc -l

# Catálogo de ubicación — provincias 1–7 (fila 6)
unrar e "2024/v4.4/Codificacionubicacion_V4.4.rar"   # luego: unzip -p <xlsx> xl/worksheets/sheet1.xml
```

Las páginas citadas corresponden a la paginación física del PDF (verificado: `pdftotext
-f 65` devuelve la tabla del inciso c)).

---

## 13. Supuestos no verificables con las superficies de A1

| Supuesto                                                                            | Superficie consultada                                                                                                        |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Cuál política XAdES está vigente hoy (URI/hash del SDK vs los ejemplos del Anexo 2) | PDF Anexos Anexo 2 (pp. 87–94), Resolución General, ambos sets XSD: ninguna publica un estado de vigencia                    |
| Catálogo completo de `ind-estado` y de causas de rechazo                            | Las 5 superficies de §7: solo el ejemplo de p. 98; el contrato real vive en el manual de la API REST, no provisto            |
| Significado oficial de «Compra de Pago» y «Gasto de Viaje» (filas 08/09 del SDK)    | PDF Anexos 98 pp. + 18 XSD: cero coincidencias                                                                               |
| Vigencia obligatoria de la revisión 2026-11-01                                      | Declarada por la auditoría previa a partir de comunicados (TRIBU-CR, KPMG, Gosocket, LLB); A1 solo compara bytes de los sets |

## Reanudación del 21 de octubre de 2026

La versión publicada vigente es 0.11.0 (`12a2fed`). El [informe de correcciones](open-pr-remediation.md) registra la reconciliación de los PRs pendientes y sus límites. Las citas y hashes históricos anteriores se conservan como evidencia, no como certificado de conformidad vigente.
