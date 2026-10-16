# Validación del SDK: offline y sandbox

> Actualización: consultar [las iteraciones de corrección y validación](sdk-validation-iterations.md) para el estado vigente. Los resultados y pendientes siguientes documentan la ejecución anterior.

Fecha de ejecución: 15 de octubre de 2026 (Costa Rica). Se preservaron los cambios preexistentes y no se modificó implementación del SDK. No se probó producción ni GTI.

## Resultados comprobados

| Capa                                                                 | Evidencia                                                                             | Resultado                                                                                                                                                   |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Suite de los cuatro paquetes, ejecución sin caché y sin credenciales | `turbo run test --force`                                                              | 964 pruebas aprobadas; 4 omitidas antes de agregar esta cobertura                                                                                           |
| SDK después de esta ampliación                                       | `pnpm --filter @dojocoding/hacienda-sdk test` con credenciales eliminadas del entorno | 771 aprobadas; 3 omitidas (autenticación real)                                                                                                              |
| Cobertura adicional offline                                          | `sandbox-validation.offline.spec.ts`                                                  | 12 aprobadas: FE, TE, NC, ND, FEC, FEE, REP y MR firmados con certificado autofirmado y XSD; verificación criptográfica y alteración; recuperación; rechazo |
| Guardas del runner manual                                            | `node --test scripts/validate-sdk-sandbox.test.mjs`                                   | 4 aprobadas; sin red                                                                                                                                        |
| Typecheck SDK y ESLint de pruebas modificadas                        | `pnpm --filter @dojocoding/hacienda-sdk typecheck` y ESLint                           | Aprobados                                                                                                                                                   |
| Autenticación real contra IDP sandbox                                | Runner `auth`, credenciales suministradas localmente por el usuario                   | Aprobada; tokens nunca impresos ni guardados                                                                                                                |
| Certificado sandbox y PIN reales                                     | Runner `sign` sobre factura ilustrativa preparada localmente                          | Firma, verificación criptográfica con xmldsigjs y XSD aprobados; certificado vigente; cero solicitudes de red                                               |
| Envío y aceptación/rechazo reales                                    | Aún no ejecutados                                                                     | Pendiente de datos fiscales de la operación de pruebas                                                                                                      |

La suite inicial incluía un caso llamado «real credentials» que únicamente comprobaba la presencia de variables. Se retiró ese placeholder: no aportaba evidencia de firma, envío ni aceptación. Las pruebas mocked originales se conservan. La validación manual real se ejecuta explícitamente fuera de `pnpm test`.

## Qué significa cada evidencia

Las ocho variantes firmadas validan la estructura XML v4.4 y de la firma contra los XSD incluidos. No prueban aceptación por Hacienda ni validan criptográficamente la firma con un verificador independiente. El certificado real y PIN se probaron localmente sobre datos ilustrativos: esos datos no se enviaron y no representan una operación fiscal válida. La firma con ese certificado también se verificó con `xmldsigjs` y se comprobó que el certificado estaba dentro de su período de validez; no se imprimió su contenido ni identidad.

Dos pruebas adicionales verifican criptográficamente la firma generada y rechazan contenido alterado mediante `xmldsigjs`, dependencia también usada para firmar. Esto aporta evidencia criptográfica local, pero todavía falta contrastar con un verificador independiente y con Hacienda.

La recuperación mocked demuestra cómo consultar la misma clave después de perder la respuesta del POST, sin un segundo POST en esa prueba. No representa una cola durable ni idempotencia distribuida. La revisión posterior cambió el SDK para que las mutaciones no se repitan por defecto; GET conserva reintentos. El runner además los desactiva expresamente. Ver la [auditoría de robustez](sdk-robustness-audit.md), con defectos abiertos y resultados más recientes.

La cobertura existente de cálculos verifica redondeo a cinco decimales y casos IEEE 754; no equivale a una certificación contable de todos los regímenes. La suite de consecutivos verifica concurrencia local y que un timeout no robe un lock existente. El aislamiento entre empresas requiere directorios separados por identificación en el ejemplo, o una estrategia transaccional de aplicación antes de producción.

## Preparar una operación sandbox válida

Antes del primer envío falta preparar un `order.json` sintético coherente. No se exige una factura real ni revisión previa de la contadora para probar sandbox. Se deben comprobar estos campos de prueba:

- Identificación fiscal, nombre, correo y ubicación del emisor correspondiente al certificado.
- Actividad económica registrada del emisor.
- Identificación real del proveedor del sistema (`proveedorSistemas`).
- Receptor, CABYS, unidad, descripción, importe y tratamiento tributario de la operación.
- Sucursal, terminal y consecutivos de sandbox coordinados para evitar conflictos con otras pruebas.

El usuario IDP completo se conserva exactamente como lo entrega Hacienda. No se usa para deducir la cédula fiscal. Los ejemplos del repositorio tienen datos ilustrativos; pasar el XSD no confirma inscripción ni clasificación tributaria.

## Runner explícito y reproducible

`scripts/validate-sdk-sandbox.mjs` permite `preflight`, `auth`, `sign`, `submit` y `status`. Requiere el SDK compilado (`pnpm build`). No permite seleccionar ambiente ni URLs: sólo los endpoints oficiales sandbox. Rechaza redirecciones HTTP, usuarios fuera del dominio sandbox y directorios de artefactos dentro del repositorio. Los errores impresos están reducidos a códigos; no se imprimen cuerpos de respuesta ni secretos.

Suministrá secretos por un mecanismo local seguro, sin argumentos de línea de comandos ni historial:

```text
HACIENDA_USERNAME
HACIENDA_PASSWORD
HACIENDA_P12_PATH
HACIENDA_P12_PIN
```

La configuración y el certificado permanecen fuera del repositorio. No agregues `.env`, certificados, XML firmados, pedidos reales ni respuestas de Hacienda a Git.

Con variables ya cargadas, el recorrido es:

```bash
HACIENDA_SANDBOX_TEST=1 node scripts/validate-sdk-sandbox.mjs preflight
HACIENDA_SANDBOX_TEST=1 node scripts/validate-sdk-sandbox.mjs auth
```

Prepará un directorio nuevo con el [ejemplo existente](../../packages/sdk/examples/sandbox.mjs), usando un pedido revisado y ejecutándolo desde un directorio privado fuera del repositorio para que su contador también permanezca allí. Seguí la [guía sandbox](../sandbox-guide.md); no envíes el pedido ilustrativo sin corregirlo.

```bash
node scripts/validate-sdk-sandbox.mjs sign /ruta/privada/run-001
HACIENDA_SANDBOX_TEST=1 HACIENDA_SANDBOX_SUBMIT=1 \
  node scripts/validate-sdk-sandbox.mjs submit /ruta/privada/run-001
HACIENDA_SANDBOX_TEST=1 \
  node scripts/validate-sdk-sandbox.mjs status /ruta/privada/run-001
```

El runner firma sólo FE en su recorrido manual actual. La cobertura de los otros tipos es offline; se necesitarán recorridos reales propios con datos y referencias válidos, particularmente NC/ND/REP y mensaje receptor.

`submit` verifica hashes del JSON y del XML firmado, guarda request e intento con creación exclusiva y hace un único POST sin reintentos automáticos. También reconoce marcadores del ejemplo existente, para impedir usar ambos comandos de envío sobre el mismo directorio. Cada resultado o consulta queda en archivos privados con modo `0600`; la consola sólo informa estado y hash de identidad.

Si hay timeout, error o interrupción, conservá todo y ejecutá `status` con el mismo directorio. No borres marcadores ni prepares otra clave para resolver la incertidumbre. `status` no firma, no asigna consecutivos ni envía. El archivo original y el XML de respuesta contienen información sensible: revisalos localmente y compartí sólo evidencia redactada.

Una respuesta `rechazado` o `error` no cumple el criterio de aceptación. Documentá el motivo, corregí la causa y coordiná el siguiente intento sin perder la trazabilidad anterior. La aceptación sandbox de una FE tampoco valida automáticamente todos los tipos ni habilita producción.

## Pendientes antes de producto real

1. Ejecutar FE real y obtener respuesta terminal, preservando clave, solicitud y respuesta.
2. Ejecutar los demás tipos con referencias fiscales válidas y evidencia individual.
3. Verificación criptográfica independiente y prueba de alteración posterior a firma.
4. Validación contable de precisión, exoneraciones, compra, exportación y REP aplicables al negocio.
5. Outbox y reconciliación durables, numeración transaccional e aislamiento multiempresa de aplicación.
6. Ensayar recuperación tras caída del proceso, secretos rotados y respaldo/restauración antes de producción.
