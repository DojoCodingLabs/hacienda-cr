---
"@dojocoding/hacienda-shared": major
"@dojocoding/hacienda-sdk": major
"@dojocoding/hacienda-cli": minor
"@dojocoding/hacienda-mcp": minor
---

A2 — catálogos y política de firma corregidos contra las fuentes primarias

BREAKING (catálogos): `DocumentTypeCode` pasa al catálogo oficial de 10 tipos
(ANEXOS V4.4, p. 65 inciso c; `Nota3/TipoComprobanteDocumentoAsociado`), se
elimina el valor «12» de `ExonerationType` (enum XSD `TipoExoneracionType`
01–11 + 99) y `UNITS_OF_MEASURE` unifica el homógrafo `Ω` a `U+2126` (OHM
SIGN). Migración de claves de `DocumentTypeCode`:

| Código | Clave anterior (eliminada o reasignada) | Clave nueva                       |
| ------ | --------------------------------------- | --------------------------------- |
| 05     | `FACTURA_ELECTRONICA_COMPRA`            | `CONFIRMACION_ACEPTACION`         |
| 06     | `FACTURA_ELECTRONICA_EXPORTACION`       | `CONFIRMACION_ACEPTACION_PARCIAL` |
| 07     | `RECIBO_ELECTRONICO_PAGO`               | `CONFIRMACION_RECHAZO`            |
| 08     | `COMPRA_PAGO` (eliminada)               | `FACTURA_ELECTRONICA_COMPRA`      |
| 09     | `GASTO_VIAJE` (eliminada)               | `FACTURA_ELECTRONICA_EXPORTACION` |
| 10     | —                                       | `RECIBO_ELECTRONICO_PAGO`         |

BREAKING (firma): la política XAdES-EPES publicada pasa de la Resolución
v4.1 con SHA-1 a la Resolución General vigente con `ds:DigestMethod` SHA-256 y
digest `DWxin1xWOeI8OuWQXazh4VjLWAaCLAA954em7DMh0h8=` (Anexo 2, p. 87). El
XAdES-EPES emitido cambia; los consumidores que validen firmas deben aceptar
la política nueva.

Las correcciones de catálogo se declaran en el registro de parejas
(`scripts/codes-generate/table-map.mjs`) con cita al informe de conformidad
(`docs/conformity-report.md` §6.1–§6.3) y a su fuente primaria, y se reportan
en cada `pnpm spec:generate`.
