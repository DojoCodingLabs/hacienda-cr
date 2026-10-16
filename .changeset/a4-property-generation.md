---
"@dojocoding/hacienda-sdk": minor
---

A4 — generación basada en propiedades y validación XSD

Superficie pública nueva en el SDK: `parseDocumentXml(xml)` parsea un comprobante
v4.4 a su documento tipado (`{ rootElement, document }`) e invierte fielmente
los constructores: `build → parse → build` produce bytes idénticos, incluidos
los montos como `Money` y los campos opcionales ausentes.

Internamente (no publicado, bajo `src/`) quedan el generador arbitrario de
documentos, las propiedades de XSD/punto fijo/clave y el corpus dorado, que
pasan a formar parte de `pnpm verify`.
