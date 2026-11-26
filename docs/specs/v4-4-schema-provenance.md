# Procedencia de los sets XSD v4.4

Registro canónico de qué publica cada superficie oficial de Hacienda para la
versión 4.4, qué bytes están vendorizados en `packages/sdk/schemas/` y qué
autoridad tiene cada set. Complementa el inventario mecánico de
[`manifest.json`](../../packages/sdk/schemas/manifest.json) y la semántica de
campos de [`packages/sdk/schemas/README.md`](../../packages/sdk/schemas/README.md).

El registro deja visible la evidencia por superficie y las fuentes primarias que
fijan la autoridad. Desde el 2026-11-26 el manifiesto declara
`currentSet: "2026/v4.4"` (obligatorio desde el 2026-11-01) y conserva
`2024/v4.4` en `sets[]` como set previo; ver [Autoridad declarada](#autoridad-declarada).
Los bytes vendorizados no cambiaron.

## Superficies consultadas

Comprobación inicial: **2026-10-23** (`2026-10-23T17:07:45Z`), sin credenciales,
desde una red residencial. Los identificadores coinciden con `surfaces[]` del
manifiesto.

| `id`  | Tipo               | URL                                                                                                             | Uso                                                                             |
| ----- | ------------------ | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `atv` | `atv-page`         | `https://atv.hacienda.go.cr/ATV/ComprobanteElectronico/frmAnexosyEstructuras.aspx` → `docs/esquemas/2024/v4.4/` | Enumeración de versiones; origen del set `2024/v4.4` (auxiliares incluidos)     |
| `ovi` | `known-file-probe` | `https://www.hacienda.go.cr/docs/`                                                                              | Sondeo de los nueve XSD por nombre; origen del set `2026/v4.4`                  |
| `cdn` | `cdn-xml-schemas`  | `https://cdn.comprobanteselectronicos.go.cr/xml-schemas/`                                                       | Documentos auxiliares y política de firma                                       |
| W3C   | —                  | `https://www.w3.org/TR/2002/REC-xmldsig-core-20020212/`                                                         | `xmldsig-core-schema.xsd`, importado por los XSD de Hacienda; fuera de los sets |

La página ATV enumera, para la v4.4, únicamente enlaces bajo
`docs/esquemas/2024/v4.4/`. No publica un set `2026/v4.4` ni una revisión de
abril de 2026 en esa superficie.

Nueva comprobación: **2026-11-26** (`2026-11-26T20:16:21Z`), sin credenciales.

- OVi: los nueve XSD de `https://www.hacienda.go.cr/docs/<Archivo>_V4.4.xsd`
  responden 200 con el mismo `Last-Modified` y los mismos SHA-256 y tamaños que
  `2026/v4.4/` (sin discrepancias; tabla de abajo).
- ATV: la página `frmAnexosyEstructuras.aspx` sigue respondiendo 200 y listando
  los enlaces `docs/esquemas/2024/v4.4/…`, pero **cada archivo responde 404**
  (comprobados los nueve XSD, el PDF de Anexos, `Codigodemoneda_V4.4.pdf` y
  `Codificacionubicacion_V4.4.rar`). ATV es el portal heredado que TRIBU-CR
  sustituyó; sus copias tenían `Last-Modified` 2025-09-09, anterior a la
  revisión de abril de 2026.
- CDN: la Resolución General (política de firma) responde 200 y `spec:check`
  confirma su hash.
- `Codigodemoneda_V4.4.pdf` también se publica en OVi
  (`https://www.hacienda.go.cr/docs/Codigodemoneda_V4.4.pdf`, `Last-Modified`
  Fri, 04 Jul 2025 20:28:54 GMT) con bytes idénticos al vendorizado en
  `2024/v4.4/` (`55d1e42c…9072`, 160787 bytes). OVi no publica
  `Codificacionubicacion_V4.4.rar` (404); publica en su lugar
  `Codificacionubicacion_V4.4.xlsx`, no vendorizado.

## Autoridad declarada

- **`2026/v4.4` (OVi) es el set vigente (`currentSet`) desde el 2026-11-01.** Lo
  establecen dos fuentes primarias de Hacienda (tabla siguiente):
  - El comunicado "Actualización de los Anexos y Estructuras versión 4.4 y
    validación de comprobantes electrónicos" (`Last-Modified` 2026-04-21)
    enumera las cédulas jurídicas alfanuméricas ("se permite el uso de cédulas
    jurídicas alfanuméricas para Sociedades, conforme a las disposiciones del
    Registro Nacional, cuando este así lo comunique"), los códigos 13–17 de la
    nota 9 (16: referencia a un comprobante electrónico rechazado; 17: pago en
    un Recibo Electrónico de Pago) y los códigos 19–20 de la nota 10, y dispone:
    "Los nuevos códigos deberán implementarse en los sistemas de emisión de
    comprobantes electrónicos a partir del 1.º de noviembre del presente año"
    y "El ajuste ya se encuentra disponible tanto en el ambiente de pruebas
    (STAG), como en el ambiente de producción". Remite a "el portal público de
    la Oficina Virtual OVi de TRIBUCR", que enlaza los XSD servidos bajo
    `https://www.hacienda.go.cr/docs/`.
  - El PDF oficial de Anexos y Estructuras v4.4 que publica OVi lleva la
    "Bitácora de Ajustes al 22/04/2026" (alfanuméricos en la identificación de
    personas jurídicas y los códigos nuevos).
  - Los nueve XSD que sirve OVi hoy son byte a byte los de `2026/v4.4/`; ninguno
    coincide con `2024/v4.4/`.
- **`2024/v4.4` (ATV) es el set previo.** Se conserva en `sets[]` y en disco
  para comparación histórica y como fuente de `codes.json` (`codesSet`), que
  necesita sus auxiliares vendorizados. Ya no es descargable: ATV responde 404
  por cada archivo.
- El SDK embebe `2026/v4.4` para la validación en runtime
  (`packages/sdk/src/xml/schemas/index.ts`), coherente con `currentSet`; lo
  fija `packages/sdk/src/xml/schemas/schema-authority.spec.ts`.
- El cambio del puntero se hizo con el mecanismo previsto: un ensayo de
  `spec:update --set 2026/v4.4` sobre una copia del árbol (0 archivos escritos;
  `nextSet` eliminado; `downloadedAt` y `lastModified` del set 2026
  registrados; `spec:verify` OK) produjo el mismo manifiesto que se commitea,
  salvo el orden de `files[]` y los campos informativos `codesSet`,
  `effectiveFrom` y `authority`, añadidos a mano.

### Fuentes primarias de la autoridad

Ninguno de los dos PDF está vendorizado; sus hashes quedan también en
`sets[].authority` del manifiesto.

| Documento                       | URL                                                                                 | `Last-Modified`               | `sha256`                                                           | `bytes` | `checkedAt` |
| ------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------ | ------- | ----------- |
| Comunicado de actualización 4.4 | `https://www.hacienda.go.cr/docs/ActualizacionAnexosyEstructurasVersion4.4CEv2.pdf` | Tue, 21 Apr 2026 20:37:14 GMT | `f6b8b2272507966bda88b7e88016fdd06919740d7693288daebe24c5f03b5c66` | 206986  | 2026-11-26  |
| Anexos y Estructuras v4.4 (OVi) | `https://www.hacienda.go.cr/docs/ANEXOS_Y_ESTRUCTURAS_V4.4.pdf`                     | Wed, 13 May 2026 15:26:07 GMT | `6e093226b29b38c5c8de825f70c1b1cb8ed81e2f4a6eb0b3ff52708fc1eb2769` | 1243035 | 2026-11-26  |

El PDF de Anexos de OVi difiere en bytes del vendorizado en `2024/v4.4/`
(`2e36bd11…4305`, 1508073 bytes). Vendorizarlo como auxiliar de `2026/v4.4`
(junto con la ubicación en `.xlsx`) y regenerar `codes.json` desde ese set
queda como trabajo pendiente; hasta entonces `codesSet` sigue en `2024/v4.4`.

## Evidencia por set y archivo

`checkedAt` es la fecha de la descarga y el hash que se registran. `rol` describe
la función del archivo en el repositorio, no una validación de Hacienda.

### Set `2024/v4.4` — superficie `atv`

| `set`       | `surface` | `url`                                                                                                                  | `lastModified`                | `sha256`                                                           | `bytes` | `checkedAt` | `rol`                                     |
| ----------- | --------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------ | ------- | ----------- | ----------------------------------------- |
| `2024/v4.4` | `atv`     | `https://atv.hacienda.go.cr/ATV/ComprobanteElectronico/docs/esquemas/2024/v4.4/FacturaElectronica_V4.4.xsd`            | Tue, 09 Sep 2025 15:24:46 GMT | `d384afef665573606f6499b2182d6070850ada8c93bc40fa7f0f3901a25b9cc8` | 118624  | 2026-10-23  | previo; ATV responde 404 desde 2026-11-26 |
| `2024/v4.4` | `atv`     | `https://atv.hacienda.go.cr/ATV/ComprobanteElectronico/docs/esquemas/2024/v4.4/FacturaElectronicaCompra_V4.4.xsd`      | Tue, 09 Sep 2025 15:24:46 GMT | `ae1e5b782b568d225b34e046858012ed808b2587fc5b1b5161fa707b4bdd8253` | 96205   | 2026-10-23  | previo; ATV responde 404 desde 2026-11-26 |
| `2024/v4.4` | `atv`     | `https://atv.hacienda.go.cr/ATV/ComprobanteElectronico/docs/esquemas/2024/v4.4/FacturaElectronicaExportacion_V4.4.xsd` | Tue, 09 Sep 2025 15:24:46 GMT | `d710032a05cd3d41272c0cceb8130b4add37ce139b491dbaa7bd6a59163809bd` | 100786  | 2026-10-23  | previo; ATV responde 404 desde 2026-11-26 |
| `2024/v4.4` | `atv`     | `https://atv.hacienda.go.cr/ATV/ComprobanteElectronico/docs/esquemas/2024/v4.4/MensajeHacienda_V4.4.xsd`               | Tue, 09 Sep 2025 15:24:46 GMT | `411d858b0e2e293322910a0d4204243d34a874a6e7939c7c492721246900f390` | 7790    | 2026-10-23  | previo; ATV responde 404 desde 2026-11-26 |
| `2024/v4.4` | `atv`     | `https://atv.hacienda.go.cr/ATV/ComprobanteElectronico/docs/esquemas/2024/v4.4/MensajeReceptor_V4.4.xsd`               | Tue, 09 Sep 2025 15:24:46 GMT | `37bc1ffcf06a66a5a0b63b2908740dbd8f63fe0a4120426ea6a957862355c1c3` | 6555    | 2026-10-23  | previo; ATV responde 404 desde 2026-11-26 |
| `2024/v4.4` | `atv`     | `https://atv.hacienda.go.cr/ATV/ComprobanteElectronico/docs/esquemas/2024/v4.4/NotaCreditoElectronica_V4.4.xsd`        | Tue, 09 Sep 2025 15:24:48 GMT | `9af7dff4ee0c2787f8fc30cb63aef37b574c96846007be327d442e30e0ddf804` | 121916  | 2026-10-23  | previo; ATV responde 404 desde 2026-11-26 |
| `2024/v4.4` | `atv`     | `https://atv.hacienda.go.cr/ATV/ComprobanteElectronico/docs/esquemas/2024/v4.4/NotaDebitoElectronica_V4.4.xsd`         | Tue, 09 Sep 2025 15:24:48 GMT | `ac2c63f93602502af22980a81f26032c6a561ed3a8c516ac28184ce1433b7b61` | 121934  | 2026-10-23  | previo; ATV responde 404 desde 2026-11-26 |
| `2024/v4.4` | `atv`     | `https://atv.hacienda.go.cr/ATV/ComprobanteElectronico/docs/esquemas/2024/v4.4/ReciboElectronicoPago_V4.4.xsd`         | Tue, 09 Sep 2025 15:24:48 GMT | `81d7be9cd9fc3792c2bb3822079784b8d62a3e643e708df0c99bc67d1edcbdfa` | 40388   | 2026-10-23  | previo; ATV responde 404 desde 2026-11-26 |
| `2024/v4.4` | `atv`     | `https://atv.hacienda.go.cr/ATV/ComprobanteElectronico/docs/esquemas/2024/v4.4/TiqueteElectronico_V4.4.xsd`            | Tue, 09 Sep 2025 15:24:48 GMT | `cda1c7dd97f9a235111c29948f05d7893864663cd73792fd3b51e3dae582cfdb` | 116845  | 2026-10-23  | previo; ATV responde 404 desde 2026-11-26 |

### Set `2026/v4.4` — superficie `ovi`

| `set`       | `surface` | `url`                                                                    | `lastModified`                | `sha256`                                                           | `bytes` | `checkedAt` | `rol`                  |
| ----------- | --------- | ------------------------------------------------------------------------ | ----------------------------- | ------------------------------------------------------------------ | ------- | ----------- | ---------------------- |
| `2026/v4.4` | `ovi`     | `https://www.hacienda.go.cr/docs/FacturaElectronica_V4.4.xsd`            | Wed, 22 Apr 2026 21:01:06 GMT | `926ba81325bc21102755bd8e4e570a63caaca086e680a877c3a6d15d6ee8a62f` | 119689  | 2026-11-26  | vigente (`currentSet`) |
| `2026/v4.4` | `ovi`     | `https://www.hacienda.go.cr/docs/FacturaElectronicaCompra_V4.4.xsd`      | Wed, 22 Apr 2026 17:14:37 GMT | `57e4cedb12d5045884670ff2e4795d2027e69b96d45752f60cd1a1930e2768a3` | 97300   | 2026-11-26  | vigente (`currentSet`) |
| `2026/v4.4` | `ovi`     | `https://www.hacienda.go.cr/docs/FacturaElectronicaExportacion_V4.4.xsd` | Wed, 22 Apr 2026 17:14:36 GMT | `e571d8296bb74e86cb9ef7889601844c61ac50bedca90aa8d52badf15198242e` | 101881  | 2026-11-26  | vigente (`currentSet`) |
| `2026/v4.4` | `ovi`     | `https://www.hacienda.go.cr/docs/MensajeHacienda_V4.4.xsd`               | Wed, 22 Apr 2026 17:10:43 GMT | `b2606156042b7aa7b7f7f61945f0ff1323661b43b5a1489ad5eafad1c52fd25e` | 7799    | 2026-11-26  | vigente (`currentSet`) |
| `2026/v4.4` | `ovi`     | `https://www.hacienda.go.cr/docs/MensajeReceptor_V4.4.xsd`               | Wed, 22 Apr 2026 17:15:30 GMT | `b883e3a9321eadf2ccc1a9dc853d9e3bd483918dcd6e2152d902ddf2f244365f` | 6564    | 2026-11-26  | vigente (`currentSet`) |
| `2026/v4.4` | `ovi`     | `https://www.hacienda.go.cr/docs/NotaCreditoElectronica_V4.4.xsd`        | Wed, 22 Apr 2026 17:15:30 GMT | `b7ed3347c5599e78e5683d9ae83842695ab9497e173df9cd3be8d77c0851f556` | 123011  | 2026-11-26  | vigente (`currentSet`) |
| `2026/v4.4` | `ovi`     | `https://www.hacienda.go.cr/docs/NotaDebitoElectronica_V4.4.xsd`         | Wed, 22 Apr 2026 17:11:58 GMT | `3709389ccc434fb1ef4571079b1a628654fa04f07c1f3f1044b2416ba12eb7ff` | 123029  | 2026-11-26  | vigente (`currentSet`) |
| `2026/v4.4` | `ovi`     | `https://www.hacienda.go.cr/docs/ReciboElectronicoPago_V4.4.xsd`         | Wed, 22 Apr 2026 17:14:36 GMT | `86e3aa5f0615b757a3b2e9c300973d573ac321f76adba7b4b05e59d854da82b7` | 41655   | 2026-11-26  | vigente (`currentSet`) |
| `2026/v4.4` | `ovi`     | `https://www.hacienda.go.cr/docs/TiqueteElectronico_V4.4.xsd`            | Wed, 22 Apr 2026 17:11:58 GMT | `d7783baf818f316596d0b58b17481be689595982a248d98102d707f72967ae6e` | 117940  | 2026-11-26  | vigente (`currentSet`) |

### Auxiliares y dependencia W3C

| `set`       | `surface` | `url`                                                                                                                                                                          | `lastModified`                | `sha256`                                                           | `bytes` | `checkedAt` | `rol`                                                         |
| ----------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- | ------------------------------------------------------------------ | ------- | ----------- | ------------------------------------------------------------- |
| `2024/v4.4` | `atv`     | `https://atv.hacienda.go.cr/ATV/ComprobanteElectronico/docs/esquemas/2024/v4.4/ANEXOS%20Y%20ESTRUCTURAS_V4.4.pdf`                                                              | Tue, 09 Sep 2025 21:38:46 GMT | `2e36bd1101bbcabbb391ab1ec8ffc3773b93031341c7d98a05a5d0f0887d4305` | 1508073 | 2026-10-23  | auxiliar del set previo (`codesSet`); cita del Anexo 2        |
| `2024/v4.4` | `atv`     | `https://atv.hacienda.go.cr/ATV/ComprobanteElectronico/docs/esquemas/2024/v4.4/Codigodemoneda_V4.4.pdf`                                                                        | Wed, 20 Nov 2024 20:13:04 GMT | `55d1e42c2f103fc1471d3f1083b954fe3a05012de7d6e224075f93ef9c6a9072` | 160787  | 2026-10-23  | auxiliar del set previo (`codesSet`); catálogo de monedas     |
| `2024/v4.4` | `atv`     | `https://atv.hacienda.go.cr/ATV/ComprobanteElectronico/docs/esquemas/2024/v4.4/Codificacionubicacion_V4.4.rar`                                                                 | Fri, 22 Nov 2024 16:58:50 GMT | `9772345b05f784d0fc6774f0a2429d89b2867897e22e07b31a0d173549e364f1` | 299616  | 2026-10-23  | auxiliar del set previo (`codesSet`); catálogo de ubicaciones |
| `2024/v4.4` | `cdn`     | `https://cdn.comprobanteselectronicos.go.cr/xml-schemas/Resoluci%C3%B3n_General_sobre_disposiciones_t%C3%A9cnicas_comprobantes_electr%C3%B3nicos_para_efectos_tributarios.pdf` | Wed, 08 Jan 2025 21:29:12 GMT | `0d6c629f5c5639e23c3ae5905dace1e158cb5806822c003de787a6ec3321d21f` | 163479  | 2026-10-23  | política de firma (`policy.sourceSurface: cdn`)               |
| `null`      | W3C       | `https://www.w3.org/TR/2002/REC-xmldsig-core-20020212/xmldsig-core-schema.xsd`                                                                                                 | Fri, 08 Feb 2002 20:33:29 GMT | `35cf8197da812c85e40d57891b35c94187569ed474a2dac813ce5090dafcd35c` | 10293   | 2026-10-23  | dependencia W3C; no pertenece a ningún set                    |

Todos los hashes y tamaños de las tres tablas coinciden con las entradas
correspondientes de `manifest.json` (verificado el 2026-10-23 y, para el set
`2026/v4.4`, de nuevo el 2026-11-26 contra la superficie).

## Divergencia entre sets

Los nueve XSD difieren de bytes entre `2024/v4.4` y `2026/v4.4`. Cada archivo
coincide con su propia superficie; **no es un error de vendorización**. Las
diferencias de restricciones observadas son:

| Archivo                                  | Difieren bytes | Diferencias observadas                                                                                                                                                                            |
| ---------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FacturaElectronica_V4.4.xsd`            | Sí             | `ClaveType`: `\d{50,50}` → `[a-zA-Z0-9]{50,50}`; `TipoDocReferenciaType` añade 19–20; `CodigoReferenciaType` añade 13–16; anotación `nota de crédito electrónica` → `Nota de crédito electrónica` |
| `FacturaElectronicaCompra_V4.4.xsd`      | Sí             | Mismas diferencias que la FE, más líneas en blanco de formato                                                                                                                                     |
| `FacturaElectronicaExportacion_V4.4.xsd` | Sí             | Mismas diferencias que la FE, más líneas en blanco de formato                                                                                                                                     |
| `MensajeHacienda_V4.4.xsd`               | Sí             | Solo `ClaveType`                                                                                                                                                                                  |
| `MensajeReceptor_V4.4.xsd`               | Sí             | Solo `ClaveType`                                                                                                                                                                                  |
| `NotaCreditoElectronica_V4.4.xsd`        | Sí             | Mismas diferencias que la FE, más líneas en blanco de formato                                                                                                                                     |
| `NotaDebitoElectronica_V4.4.xsd`         | Sí             | Mismas diferencias que la FE, más líneas en blanco de formato                                                                                                                                     |
| `ReciboElectronicoPago_V4.4.xsd`         | Sí             | Mismas diferencias que la FE, más una enumeración adicional: `CodigoReferenciaType` 17 (`Pago a comprobante electrónico`), más líneas en blanco de formato                                        |
| `TiqueteElectronico_V4.4.xsd`            | Sí             | Mismas diferencias que la FE, más líneas en blanco de formato                                                                                                                                     |

Resumen de restricciones:

- **Clave alfanumérica** en los nueve XSD: el patrón deja de exigir solo dígitos,
  mantiene longitud fija 50.
- **Tipos de documento de referencia 19–20** en FE, FEC, FEE, NC, ND, REP y TE:
  19 = Factura Electrónica de Exportación, 20 = Recibo Electrónico de Pago.
- **Códigos de referencia 13–16** en los mismos siete XSD: anula por error
  material, corrige monto, sustituye por error material y sustituye rechazado.
  REP añade además 17 (pago a comprobante electrónico).
- **Capitalización de una anotación** en esos siete XSD: no cambia validación.
- **Líneas en blanco** en seis XSD: diferencia de formato, sin efecto semántico.

Los XSD de Hacienda no se editan para acomodar salida inválida. Las
restricciones de `2026/v4.4` son las vigentes; el SDK ya las implementa (clave
con letras solo en el segmento del contribuyente, códigos 13–17 y 19–20).

## Decisión cerrada: estatus de `2026/v4.4` (2026-11-26)

La decisión que dejó abierta el registro inicial (#118) queda resuelta con las
fuentes primarias de [Autoridad declarada](#autoridad-declarada):

- **¿`nextSet` y `effectiveFrom: "2026-11-01"`?** La fecha es la del comunicado
  de Hacienda y ya pasó: `2026/v4.4` es `currentSet`, `nextSet` se omite y la
  fecha queda como `sets[].effectiveFrom`.
- **¿El build del SDK embebe `2026/v4.4`?** Sí, y ahora coincide con la
  autoridad declarada.
- **¿La documentación debe afirmar que la revisión de abril de 2026 es
  obligatoria?** Sí: obligatoria desde el 2026-11-01 (disponible en STAG y
  producción desde abril).
- **¿Re-vendorizar desde ATV cuando publique la revisión?** No aplica: ATV es
  el portal heredado y ya no sirve los archivos. La superficie de referencia es
  OVi (`https://www.hacienda.go.cr/docs/`).

Que ATV nunca publicara `2026/v4.4` no es evidencia en contra: el comunicado
remite expresamente a OVi.

## Verificación reproducible

Los comandos son de solo lectura y no requieren credenciales. Ejemplo con un
archivo; se repite para cada nombre de las tablas.

```sh
# 1. Validador de la superficie (fecha de publicación observable)
curl -sSI -L "https://atv.hacienda.go.cr/ATV/ComprobanteElectronico/docs/esquemas/2024/v4.4/FacturaElectronica_V4.4.xsd"

# 2. Bytes publicados y su identidad
curl -sS -L -o /tmp/FacturaElectronica_V4.4.xsd \
  "https://atv.hacienda.go.cr/ATV/ComprobanteElectronico/docs/esquemas/2024/v4.4/FacturaElectronica_V4.4.xsd"
sha256sum /tmp/FacturaElectronica_V4.4.xsd
wc -c < /tmp/FacturaElectronica_V4.4.xsd

# 3. Contraste con lo vendorizado
sha256sum packages/sdk/schemas/2024/v4.4/FacturaElectronica_V4.4.xsd
```

Para comparar el contenido de los dos sets hay que normalizar el fin de línea:
los XSD usan terminadores CR o CRLF según el archivo, y un `diff` directo
reportaría diferencias de formato.

```sh
diff -u \
  <(tr '\r' '\n' < packages/sdk/schemas/2024/v4.4/FacturaElectronica_V4.4.xsd) \
  <(tr '\r' '\n' < packages/sdk/schemas/2026/v4.4/FacturaElectronica_V4.4.xsd)
```

`checkedAt` se registra en UTC. El `Last-Modified` es el que devuelve la
superficie en el momento de la comprobación; un cambio de ese valor no implica
por sí solo un cambio de bytes.

## Actualización de la evidencia

- Cada comprobación nueva actualiza `checkedAt` y el valor observado
  (`lastModified`, `sha256`, `bytes`) de la fila afectada.
- El valor anterior no se borra: se anota en la tabla de historial con la fecha
  en que estuvo vigente, para que un cambio de bytes sea auditable.
- Si una superficie deja de servir un archivo o cambia su nombre, se registra la
  fila como retirada y se enlaza el cambio que adoptó la decisión.
- Un cambio de bytes real exige revisar `manifest.json`, el set embebido y las
  pruebas de conformidad en el mismo cambio; este registro no los actualiza por
  su cuenta.

### Historial de evidencia

| Fecha      | Archivo o campo             | Valor anterior                         | Valor nuevo                                                             | Motivo                                                  |
| ---------- | --------------------------- | -------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------- |
| 2026-10-23 | Todos                       | —                                      | Valores de las tablas de arriba                                         | Registro inicial                                        |
| 2026-11-26 | Nueve XSD `2026/v4.4` (OVi) | `checkedAt` 2026-10-23                 | `checkedAt` 2026-11-26; `Last-Modified`, `sha256` y `bytes` sin cambios | Nueva comprobación antes de declarar `currentSet`       |
| 2026-11-26 | Archivos `2024/v4.4` (ATV)  | 200, bytes idénticos                   | 404 en la superficie; bytes vendorizados sin cambios                    | ATV retirado por TRIBU-CR                               |
| 2026-11-26 | `currentSet` / `nextSet`    | `2024/v4.4` / `2026/v4.4` (2026-11-01) | `2026/v4.4` / omitido                                                   | Comunicado de Hacienda; obligatoriedad desde 2026-11-01 |
