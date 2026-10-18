# SDK: pausa y continuación — 18 de octubre de 2026

El usuario solicitó actualizar documentación e issues y después pausar el trabajo.
Este registro no autoriza nuevas implementaciones, publicaciones ni operaciones
fiscales. No describe el estado de despliegue de ninguna aplicación consumidora.

## Identidades que deben conservarse

La revisión parte de main `9cae8817a6bf0aebafd569052624316b834637a8`.
Los cuatro paquetes publicados siguen siendo **0.10.0**, tag `v0.10.0`, fuente
inmutable `db3a97daec5b7d12dbd814d59bcdd2a9a561c0cf`. El
[registro de publicación](release-0100-published.md) contiene sus integridades,
procedencia, consumidores y recuperación con los mismos artefactos. El avance de
main no cambia esos bytes ni convierte commits posteriores en paquetes publicados.

Cambios posteriores revisados:

- [PR 95](https://github.com/DojoCodingLabs/hacienda-cr/pull/95): contexto de publicación e investigaciones REP/receptor; sin cambios de ejecución.
- [PR 96](https://github.com/DojoCodingLabs/hacienda-cr/pull/96): regresión adversarial del verificador público y auditoría; no parche de dependencia.
- [PR 41](https://github.com/DojoCodingLabs/hacienda-cr/pull/41): herramientas pnpm 12.10.1, política de compilación acotada y evidencia; sin cambio del grafo de dependencias de la aplicación ni de las versiones publicadas.

## Revisión de los ocho issues

Se leyeron el inventario completo, los comentarios recientes y las superficies de
código pertinentes. Los comentarios de pausa actualizan el estado actual sin
reescribir la evidencia histórica del cuerpo de cada issue. No se cambiaron
estados, etiquetas, asignaciones ni alcance.

| Issue                                                         | Disposición y evidencia                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [69](https://github.com/DojoCodingLabs/hacienda-cr/issues/69) | Abierto. El rechazo nativo del caso DER está probado; node-forge conserva el hallazgo high y no hay remediación de dependencia. [Comentario de pausa](https://github.com/DojoCodingLabs/hacienda-cr/issues/69#issuecomment-6251318914).                                           |
| [61](https://github.com/DojoCodingLabs/hacienda-cr/issues/61) | Abierto. `draft.ts` todavía usa `number`, `parseFloat` y redondeo binario; las APIs exactas no migran ese comando. [Comentario de pausa](https://github.com/DojoCodingLabs/hacienda-cr/issues/61#issuecomment-6251319234).                                                        |
| [85](https://github.com/DojoCodingLabs/hacienda-cr/issues/85) | Abierto. Los casos fuente revisados sí están publicados en 0.10.0; REP exacto, transporte/correlación del receptor e integración y aceptación completa siguen pendientes. [Comentario de pausa](https://github.com/DojoCodingLabs/hacienda-cr/issues/85#issuecomment-6251319540). |
| [80](https://github.com/DojoCodingLabs/hacienda-cr/issues/80) | Cerrado correctamente: contrato de consulta corregido en PR 81 y publicado en 0.8.0. Su comentario distingue esa corrección de cobertura histórica y adopción de aplicación. No requiere corrección nueva.                                                                        |
| [47](https://github.com/DojoCodingLabs/hacienda-cr/issues/47) | Cerrado como simulación de deriva con hash artificial, según su comentario de cierre. No representa un hallazgo vigente ni exige reapertura por el alcance V1.                                                                                                                    |
| [46](https://github.com/DojoCodingLabs/hacienda-cr/issues/46) | Cerrado como validación de deduplicación del workflow, según su comentario de cierre. No requiere corrección nueva.                                                                                                                                                               |
| [38](https://github.com/DojoCodingLabs/hacienda-cr/issues/38) | Cerrado por decisión explícita del solicitante: ESM es intencional. Los exports actuales siguen siendo ESM; no se afirma que exista compilación dual CommonJS.                                                                                                                    |
| [37](https://github.com/DojoCodingLabs/hacienda-cr/issues/37) | Cerrado correctamente: usuario IDP completo soportado desde PR 39/0.4.1. `loadCredentials` conserva el username explícito; no exige reconstruirlo desde la identificación fiscal.                                                                                                 |

## Dónde retomar

1. **Seguridad:** revisar upstream o una sustitución compatible antes de modificar
   la dependencia; repetir regresión, consumidores y auditoría. La
   [auditoría Forge](forge-reachability-audit.md) distingue el control válido,
   rechazo nativo y alcance no demostrado. El hallazgo high de Forge y el
   moderate de desarrollo ExcelJS→uuid del registro de publicación siguen
   visibles; no se declara auditoría limpia ni una consulta nueva del upstream.
2. **CLI exacta:** diseñar y probar la entrada/salida decimal de `draft`, sin
   convertir a Number las APIs exactas. Conservar compatibilidad explícita y
   añadir Changeset cuando cambie el comportamiento publicado.
3. **REP y receptor:** resolver los oráculos y decisiones documentados en
   [REP](rep-monetary-oracle-research.md) y
   [transporte del receptor](mr-transport-correlation-research.md). No inferir
   semántica monetaria de un XSD válido ni correlación institucional de la clave
   del documento original.
4. **Trabajo fuente pendiente:** revisar individualmente los PR abiertos y su
   diff actual. La publicación de casos exactos no integra automáticamente
   propuestas amplias de generadores o Money ni valida sus conversiones.
5. **Entrega futura:** usar el [runbook](releasing.md), revisión independiente y
   preparación de paquetes/consumidores antes de cualquier versión nueva.
   Preservar productores y bytes históricos en cada consumidor; no relabelarlos
   ni confundir capacidades del SDK con flujos completos o aceptación fiscal.

Esta actualización es documental: no ejecutó proveedores, credenciales,
publicaciones, cambios de configuración global ni nuevas pruebas de ejecución.
Los resultados de pruebas citados pertenecen a los registros enlazados; no se
repitieron para esta pausa.
