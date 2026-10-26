# Design: add-codes-extraction

## Context

Los XSD del `currentSet` (`packages/sdk/schemas/2024/v4.4/`, 9 archivos)
contienen ~2900 enumeraciones en las dos formas de Hacienda: `xs:simpleType`
nombrado (~90 tipos) y `xs:element` con `xs:simpleType` anónimo (p. ej. los
dos `TipoIdentificacion*` de `MensajeHacienda`). El manifiesto ya declara el
set vigente y `spec:verify` ya gatea la integridad de los vendorizados.
`scripts/` es ESM Node puro sin dependencias de runtime (`spec-watch` parsea
HTML a mano); el SDK consume `fast-xml-parser`/`@xmldom/xmldom` pero eso no
aplica a los scripts de repo. Ver proposal.md para el motivo.

## Goals / Non-Goals

**Goals:**

- Extracción determinista y offline de tablas de códigos a
  `packages/sdk/schemas/codes.json`.
- Cobertura de ambas formas de enumeración con claves no colisionantes.
- Comparación bytewise de códigos; normalización mínima solo en descripciones.
- Artefacto commiteado, regenerable, con tests offline.

**Non-Goals:**

- Consumo por el SDK (helper, tipos públicos, validación de facturas).
- Integración con `pnpm verify` (gate), `spec:update` o el workflow
  `spec-drift`. Único contacto con `spec:verify`: ampliar su allowlist de la
  raíz para aceptar `codes.json` (invariante de fase 1.2 anticipado).
- Extracción del set `nextSet` (solo el vigente; el 2026 entra cuando
  `currentSet` cambie).
- Persecución de `xs:ref` / tipos compartidos entre namespaces externos
  (p. ej. enumeraciones de `xmldsig-core-schema.xsd` no son tablas de
  Hacienda).

## Decisions

**D1 — Scanner propio de stack, sin dependencias nuevas.**
Parser de XSD limitado al subconjunto que importa: tracking de pila
`xs:element`/`xs:complexType`/`xs:sequence`/`xs:simpleType`, lectura de
`name` y `value` **raw entre comillas** (sin decodificar entidades: contrato
bytewise) y de `xs:annotation/xs:documentation` (con trim + colapso de
espacios, y decodización de entidades solo aquí porque el texto oficial
puede traer `&amp;`). _Alternativa rechazada:_ `fast-xml-parser` como
devDependency de root — rompe la convención dep-free de `scripts/`, y un
parser DOM normaliza/ordena atributos de formas difíciles de controlar para
el contrato bytewise. Los XSD son archivos vendorizados y estables (salida
XMLSpy), estructura predecible.

**D2 — Forma de `codes.json`.**

```json
{
  "schemaVersion": 1,
  "currentSet": "2024/v4.4",
  "generatedFrom": ["2024/v4.4/FacturaElectronica_V4.4.xsd", "..."],
  "tables": [
    {
      "key": "MensajeHacienda/TipoIdentificacionEmisor",
      "kind": "element-anonymous",
      "name": "TipoIdentificacionEmisor",
      "description": "Tipo de identificacion: ...",
      "sources": ["2024/v4.4/MensajeHacienda_V4.4.xsd"],
      "values": [{ "code": "01", "description": "Cedula Fisica" }]
    }
  ]
}
```

Todas las rutas (`generatedFrom`, `sources[]`) son POSIX **relativas a
`packages/sdk/schemas/`** — misma convención que `files[].path` del
manifiesto, no el repo raíz. Tablas ordenadas por `key` (sort lexicográfico). Valores en orden de
documento del **primer** `source` (orden determinista: `sources[]` se arma
con los XSD en orden lexicográfico de ruta). `kind`: `named-simple-type` |
`element-anonymous`. `description` opcional (omitida, no `null`, cuando el
XSD no declara anotación).

**D3 — Ruta de ancestros para anónimos.** La clave de un
`xs:simpleType` anónimo es la ruta de **contenedores con `name`** desde el
nivel superior del XSD hasta el elemento que contiene el simpleType:
`xs:element` y `xs:complexType` con `name` se apilan; `sequence`/`choice`/
`annotation` y anónimos no. Así `IdentificacionType/Tipo` y
`CodigoType/Tipo` (dos `Tipo` homónimos bajo `complexType`s distintos del
mismo XSD) no colisionan, y `MensajeHacienda/TipoIdentificacionEmisor`
sigue siendo la clave canónica. `xs:ref` no se sigue (el `ref` no aporta
nombre propio). Si un mismo XSD tuviera dos raíces, se concatena la ruta
desde cada una (los XSD de Hacienda tienen una raíz). Un XSD con **cero**
`xs:element` de primer nivel → error fatal (exit 1, sin escribir):
estructura inesperada, no tabla vacía silenciosa.

**D4 — Fusión por clave.** Mismo `key` en varios XSD → una sola tabla;
`sources[]` acumula; valores fusionados por código exacto. Código repetido
con descripción distinta tras trim+colapso → warn (`codes:extract: codigo
"01" descripcion distinta entre <a> y <b>`) y se queda la primera. Códigos
que difieren solo en mayúsculas son códigos distintos (sin fusión, sin
error). Si los **conjuntos de códigos** de la misma clave difieren entre
XSD → error fatal (inconsistencia real de Hacienda; el extractor la
reporta, no la fusiona). _Por qué la fusión es correcta en el dominio:_
los ~13 tipos nombrados repetidos entre Factura/NC/ND/NCE son la misma
tabla oficial duplicada por Hacienda en varios XSD (idéntica salvo
descripciones que difieren por erratas); fusionarlos reconstruye la
tabla única, no inventa datos. Colisión de claves con distinta
procedencia (imposible con D3 si las rutas son correctas) → error fatal.

**D5 — Errores y warnings.** Prefijo `codes:extract:` en stderr. Warnings
nunca cambian el exit code (0). Errores → exit 1, sin tocar `codes.json`
(parseo completo en memoria, escritura atómica al final: tmp + rename):
manifiesto ausente/JSON inválido/sin `currentSet`/directorio del set
inexistente; XSD ausente o XML inválido; forma no soportada (`xs:union`,
`xs:simpleType` con `name` dentro de un `xs:element`, XSD sin raíz
`xs:element`); colisión de claves; conjuntos de códigos divergentes bajo
la misma clave.

**D6 — Script y tests.** `scripts/codes-extract/extract.mjs` (CLI),
`lib/scan.mjs` + `lib/render.mjs`, tests colocados
`scripts/codes-extract/*.test.mjs` con fixtures XSD sintéticas (no los XSD
reales de Hacienda para los casos unitarios; un test de integración sí
corre sobre el set real y solo asserts de estructura/no-vacío para no
acoplar el test a valores oficiales que Hacienda puede cambiar). Descubrimiento
por `run-script-tests.mjs` (ya recursivo).

**D7 — README.** Sección "codes.json" en
`packages/sdk/schemas/README.md`: origen (extraído de los XSD del
`currentSet`), regeneración (`pnpm codes:extract`), semántica de clave,
advertencia de que el SDK no lo consume. No se toca la semántica de
`lastSyncedAt`.

## Risks / Trade-offs

- [XSD 2026 con formas nuevas (`xs:union`, simpleType nombrado en línea,
  sin raíz `xs:element`)] → El extractor solo cubre `xs:restriction` +
  `xs:enumeration` (lo que Hacienda usa hoy). Cualquier forma no cubierta →
  error fatal (exit 1), nunca warn silencioso ni extracción parcial. Test
  de integración: ≥ 40 tablas por set (el set 2024/v4.4 produce 46 claves
  únicas tras fusión de tipos repetidos entre XSD; 40 es canario
  conservador).
- [Entidades en `value` no decodificadas] → A propósito (bytewise). Si
  Hacienda publicara un `value` con entidad, el código literal incluye la
  entidad; se documenta en README como comportamiento.
- [codes.json rechazado por `spec:verify`] → Resuelto en este cambio:
  allowlist de la raíz ampliada a `manifest.json`, `README.md`,
  `codes.json` (MODIFIED de `spec-integrity`, anticipado en fase 1.2).
  La _divergencia_ codes.json ↔ XSD sigue sin gate (fase posterior).
- [Duplicados de tipos nombrados entre Factura/NC/ND (~13 tipos × 4 XSD)]
  → Fusión D4 los une en una tabla con `sources[]` múltiple; es el caso
  real de "mismo código, descripción distinta entre XSD". Conjuntos de
  códigos distintos bajo la misma clave → fatal (no fusión).

## Migration Plan

Aditivo: nuevo script + artefacto nuevo + README + una línea en la allowlist
de `scripts/spec-verify.mjs`. Rollback: revertir esas piezas; nada del SDK
lo importa.

## Open Questions

- ¿Incluir también las tablas del set `nextSet` bajo otra clave (p. ej.
  `tablesBySet`)? Se responde cuando `2026/v4.4` pase a `currentSet`; hoy
  solo vigente.
- ¿Gate de no-divergencia en CI? Fase posterior junto con el consumo SDK.
