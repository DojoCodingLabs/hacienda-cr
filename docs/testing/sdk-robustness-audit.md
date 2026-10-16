# Auditoría de robustez SDK, CLI y MCP

> Actualización: consultar [las iteraciones de corrección y validación](sdk-validation-iterations.md) para el estado vigente. Los resultados y pendientes siguientes documentan la ejecución anterior.

Revisión del 15 de octubre de 2026. **El SDK todavía no tiene evidencia suficiente para declararse listo para emisión de producción.** La revisión encontró defectos reales además de cobertura verde. No se ejecutó producción ni se necesitan ventas, clientes o facturas reales para continuar probando.

## Evidencia y cambios

Se revisaron los límites de autenticación, configuración, transporte, orquestador, validación, firma, consecutivos, cálculos, comandos CLI y herramientas MCP. Esta es una revisión orientada a riesgos, no una certificación exhaustiva de todas las reglas fiscales.

Dos correcciones tienen reproducción antes/después:

- **Repetición de mutaciones HTTP:** cuatro regresiones fallaban porque POST/PUT/PATCH/DELETE se repetían tras perder la respuesta. Ahora se ejecutan una sola vez por defecto. GET conserva reintentos; una opción explícita `retryUnsafeRequests` permite compatibilidad en operaciones independientemente idempotentes. No debe activarse para reenviar una factura incierta. La autenticación usa `TokenManager` directamente y no cambia con esta opción.
- **Contrato CLI JSON:** cuatro regresiones demostraron que `submit --json` y `validate --json` no producían JSON para archivos ilegibles o contenido malformado. Ahora devuelven JSON con fallo y código de salida 1. Un quinto caso confirma que `submit --dry-run` valida XML real sin autenticar ni firmar.

Validación final sin credenciales y sin caché:

```bash
env -u HACIENDA_USERNAME -u HACIENDA_PASSWORD -u HACIENDA_P12_PATH \
  -u HACIENDA_P12_PIN pnpm exec turbo run test typecheck lint --force
node --test scripts/validate-sdk-sandbox.test.mjs
```

Los 16 trabajos de test/build-dependencias/typecheck/lint terminaron correctamente. Vitest informa 994 aprobadas y 3 omitidas: **989 son casos normales y 5 son defectos abiertos marcados `it.fails`**. El runner manual tiene 4 pruebas de guardas adicionales. No interpretar los cinco casos esperados fallidos como defectos resueltos.

| Paquete | Casos reportados aprobados | Defectos esperados dentro de ese número | Omitidos |
| ------- | -------------------------: | --------------------------------------: | -------: |
| Shared  |                        113 |                                       0 |        0 |
| SDK     |                        781 |                                       4 |        3 |
| CLI     |                         68 |                                       0 |        0 |
| MCP     |                         32 |                                       1 |        0 |

Los avisos de Turbo sobre ausencia de archivos de salida de pruebas no son fallos de pruebas.

## Hallazgos abiertos

| Prioridad                     | Hallazgo reproducido                                                                                                | Impacto y siguiente cambio                                                                                                                                                                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P1                            | `validateFacturaInput` acepta un emisor diferente del segmento de cédula de la clave                                | Puede aprobar localmente un documento con identidad inconsistente. Añadir reconciliación de clave/emisor/consecutivo/tipo/fecha y corregir fixtures conjuntamente.                                                                                           |
| P1                            | Acepta un consecutivo diferente del incluido en la clave                                                            | Rompe trazabilidad; no debe llegar a firma/envío. Reproducción esperada fallida en `known-integrity-gaps.spec.ts`.                                                                                                                                           |
| P1                            | Acepta IVA 13% con código de tarifa `01`                                                                            | Hay presencia de código, pero falta validar correspondencia entre código y porcentaje con reglas por tipo.                                                                                                                                                   |
| P1                            | `SIMPLE_INVOICE.clave` existente tiene longitud correcta y segmentos equivocados                                    | Su emisor/consecutivo no coinciden y su fecha es 1 de julio, mientras `fechaEmision` es 27 de julio. El XSD no comprueba esas relaciones. No usar este fixture para POST. Migrar claves hardcodeadas a generadores coherentes sin ocultar regresiones.       |
| P1                            | Zod rechaza motivo de referencia `06`, ya existente en v4.4; también faltan `07`–`12` en el enum público            | Tipos y validación de entrada no cubren todo lo que sí admite el XSD incluido. Actualizar catálogo, tipos, builders, CLI/MCP y casos de referencias conjuntamente.                                                                                           |
| P1                            | Actualización oficial posterior agrega motivos `13`–`17` y tipos de referencia `19`/`20`                            | Comparar el XSD vendorizado con la versión oficial actual y registrar versión/hash. La nota oficial indica que están disponibles en STAG. No ampliar sólo un enum dejando esquemas incompatibles.                                                            |
| P1 para servicio multiempresa | MCP mantiene cliente por nombre de perfil aun cuando cambia el usuario emitido o configuración                      | Puede conservar identidad/ambiente anteriores en un proceso largo. Hay reproducción esperada fallida. Existe invalidación manual, pero falta detección de cambios/rotación y claves de caché seguras.                                                        |
| P2                            | MCP `create_invoice` usa el contador global por tipo/sucursal/terminal, sin namespace explícito de empresa/ambiente | No existe aislamiento de numeración a nivel producto. Añadir scope, pruebas de empresas concurrentes y política de migración de contadores. No supone por sí solo colisión de clave entre cédulas distintas.                                                 |
| P2                            | Errores IDP/CLI/MCP pueden propagar mensajes externos; `Logger` serializa datos sin redacción                       | El runner manual imprime sólo códigos, pero eso no protege todas las interfaces. Añadir política central de redacción para tokens/password/PIN y pruebas de mensajes maliciosos antes de desplegar un servicio. No se observó exposición de secretos reales. |
| P2                            | Transporte general no impone timeout ni bloquea redirecciones por defecto                                           | El runner inyecta timeout y `redirect: error`; el SDK general requiere que la aplicación configure ese comportamiento. Añadir opciones y pruebas de cancelación/reconciliación.                                                                              |

La tolerancia monetaria actual acepta una diferencia de `0.0005`. Se observó, pero **no se clasifica todavía como incumplimiento fiscal**: hay que contrastar márgenes oficiales y cálculos aplicables por campo. También debe corregirse la explicación del redondeo: `Number.toFixed` no implementa por definición redondeo bancario decimal exacto. Ninguna suite actual sustituye una comparación con un oráculo decimal para importes límite.

## Cómo probar sin una factura real

Hacienda documenta un ambiente de integración sandbox, separado de producción, cuya base puede limpiarse. La [guía de credenciales](https://www.hacienda.go.cr/docs/GuiaparaCredencialesEntornodepruebas.pdf) exige que quien obtiene acceso tenga inscripción tributaria y alguna actividad lucrativa; no exige aportar una venta real para hacer pruebas. Las credenciales y llave proporcionadas ya permitieron autenticar y firmar localmente. Una transacción sintética es suficiente para ensayar el software; su aceptación depende de las validaciones del sandbox.

No se encontró en las fuentes oficiales consultadas un juego universal de cédulas ficticias, actividades y certificados intercambiables. Por eso no se afirma que cualquier emisor inventado será aceptado. Se puede construir un pedido sintético con importes/descripciones de prueba, obtener la identidad correspondiente al certificado local de forma privada y verificar los catálogos técnicos antes de enviarlo. Un rechazo controlado también sirve como evidencia de transporte, pero no cumple el criterio de aceptación fiscal.

Los [anexos oficiales v4.4](https://www.hacienda.go.cr/docs/ANEXOS_Y_ESTRUCTURAS_V4.4.pdf), páginas 14 y 97–98, describen redondeo e integración sandbox; la [actualización de referencias](https://www.hacienda.go.cr/docs/ActualizacionAnexosyEstructurasVersion4.4CEv2.pdf) incorpora nuevos códigos y señala disponibilidad en ambos ambientes. El PDF del comunicado no muestra un año de publicación: confirmar su contexto y anexos vigentes antes de fijar la fecha de obligatoriedad en un release.

El [informe de ejecución sandbox](sdk-sandbox-validation.md) separa autenticación real, firma real, XSD offline y envío pendiente. No hace falta entregar datos de una operación comercial real; falta preparar el escenario sintético y comprobar qué identidades/catálogos acepta el entorno, sin presentarlos como validados de antemano.

## Orden recomendado

1. Corregir integridad de claves y fixtures, correspondencia de tarifas y catálogo de referencias, con regresiones que dejen de ser `it.fails`.
2. Contrastar XSD oficiales actuales y agregar oráculo decimal/casos límite; no cambiar tolerancias sin respaldo.
3. Completar una FE sintética sandbox y conservar request, firma y respuesta; luego cada tipo con referencias coherentes.
4. Resolver scope/caché multiempresa, redacción de secretos, timeout y recuperación durable antes de integrar un servicio.
5. Validar operación contable y producción sólo cuando llegue esa etapa. La revisión con contadora es un requisito del producto real, no una condición para escribir o ejecutar las pruebas sintéticas actuales.
