## Why

Hoy el SDK tiene 7 constructores de documentos y un validador XSD, pero **no hay una sola prueba que demuestre que el espacio completo de documentos produce XML conforme** ni que la clave de 50 dígitos se puede deshacer. Las pruebas existentes son por ejemplo: documentos fijos escritos a mano y una comprobación de 5 vs 6 decimales. Un ejemplo fijo no cubre tarifas, exoneraciones, descuentos múltiples, medios de pago, moneda extranjera ni notas que referencian documentos previos, y **no existe forma de leer un XML de vuelta a un documento**, así que no hay manera de comprobar que la serialización es estable.

El brief de A4 exige cerrar esa brecha con un generador arbitrario y tres propiedades aseveradas sobre _todo_ lo que produce, más un corpus dorado versionado que haga ruidosa cualquier regresión silenciosa de la salida.

## What Changes

- **Generador arbitrario de documentos estructuralmente válidos** (fast-check) que cubre los siete tipos de documento (FE, TE, NC, ND, FEC, FEE, REP), cada tarifa de impuesto, exoneraciones parciales/totales, múltiples descuentos, hasta cuatro medios de pago, moneda extranjera con `tipoCambio` y notas de crédito/débito que referencian un documento previo.
- **Tres propiedades aseveradas sobre cada caso generado**:
  1. El XML generado **valida contra el XSD oficial** (`validateDocumentXml`), sin excepciones.
  2. **Construir → parsear → construir es un punto fijo**: serializar, leer de vuelta y volver a serializar produce bytes idénticos.
  3. La **clave de 50 dígitos se descompone de vuelta** en exactamente los insumos normalizados que la produjeron, para cada entrada válida, incluidas fechas límite (29/02, 31/12) y el valor máximo de secuencia (`9999999999`).
- **Nuevo parser XML → documento en el SDK** (superficie pública). La propiedad 2 es imposible sin él: hoy no existe ningún parser XML en el repo, solo el serializador. El parser es también la pieza que permite a un consumidor leer un comprobante recibido.
- **Corpus dorado** versionado en el repo: un documento por cada tipo con su XML esperado. Cualquier cambio que altere la salida debe actualizar conscientemente el archivo dorado; las regresiones silenciosas de salida se vuelven ruidosas.
- **Las tres propiedades corren en CI** dentro del ya existente `pnpm test:properties` (integrado en `pnpm verify`), sobre miles de casos generados por propiedad.

**BREAKING**: ninguna. El cambio **agrega** superficie (el parser) sin modificar tipos publicados.

## Capabilities

### New Capabilities

- `document-generation/property-based`: el generador arbitrario y las tres propiedades aseveradas sobre el espacio de documentos (conformidad XSD, punto fijo de serialización y descomposición de la clave), ejecutadas en CI sobre miles de casos. Sus requirements definen qué cubre el generador, que el XML generado valida siempre contra el XSD, que construir→parsear→construir es bytes idénticos, que la clave se deshace en sus insumos y que el generador no produce documentos inválidos (evita que la propiedad XSD pase por vacuidad).
- `document-generation/xml-roundtrip`: el parser público XML → documento que invierte los constructores, con el contrato de fidelidad (bytes idénticos al reconstruir, montos preservados como `Money`, ausencia de campos opcionales preservada) y el manejo tipado de XML malformado o de raíz desconocida.
- `document-generation/golden-corpus`: el corpus dorado versionado —un documento por tipo con su XML esperado—, su cobertura de los siete tipos, el procedimiento de regeneración consciente y la no determinación de la firma (el corpus es de XML sin firmar; la firma se verifica en su propio cambio).

### Modified Capabilities

Dejar vacío: ninguna capacidad existente cambia de requisitos. El corpus, el generador y las propiedades son nuevos; el validador XSD (`validateDocumentXml`) y los constructores ya existen y se consumen sin modificarse.

## Impact

- **API pública**: el SDK agrega un parser XML → documento (`@dojocoding/hacienda-sdk`, bump `minor`). No hay cambios de tipos publicados ni de comportamiento de los constructores.
- **Código afectado**: `packages/sdk/src/` (nuevo parser y su inversión de los constructores), generadores en `packages/sdk/src/__fixtures__/`, suites `*.properties.spec.ts`, y el corpus dorado bajo `packages/sdk/src/`.
- **Scripts/CI**: `scripts/run-properties-tests.mjs` gana un tercer target (el suite de A4); el corpus y las propiedades quedan cubiertos por `pnpm verify`, donde la conformidad XSD es offline (`xmllint-wasm`, `--nonet`).
- **Dependencias**: sin dependencias nuevas de runtime (`fast-xml-parser` ya es dependencia del SDK) ni de desarrollo (`fast-check` ya está declarado).
- **Tests/Changeset**: se añade un Changeset `minor` para el SDK por la superficie nueva; el corpus y las propiedades son internos al repo y no se publican (`files` del paquete limita a `dist`/`examples`).
- **Límites de seguridad**: el parser debe configurarse sin resolución de entidades externas (XXE) desde el primer commit; el endurecimiento y fuzzing de entradas hostiles pertenecen al cambio A6, y la verificación criptográfica de firmas al cambio A5.
- **Validación**: `openspec validate add-a4-property-generation` y `openspec validate --specs` deben pasar.
