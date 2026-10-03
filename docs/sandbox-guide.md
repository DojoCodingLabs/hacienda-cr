# Tu primera factura en sandbox

[← Documentación](../README.md#documentación) · [Integración en producción](production-integration.md) · [Referencia](reference.md)

Este recorrido conecta los datos de una venta con una factura, calcula sus totales, valida el XML, firma y envía a sandbox, y guarda la respuesta de Hacienda. El [ejemplo ejecutable](../packages/sdk/examples/sandbox.mjs) usa las funciones públicas del SDK y siempre selecciona `Environment.Sandbox`.

## Preparar el entorno

Necesitás Node.js 22+ y pnpm 9.15.4 para ejecutar el ejemplo desde este repositorio:

```bash
pnpm install
pnpm build
```

También podés copiar `sandbox.mjs` y `order.json` a una carpeta de tu aplicación e instalar `@dojocoding/hacienda-sdk@^0.4.0` con npm. Este ejemplo requiere las entradas y APIs de 0.4.0; no funciona con 0.2.x. Es un archivo `.mjs`: Node lo ejecuta como ESM, sin compilador TypeScript ni runner adicional. En ese caso, ajustá las rutas de los comandos siguientes.

La preparación y validación son locales. Para enviar o consultar estados necesitás la contraseña IDP de **sandbox** del emisor. Para enviar necesitás además su certificado `.p12` y PIN. Este ejemplo no registra contribuyentes ni obtiene certificados.

## Conectar los datos de la venta

Copiá el [pedido de ejemplo](../packages/sdk/examples/order.json) a una carpeta temporal:

```bash
mkdir -p /tmp/hacienda-sandbox
cp packages/sdk/examples/order.json /tmp/hacienda-sandbox/order.json
```

Los nombres, identificaciones, actividad, CABYS y tarifa son datos ilustrativos para probar la estructura. Antes de enviar, reemplazalos por los datos correspondientes a tu operación de sandbox; la validación local no confirma registros, clasificación fiscal ni aceptación de Hacienda.

| Datos de tu producto                 | Entrada del ejemplo                                                                 |
| ------------------------------------ | ----------------------------------------------------------------------------------- |
| Proveedor del sistema de facturación | `proveedorSistemas`, identificación del proveedor real                              |
| Empresa que vende                    | `emisor`, incluyendo identificación, correo y ubicación con `otrasSenas`            |
| Actividad del emisor                 | `codigoActividadEmisor`, código de seis dígitos; es distinto del CABYS del artículo |
| Cliente                              | `receptor`, con los datos disponibles del comprador                                 |
| Artículos o servicios                | `lineItems`, con CABYS de 13 dígitos, cantidad, unidad, precio y detalle            |
| Clasificación para los totales       | `esServicio: true` para servicios; `false` para mercancías                          |
| Impuestos y descuentos               | `impuesto` y `descuento` en cada línea; el SDK calcula sus montos                   |
| Condiciones del cobro                | `condicionVenta`, un código `medioPago` y, cuando corresponda, `plazoCredito`       |

El ejemplo usa un único código `medioPago: "01"` en el pedido simplificado.
Lo transforma a `resumenFactura.medioPago: [{ tipoMedioPago: "01", totalMedioPago: 113000 }]`
en la factura completa. El código `99` también necesita `medioPagoOtros`.
Para varios medios, adaptá esa construcción con las asignaciones de tu pedido:
el SDK recibe de una a cuatro entradas con sus montos dentro de
`resumenFactura.medioPago`, no un arreglo de códigos en la raíz. Revisá la
[migración de entradas](../MIGRATION.md) y las [notas 0.4.0](../packages/sdk/MIGRATION-v4.4.md).
El recorrido calcula una venta en CRC sin otros cargos; para otras operaciones,
adaptá el resumen y su conciliación antes de construir el documento.

La entrada simplificada admite IVA ordinario (`impuesto[].codigo: "01"`) y los campos de línea que recibe `calculateLineItemTotals()`, sin `numeroLinea` ni montos calculados. `esServicio` debe ser un booleano JSON (`true` o `false`), no texto. El ejemplo rechaza campos de pedido, línea, impuesto o exoneración que su mapping no conserva, incluyendo `resumenFactura`, `otrosCargos` y `unidadMedidaComercial`, antes de reservar un consecutivo. Para moneda extranjera, regímenes especiales o campos adicionales, adaptá el mapping y validá la factura completa con el SDK; no agregues esos campos al pedido esperando que se transmitan automáticamente.

## Generar y revisar

```bash
node packages/sdk/examples/sandbox.mjs prepare \
  /tmp/hacienda-sandbox/order.json /tmp/hacienda-sandbox/run-001
```

El comando calcula líneas y resumen, asigna un consecutivo, genera la clave, valida los datos y verifica el XML contra el XSD v4.4 incluido. Guarda `invoice.json` y `unsigned.xml`. Con el pedido original, el total es **₡113.000**: ₡100.000 de venta más ₡13.000 de IVA. No hace solicitudes de red.

Usá un directorio nuevo por factura. Si ya existe, el comando falla para evitar sobrescribir un documento. Una preparación que falla puede dejar un directorio vacío y consumir un número; corregí la entrada y usá otro directorio, conservando el contador.

El contador del ejemplo vive en `.sandbox-sequences/<tipo>-<cedula>/` dentro del directorio desde el que ejecutás Node. Separa emisores y sirve para este recorrido local. Conservá esa carpeta entre ejecuciones y ejecutá siempre desde el mismo lugar. No mezcles este contador con otros sistemas de facturación para la misma empresa, sucursal y terminal; coordiná la numeración. En una aplicación distribuida, usá la estrategia de la [guía de producción](production-integration.md#consecutivos-y-aislamiento-por-empresa).

## Firmar y enviar

Suministrá los secretos con tu mecanismo habitual de variables de entorno. En una terminal zsh podés capturarlos sin escribirlos en el historial:

```bash
read -rs 'HACIENDA_PASSWORD?Contraseña IDP sandbox: '
export HACIENDA_PASSWORD
read -rs 'HACIENDA_P12_PIN?PIN del certificado: '
export HACIENDA_P12_PIN
export HACIENDA_P12_PATH="/ruta/al/certificado-sandbox.p12"

node packages/sdk/examples/sandbox.mjs submit /tmp/hacienda-sandbox/run-001
```

El comando autentica al emisor de `invoice.json`, firma su XML y valida la estructura de la firma. Antes del POST guarda `signed.xml`, `request.json` y `attempt.json`. Luego `submitAndWait()` consulta hasta un estado terminal y guarda `result.json`, incluyendo `status`, `accepted`, `responseXml` y el motivo de rechazo cuando está disponible.

La validación XSD de la firma comprueba su estructura; no verifica su autenticidad criptográfica ni sustituye la respuesta de Hacienda. SDK 0.4.0 no reintenta POST automáticamente. Las consultas GET mantienen los reintentos acotados del cliente. `submitAndWait()` tiene un presupuesto de 60 segundos para envío y polling; cada request HTTP tiene su propio presupuesto predeterminado de 30 segundos.

Una respuesta `aceptado` completa el envío. `rechazado` requiere revisar el motivo. `error` también es terminal para el SDK, pero debe investigarse por separado. Los dos últimos resultados dejan código de salida 1 y conservan los archivos para revisión.

## Recuperar el estado de la misma factura

Si vence el tiempo de espera, se pierde la conexión o el proceso se interrumpe, consultá la **misma clave**:

```bash
node packages/sdk/examples/sandbox.mjs status /tmp/hacienda-sandbox/run-001
```

Este comando autentica y consulta; no firma, no envía ni asigna otro consecutivo. Cuando existe `request.json`, toma su clave y emisor, aunque el borrador original haya cambiado. Guarda la última respuesta en `status.json`. El código de salida 0 indica que la consulta se completó; comprobá `status` para distinguir aceptación, rechazo, error o procesamiento pendiente. Si sigue `recibido` o `procesando`, repetí la consulta más tarde. Un 404 inmediato puede indicar que el documento todavía no fue indexado; no prueba por sí solo que el envío falló.

`submit` comprueba que el JSON no cambió respecto del XML preparado y no permite sobrescribir los archivos de un intento anterior. La presencia de `signed.xml`, `request.json` o `attempt.json` bloquea otro envío antes de autenticar, incluso si el proceso se interrumpió entre esas escrituras. Las respuestas de polling y consulta deben coincidir con la clave guardada antes de registrarse. Si encontrás un error antes del primer envío, preservá ese directorio y prepará la entrada corregida en otro; después de un intento, consultá y reconciliá antes de emitir cualquier documento nuevo. Conservá el directorio y revisá el estado antes de decidir una recuperación manual. No borres el marcador ni prepares otra factura para resolver un timeout. El ejemplo es un recorrido local; la reconciliación y los reintentos durables corresponden a tu aplicación.

## Usar la CLI o MCP en el mismo flujo

La CLI puede validar el `invoice.json` generado:

```bash
hacienda validate /tmp/hacienda-sandbox/run-001/invoice.json --json
hacienda submit /tmp/hacienda-sandbox/run-001/invoice.json --dry-run --json
```

Si elegís la CLI para enviarlo, hacelo en lugar del comando `submit` del ejemplo. Configurá explícitamente el perfil sandbox y los secretos:

```bash
hacienda auth login --cedula-type 02 --cedula 3101234567 \
  --environment sandbox --profile sandbox
hacienda submit /tmp/hacienda-sandbox/run-001/invoice.json --profile sandbox --json
```

Reemplazá tipo y cédula por los del emisor. La CLI usa el certificado de `--p12`, `HACIENDA_P12_PATH` o el perfil y el PIN de `--pin` o `HACIENDA_P12_PIN`. La CLI también usa el envío sin replay del SDK 0.4.0. Ante una respuesta incierta, consultá con `hacienda status <clave> --profile sandbox --json` antes de decidir otro envío.

MCP `draft_invoice` devuelve una plantilla con placeholders que debés completar antes de llamar `create_invoice`. Este último devuelve XML **sin firmar** y asigna un consecutivo local. Guardá su XML y clave; completá firma y envío con funciones del SDK. `hacienda sign` puede firmar ese XML, pero `hacienda submit` recibe una factura JSON completa, no XML firmado ni el JSON simplificado de MCP. Ver [configuración y autenticación MCP](../packages/mcp/README.md#authentication-and-document-lifecycle).

## Resolver problemas frecuentes

| Resultado                                | Qué revisar                                                                                     |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Error de entrada o XSD                   | Ruta del campo indicada; proveedor, ubicación, CABYS, pagos y totales. Corregí antes de enviar. |
| Fallo de autenticación / 401             | Credenciales y ambiente del emisor. Sandbox y producción tienen configuraciones distintas.      |
| Fallo de firma                           | Ruta y contenido del `.p12`, PIN y certificado correspondiente al emisor.                       |
| 409                                      | La clave ya existe. Consultá su estado y compará con el documento guardado.                     |
| Timeout / error de red después de enviar | Consultá la clave existente y conservá request, XML y marcador del intento.                     |
| Bloqueo de consecutivos                  | Verificá que no haya otro escritor. No retires un lock por haber vencido el timeout.            |
| Rechazo de Hacienda                      | Revisá `rejectionReason` y `responseXml`; corregí la causa mediante el flujo de tu producto.    |

El ejemplo permite verificar localmente datos, XSD y firma; la aceptación real requiere ejecutar el envío con tus credenciales sandbox.
