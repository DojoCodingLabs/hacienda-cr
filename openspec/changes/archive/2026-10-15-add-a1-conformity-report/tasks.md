## 1. Entorno de trabajo (fuera de los repos)

- [x] 1.1 Clon local `hacienda-cr-a1-baseline` (hermano de `hacienda-cr/`) con HEAD en
      `a0c6b67` = `origin/release/v0.4.1`, última rama remota previa a la vendorización
- [x] 1.2 Copia de las fuentes primarias a `INDENTS/fuentes-primarias/` (sets `2024/v4.4` y
      `2026/v4.4`, `xmldsig-core-schema.xsd`, `manifest.json` de procedencia) con
      `README.md` que lista SHA-256 por archivo
- [x] 1.3 Confirmar el baseline limpio (`git status`) y que los XSD del baseline y de la rama
      actual son idénticos; si se quiere correr la suite en el baseline, instalar con
      `pnpm install --frozen-lockfile` (opcional, no condiciona el informe)

## 2. Inventario y primera pasada (cuarentena activa)

- [x] 2.1 Sondear el código del baseline y escribir el inventario completo de tablas de
      códigos que el SDK define (`shared/src/constants/*.ts`,
      `packages/sdk/src/api/error-codes.ts`, catálogo de la clave numérica); el inventario
      se publica al inicio del informe como lista cerrada
- [x] 2.2 Extraer del PDF de Anexos (`pdftotext -layout`) las tablas por nota y localizar la
      página de cada una; anotar nota + página como cita
- [x] 2.3 Extraer del set `2024/v4.4` y del `2026/v4.4` las enumeraciones por `simpleType`
      y `element` con `xmllint`/`grep`, registrando archivo y ruta de cada una
- [x] 2.4 Verificar cada fila del inventario: códigos comparados byte a byte (sin
      normalización Unicode ni trim), descripciones con trim y colapso de espacios;
      registrar veredicto, cita y diff para toda fila que no sea "coincide"

## 3. Redacción del informe

- [x] 3.1 Redactar `docs/conformity-report.md`: cabecera de procedencia (sets, SHA-256 por
      archivo, fecha, herramientas, commit auditado), protocolo de independencia, inventario
      y tabla de resultados con una fila por tabla
- [x] 3.2 Escribir las secciones de "sin fuente oficial verificada" (con superficies
      consultadas) y "fuera de alcance" (p. ej. catálogo CABYS del BCCR)
- [x] 3.3 Cerrar la primera pasada, abrir la cuarentena y redactar la reconciliación contra
      `docs/specs/v4.4-compliance.md`: coincidencias, desacuerdos con posición de la
      auditoría y hallazgos nuevos que ella no cubrió
- [x] 3.4 Apéndice de estado actual: para cada hallazgo, indicar si las fases 1a–3 ya lo
      cubrieron (catálogo generado, pareja en `table-map.mjs`, hueco documentado) o si
      sigue abierto para A2
- [x] 3.5 Verificar reproducibilidad: cada cita se reproduce con `pdftotext -f/-l` o
      `xmllint` sobre los archivos cuyo SHA-256 declara la cabecera, y los supuestos no
      verificables quedan marcados con su superficie consultada

## 4. Integración y revisión

- [x] 4.1 Enlazar el informe en el mapa de documentación de `AGENTS.md`
- [x] 4.2 Crear una rama de acuerdo a docs/releasing.md y hacer los commits en esta (no hacer PR ni merge).
- [x] 4.3 Demo de viernes: recorrer hallazgos, desacuerdos con la auditoría previa y lista
      accionable que A1 entrega a A2
