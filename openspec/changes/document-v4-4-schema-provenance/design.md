# Diseño: registro de procedencia de los sets XSD v4.4

## Context

Ver `proposal.md` para la motivación. El estado actual relevante:

- `packages/sdk/schemas/manifest.json` declara dos sets de la misma versión
  nominal: `2024/v4.4` con `sourceSurface: "atv"` (`currentSet`) y `2026/v4.4`
  con `sourceSurface: "ovi"` (`nextSet`, `effectiveFrom: "2026-11-01"`).
- `packages/sdk/schemas/README.md` describe la procedencia en prosa y un diff
  resumido, pero no registra evidencia por archivo ni declara autoridad.
- El build del SDK embebe el set `2026/v4.4`; los tests de conformidad usan la
  carpeta vendorizada.
- Comprobación realizada el 2026-10-23, sin credenciales:
  - ATV sirve `2024/v4.4/FacturaElectronica_V4.4.xsd` con
    `Last-Modified: Tue, 09 Sep 2025 15:24:46 GMT`, 118624 bytes y SHA-256
    `d384afef665573606f6499b2182d6070850ada8c93bc40fa7f0f3901a25b9cc8`;
    coincide byte a byte con el vendorizado.
  - OVi sirve `FacturaElectronica_V4.4.xsd` con
    `Last-Modified: Wed, 22 Apr 2026 21:01:06 GMT`, 119689 bytes y SHA-256
    `926ba81325bc21102755bd8e4e570a63caaca086e680a877c3a6d15d6ee8a62f`;
    coincide byte a byte con `2026/v4.4/`.
  - `MensajeHacienda_V4.4.xsd`: ATV `411d858b...f390` (7790 bytes) frente a OVi
    `b2606156...fd25e` (7799 bytes).
  - La página ATV de Anexos y Estructuras enumera únicamente
    `docs/esquemas/2024/v4.4/` para la v4.4; no publica un set `2026/v4.4`.
  - Los nueve XSD difieren entre sets. Los archivos usan terminadores CR/CRLF,
    por lo que la comparación de contenido debe normalizar fin de línea antes de
    hacer `diff`.

## Goals / Non-Goals

**Goals:**

- Un único documento canónico de procedencia, con evidencia reproducible y
  diffeable, que cubra ambos sets y ambas superficies.
- Dejar escrito qué set es la referencia autoritativa (ATV `2024/v4.4`) y qué
  queda como decisión abierta (`2026/v4.4`).
- Enlazar el registro desde la documentación existente sin duplicar su
  contenido.

**Non-Goals:**

- No modificar `manifest.json`, `currentSet`, `nextSet`, hashes ni bytes
  vendorizados.
- No re-vendorizar, retirar ni renombrar el set `2026/v4.4`.
- No cambiar el set embebido por el build ni la validación en runtime.
- No añadir un gate automático nuevo; `spec:check`/`spec:verify` siguen siendo
  la verificación operativa.

## Decisions

1. **Documento dedicado `docs/specs/v4-4-schema-provenance.md`, con puntero
   desde `packages/sdk/schemas/README.md`.** El README ya documenta semántica de
   campos y superficies; añadir tablas de evidencia por archivo lo volvería
   largo y propenso a mezclar contrato con historial. Alternativa considerada:
   ampliar solo el README; se descarta por tamaño y por la frecuencia esperada
   de actualización de la evidencia.

2. **Tabla fija por set y por archivo.** Columnas: `set`, `surface`, `url` o
   `baseUrl` + nombre, `lastModified`, `sha256`, `bytes`, `checkedAt`, `rol`.
   Permite actualizar una fila sin reescribir la narrativa y hace visible qué
   valor cambió. Alternativa: prosa con hashes; se descarta porque no es
   diffeable de forma fiable.

3. **Autoridad declarada, conflicto visible.** Se declara `2024/v4.4` (ATV) como
   referencia autoritativa, según la decisión registrada por el usuario, y se
   documenta que `2026/v4.4` proviene de OVi, con fecha posterior, mientras ATV
   no lo publica. Alternativa: registro neutral sin autoridad; descartada por
   decisión explícita del usuario. El registro no convierte la autoridad
   declarada en un cambio de `currentSet`.

4. **La decisión abierta se escribe como tal, con sus efectos.** El documento
   enumera qué depende de resolverla: vigencia de `nextSet`, fecha
   `effectiveFrom`, set embebido y expectativas de conformidad. Alternativa:
   dejar el tema solo en el issue o en el historial de cambios; se descarta
   porque la documentación se lee sin ese contexto.

5. **Evidencia reproducible con comandos de solo lectura.** Registrar el
   procedimiento (`curl -sSI` para `Last-Modified`, `curl -sS -L` + `sha256sum`
   para bytes, `diff` con normalización de CR/CRLF) y la fecha de comprobación.
   Así cualquier persona puede repetir la verificación sin depender de este
   diseño.

6. **Enlace desde `docs/specs/v4.4-compliance.md`** en la sección de esquemas,
   para que quien lea el diff funcional llegue a la procedencia.

## Risks / Trade-offs

- **La evidencia caduca** (las superficies pueden cambiar) → cada tabla lleva
  `checkedAt`; una nueva comprobación añade fecha y conserva el valor anterior.
- **Documentar autoridad sin cambiar el manifiesto deja una tensión visible**
  (`currentSet` 2024 frente a set embebido 2026) → el documento la nombra como
  decisión abierta; no se presenta como resuelta.
- **Duplicación entre README y documento nuevo** → el README solo enlaza y
  mantiene su semántica de campos; el registro es la única fuente de evidencia.
- **Comparar XSD con terminadores CR/CRLF puede producir diffs falsos** → el
  procedimiento documentado normaliza fin de línea antes de comparar.
- **El documento puede leerse como una afirmación de que OVi no es oficial** →
  el texto atribuye los bytes a OVi y evita calificarlos de no oficiales; la
  decisión abierta es sobre autoridad y vigencia, no sobre la existencia de la
  publicación.

## Open Questions

- Qué hacer con `2026/v4.4` (mantenerlo como `nextSet`, re-vendorizarlo desde
  ATV cuando publique la revisión, o retirarlo) y si el build debe seguir
  embebiéndolo. Es una decisión posterior: no cambia el contenido ni la
  estructura del registro de procedencia.
