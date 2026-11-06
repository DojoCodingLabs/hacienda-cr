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

`scripts/validate-sdk-sandbox.mjs` permite `preflight`, `auth`, `sign`, `submit`, `status` y `verify`. Requiere el SDK compilado (`pnpm build`). No permite seleccionar ambiente ni URLs: sólo los endpoints oficiales sandbox. Rechaza redirecciones HTTP, usuarios fuera del dominio sandbox y directorios de artefactos dentro del repositorio. Los errores impresos están reducidos a códigos; no se imprimen cuerpos de respuesta ni secretos.

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
node scripts/validate-sdk-sandbox.mjs verify /ruta/privada/run-001
```

El runner firma sólo FE en su recorrido manual actual. La cobertura de los otros tipos es offline; se necesitarán recorridos reales propios con datos y referencias válidos, particularmente NC/ND/REP y mensaje receptor.

`submit` verifica hashes del JSON y del XML firmado, conserva los bytes exactos del POST en `request.body.json` (con vista derivada `request.pretty.json`), guarda intento con creación exclusiva y hace un único POST sin reintentos automáticos. También reconoce marcadores del ejemplo existente, para impedir usar ambos comandos de envío sobre el mismo directorio. Cada resultado o consulta queda en archivos privados con modo `0600`; la consola sólo informa estado y hash de identidad.

Si hay timeout, error o interrupción, conservá todo y ejecutá `status` con el mismo directorio. No borres marcadores ni prepares otra clave para resolver la incertidumbre. `status` no firma, no asigna consecutivos ni envía. El archivo original y el XML de respuesta contienen información sensible: revisalos localmente y compartí sólo evidencia redactada.

Una respuesta `rechazado` o `error` no cumple el criterio de aceptación. Documentá el motivo, corregí la causa y coordiná el siguiente intento sin perder la trazabilidad anterior. La aceptación sandbox de una FE tampoco valida automáticamente todos los tipos ni habilita producción.

## Bundle de evidencia por intento

Cada run de `sign`/`submit` produce un directorio verificable sin red ni firma nueva:

- `sign` escribe `unsigned.xml`, `signed.xml` (nombres canónicos del bundle) y mantiene `validation-signed.xml` + `validation-signature.json` por compatibilidad con runs anteriores.
- El interceptor de HTTP escribe `request.body.json` con los **bytes exactos** que el SDK transmitió (`JSON.stringify` compacto; su hash SHA-256 viaja en el manifest), no una re-serialización con indentación como el `validation-request.json` anterior. `request.pretty.json` queda como vista derivada para inspección humana.
- Al finalizar, el run contiene `manifest.json` con: versión de formato, ambiente, clave, `identityHash`, tipo de documento, hashes SHA-256 de `invoice.json`, `unsigned.xml`, `signed.xml`, `request.body.json`, `validation-signature.json`, `response.raw.json` (cuerpo crudo del último receipt, cuando existe) y `comprobanteXmlHash` (SHA-256 del `comprobanteXml` base64-decodificado; prueba de que el request contiene exactamente la firma). Los hashes no calculables en runs parciales quedan `null` con motivo en `missing`.
- La respuesta cruda queda en `response.raw.json`; los intercambios HTTP crudos (sin `Authorization`, sin cuerpos OAuth) ya se capturaban en `validation-http-*.json`.

`verify <dir>` re-calcula cada hash, comprueba la cadena cuerpo → `signed.xml` → `unsigned.xml`, la identidad de la clave contra `invoice.json` (segmentos `[9,21)` emisor, `[21,41)` consecutivo, `[29,31)` tipo, código país `506`) y la coherencia de la clase derivada con `validation-result.json`. Imprime una línea JSON por check y un resumen `{ok, result, causedBy}`. Códigos de salida: `0` bundle íntegro (`VALID`); `1` corrupto o manifest ausente (`CORRUPT`/`MANIFEST_REQUIRED`); `2` parcial honesto con clase `INVALID_LOCAL` y hashes `null` justificados (`INCOMPLETE`). No toca la red ni el SDK: sirve para re-auditar un intento después del hecho, incluso sin credenciales. Los runs anteriores sin manifest quedan catalogados como `MANIFEST_REQUIRED` (evidencia parcial conservada; verificalos con el recorrido vigente).

### Clasificación del resultado

La clase se deriva de los artefactos (nunca la declara el operador). Módulo puro: `scripts/sandbox-outcome.mjs`; matriz completa en `node --test scripts/sandbox-outcome.test.mjs`. El bloqueo histórico del gateway (HTTP 403 `IncompleteSignatureException`) se clasifica como `TRANSPORT_BLOCKED`, no como `VALIDATION_FAILED`: es una falla de infraestructura, no del comprobante ni de la validación local.

| Entrada observada                                                | Clase derivada                  | Justificación                                                                                                                                                              |
| ---------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Estado terminal `aceptado`                                       | `ACCEPTED`                      | Hacienda aceptó el comprobante                                                                                                                                             |
| Estado terminal `rechazado` con motivo                           | `REJECTED`                      | rechazo fiscal documentado con `responseXml`                                                                                                                               |
| `recibido`/`procesando` sin estado terminal (agotó polling)      | `PENDING`                       | el POST del receipt recibió 2xx: entrega confirmada, estado parcialmente desconocido                                                                                       |
| Estado `error` de Hacienda                                       | `TRANSPORT_BLOCKED`             | falla informada por la plataforma de Hacienda, no por el comprobante                                                                                                       |
| 403/4xx/5xx del gateway (Cloudflare/AWS) sin marcadores fiscales | `TRANSPORT_BLOCKED`             | sin `ind-estado`/`respuesta-xml` en el cuerpo ni `X-Error-Cause` en headers: la entrega no llegó al aplicativo fiscal                                                      |
| Error con header `X-Error-Cause`                                 | `REJECTED`                      | Hacienda emite `X-Error-Cause` en rechazos de validación de esquema/contenido: hay evidencia fiscal aunque el status HTTP sea 4xx; por eso no se clasifica como transporte |
| `ApiError`/`AuthenticationError` (timeout, DNS/TLS)              | `TRANSPORT_BLOCKED` o `PENDING` | `PENDING` sólo si un POST anterior recibió 2xx (entrega confirmada por el interceptor); sin entrega confirmada es transporte                                               |
| Fallo local antes de enviar (validación, XSD, firma, guardas)    | `INVALID_LOCAL`                 | el error es del dato, del paquete o de la operación, nunca de la red                                                                                                       |

Casos cubiertos con `X-Error-Cause`: un 400 con el header y sin cuerpo fiscal es fiscal (`REJECTED`); el mismo 400 sin el header es transporte (`TRANSPORT_BLOCKED`). Un timeout del SDK que aborta el polling después de un POST confirmado es `PENDING` y se consulta con `status`, no se reenvía.

## Escenario de ensayo con referencias coherentes (FE → {NC, ND, FEC, MR})

`scripts/coherent-reference-rehearsal.mjs` genera y valida, sin red ni firma, un escenario
cuya coherencia está construida por el SDK en lugar de confiado al operador. Es una
herramienta interna de `scripts/`: sin API pública ni changeset.

### Grafo y reglas

- La FE raíz no referencia a nadie; cada dependiente (NC, ND, FEC, MR) referencia por
  construcción a un documento del mismo escenario. REP queda **fuera** del escenario: no
  existe binding `original` tipado (el generador lo rechaza de forma fail-closed).
- Pares de referencia (tabla cerrada, fail-closed: par no listado ⇒ violación "par no
  cubierto"): NC sobre FE (`03|01`) con códigos `{01,02,13,14,15,16,99}`, ND sobre FE
  (`02|01`) con `{02}` y ND sobre NC (`02|03`) con `{02}`, NC sobre NC (`03|03`) con la
  misma lista de NC, FEC sobre FE (`08|01`) con `{04}`. El `99` exige el texto
  `codigo`/`tipoDoc` "OTROS" correspondiente (condición delegada en
  `InformacionReferenciaSchema`).
- Resolución art. 9: NC/ND solo sobre comprobante **válidamente emitido**. En escenario
  de ensayo (`rehearsal: true` del escenario completo, sin mezcla) no se exige evidencia;
  en escenario fiscal (`rehearsal: false`) el original debe declarar `estado: "ACCEPTED"`
  o probarlo con el `manifest.json` del runner (`add-sandbox-evidence-bundle`) vía
  `feRunDir` (fail-closed: estado ausente o distinto ⇒ error citando el art. 9, y nada
  se escribe en disco).
- MR con regla propia (no usa la tabla de pares, no tiene `InformacionReferencia`):
  `Clave` = clave del original, `NumeroCedulaEmisor`/`NumeroCedulaReceptor` derivados del
  original, consecutivo `05/06/07` según `Mensaje` 1/2/3, branch/pos/secuencia no nulos,
  `DetalleMensaje` obligatorio para 2/3 y plazo de **8 días hábiles desde el primer día
  del mes siguiente** (Resolución art. 10, literal propio; `DEFAULT_DEADLINE_BUSINESS_DAYS`
  del SDK es otro plazo, no se reutiliza).
- El generador valida: input exacto (Zod, reutiliza `ExactFeInputSchema`,
  `ExactNcTotalInputSchema`, `ExactNdInputSchema`, `ExactRecipientMessageInputSchema`),
  XML contra el XSD vendido `2026/v4.4` (`validateDocumentXml`, sin firma) y
  `validateScenario` sobre el grafo. Falla ANTES de escribir cualquier archivo.

### Formato de entrada/salida del validador (ejemplo)

```json
{
  "documentos": [
    {
      "clave": "50615012600310123456700100001010000000001<8dígitos>",
      "tipoDoc": "01",
      "fechaEmision": "2026-01-15T10:00:00-06:00",
      "emisor": "3101234567",
      "receptor": "3109876543",
      "rehearsal": true,
      "estado": "ACCEPTED"
    },
    {
      "clave": "50616012600310123456700100001030000000002<8dígitos>",
      "tipoDoc": "03",
      "fechaEmision": "2026-01-16T09:00:00-06:00",
      "emisor": "3101234567",
      "receptor": "3109876543",
      "rehearsal": true,
      "referencias": [
        {
          "tipoDoc": "01",
          "numero": "50615012600310123456700100001010000000001<8dígitos>",
          "fechaEmision": "2026-01-15T10:00:00-06:00",
          "codigo": "01",
          "razon": "Anulacion total solicitada"
        }
      ]
    },
    {
      "clave": "50615012600310123456700100001010000000001<8dígitos>",
      "tipoDoc": "MR",
      "fechaEmision": "2026-02-10T09:00:00-06:00",
      "rehearsal": true,
      "emisor": "3101234567",
      "receptor": "3109876543",
      "mensaje": "1",
      "numeroConsecutivoReceptor": "00100001050000000001"
    }
  ]
}
```

Salida: `{ "violaciones": [ { "documentoId": "<clave>", "campo": "referencia.codigo",
"mensaje": "codigo \"05\" fuera del conjunto del par (03, 01): {01, 02, 13, 14, 15, 16, 99}" } ] }`.
`rehearsal` es booleano obligatorio (sin `undefined` ambiguo) y un escenario que mezcle
`true`/`false` entre documentos es violación. Los issues Zod de `InformacionReferencia`
se transforman con el adaptador `{documentoId = documento.clave, campo =
issue.path.join('.') || '(root)', mensaje = issue.message}`.

### Aclaración sobre la FEC

En la realidad la FEC respalda compras con proveedores no obligados a emitir FE. La FEC
del escenario de ensayo referencia la FE del escenario con el par `("08","01")` y
`Codigo 04`: **ejercita el pipeline (XML + XSD + grafo), no modela un caso de uso
fiscal completo**. Por divergencia documentada en `add-coherent-reference-rehearsal`
(Design D1/D7): la variante exact-FEC restringe `TipoDocIR` a `06/07/14/99`, así que la
pata FEC usa el builder genérico `buildFacturaCompraXml` con la referencia validada por
`InformacionReferenciaSchema`; el XML Emisor es el proveedor de la FE y el Receptor
(XML) y el segmento contribuyente de la clave son el comprador (`document-identity`,
"08": la FEC la genera y firma su comprador).

### Integración con los bundles

El generador escribe por documento `<outDir>/<dir>/` con `documento.exact.json` (la
entrada exacta consumida), `unsigned.xml` y `rehearsal.json` (solo escenarios de ensayo).
El nombre del directorio es la clave del documento, salvo el MR: `MensajeReceptor-<consecutivo>`.
La integración con los bundles de `add-sandbox-evidence-bundle` es por archivo: el caller
proyecta cada `documento.exact.json` al `invoice.json` del run del runner; el generador
no invoca al runner y el runner no conoce este módulo.

## Pendientes antes de producto real

1. Ejecutar FE real y obtener respuesta terminal, preservando clave, solicitud y respuesta.
2. Ejecutar los demás tipos con referencias fiscales válidas y evidencia individual.
3. Verificación criptográfica independiente y prueba de alteración posterior a firma.
4. Validación contable de precisión, exoneraciones, compra, exportación y REP aplicables al negocio.
5. Outbox y reconciliación durables, numeración transaccional e aislamiento multiempresa de aplicación.
6. Ensayar recuperación tras caída del proceso, secretos rotados y respaldo/restauración antes de producción.
