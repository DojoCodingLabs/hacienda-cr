# Integrar facturación en tu producto

[← Documentación](../README.md#documentación) · [Recorrido sandbox](sandbox-guide.md) · [Referencia SDK](reference.md)

Esta guía describe una arquitectura de aplicación basada en el código actual del toolkit. Las tablas y el flujo propuesto son decisiones de integración para tu backend; el SDK aporta las operaciones de autenticación, generación, validación, firma y API. Tu producto administra pedidos, empresas, persistencia, trabajos pendientes y entrega al cliente.

## Elegir el punto de entrada

| Herramienta | Capacidades actuales                                                                                  | Uso en tu producto                                   |
| ----------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| SDK         | Builders de los documentos listados en el README, firma, envío y consulta                             | Backend de SaaS, ecommerce, POS o ERP                |
| CLI         | `submit` recibe JSON de Factura Electrónica; `sign` firma XML; consultas por perfil                   | Operación y scripts controlados                      |
| MCP         | `draft_invoice` prepara una plantilla; `create_invoice` genera XML sin firmar; consultas autenticadas | Asistente con revisión de datos y handoff al backend |

La CLI ofrece plantillas de otros documentos, pero su comando `submit` actualmente valida `FacturaElectronicaSchema` y usa `buildFacturaXml`. Para enviar otros tipos, usá el builder correspondiente del SDK y construí su solicitud de envío. `HaciendaClient` cubre autenticación y claves; XML, firma y API se invocan como funciones independientes. `HttpClient` recibe un `TokenManager`; también podés usar `bootstrapClient()` para obtener un cliente autenticado desde un perfil guardado.

## Conectar un pedido con su documento

Para ecommerce, procesá el evento de pago confirmado que tu producto considera definitivo. Para POS, usá el cierre de venta; para suscripciones, el cobro de la renovación. Definí esa regla una vez para que eventos repetidos o concurrentes no emitan varias facturas de la misma operación.

1. Recibí el evento, verificá la empresa y guardá una intención de facturación con una clave de idempotencia de tu aplicación.
2. En una transacción, reservá el consecutivo y guardá la relación entre pedido, empresa y documento.
3. Copiá los datos de emisor, receptor, artículos, impuestos y pagos a una versión del documento. Calculá totales con `calculateLineItemTotals()` y `calculateInvoiceSummary()`.
4. Generá una sola clave y fecha de emisión. Guardá el JSON validado, XML y metadatos antes del envío.
5. Un worker firma, valida el XML firmado, guarda la solicitud y registra el intento antes del POST.
6. Registrá la respuesta inicial y programá consultas hasta un estado terminal. Guardá la respuesta XML y actualizá el pedido.
7. Entregá al comprador los documentos mediante el canal de tu producto y registrá esa entrega por separado.

Este flujo permite responder rápido al checkout o caja mientras el backend continúa el procesamiento. El toolkit no incluye una cola durable, un almacén de documentos, envío de correo ni un generador de PDF.

## Guardar lo necesario para recuperar

Una estructura mínima de persistencia puede usar estas entidades:

| Entidad   | Campos sugeridos y restricciones                                                                                            |
| --------- | --------------------------------------------------------------------------------------------------------------------------- |
| Intención | `tenantId`, `environment`, `operationId`, `purpose`; restricción única sobre esa combinación                                |
| Contador  | `tenantId`, `issuerId`, `environment`, `documentType`, `branch`, `pos`, `nextSequence`                                      |
| Documento | Intención, clave única por ambiente, consecutivo, fecha, versión de entrada, XML firmado, estado local y estado de Hacienda |
| Intento   | Documento, fecha de inicio, solicitud guardada, respuesta HTTP o error de transporte                                        |
| Consulta  | Documento, fecha, estado, respuesta XML, próximo intento y error de consulta si hubo                                        |

`purpose` permite distinguir una factura de una nota de crédito o una renovación. Guardá la clave exacta: `buildClave()` genera un código de seguridad aleatorio cuando no lo especificás, por lo que volver a llamarlo no reproduce necesariamente el mismo documento.

Después de iniciar el envío, conservá una versión inmutable de la solicitud. Evitá regenerar el XML desde un pedido que pudo cambiar. Las restricciones únicas y la transacción de tu aplicación deben impedir que dos workers creen documentos distintos para la misma intención. El SDK no implementa idempotencia a nivel de pedidos.

## Consecutivos y aislamiento por empresa

`getNextSequence(documentType, branch, pos, { configDir })` usa un archivo `sequences.json` y un lock local. La clave interna es `documentType-branch-pos`; **no incluye empresa, perfil ni ambiente**. Cambiar de perfil CLI o MCP no crea un contador separado. MCP usa actualmente el directorio predeterminado y sucursal `001` / terminal `00001`.

En una integración local con SDK, podés separar contadores mediante `configDir` por emisor y ambiente. En un backend con múltiples procesos, hosts o contenedores, reservá el consecutivo con una transacción y actualización atómica en tu base de datos, con el alcance de la tabla anterior. Coordiná todos los sistemas que emitan para la misma empresa, sucursal y terminal.

Usá ese mismo número para `numeroConsecutivo` y `buildClave({ sequence, branch, pos, ... })`. Guardá la reserva y el documento de manera durable. No reinicies contadores ni reutilices números para resolver fallos de envío. Un lock local tampoco coordina archivos distintos o discos efímeros. Ante un lock abandonado, verificá que su escritor terminó antes de retirarlo manualmente.

## Mostrar estados útiles al usuario

Separá el estado local de tu trabajo del estado devuelto por Hacienda:

| Estado observado                          | Comportamiento del producto                                                                |
| ----------------------------------------- | ------------------------------------------------------------------------------------------ |
| Preparando / validación fallida           | Mostrar campos que requieren corrección; todavía no iniciar envío                          |
| XML firmado / envío pendiente             | Documento guardado y trabajo pendiente en el backend                                       |
| POST recibido / `recibido` / `procesando` | Mostrar procesamiento pendiente y seguir consultando                                       |
| `aceptado`                                | Registrar aceptación, conservar respuesta y habilitar el flujo de entrega                  |
| `rechazado`                               | Mostrar el motivo disponible y ofrecer el flujo de corrección correspondiente              |
| `error`                                   | Registrar un estado terminal del SDK e investigar la respuesta; no confundirlo con rechazo |
| Timeout o respuesta perdida               | Mostrar resultado pendiente de confirmar y reconciliar la misma clave                      |

`submitDocument()` devuelve el estado HTTP y la ubicación de la recepción. La recepción del POST no implica aceptación. `submitAndWait()` consulta hasta `aceptado`, `rechazado` o `error`; `timeoutMs` limita el envío y polling juntos (60 segundos por defecto). Su opción `signal` permite cancelar requests y esperas. La autenticación inicial y la firma realizadas antes de invocarlo quedan fuera de ese presupuesto.

Para el recorrido local, `submitAndWait()` es conveniente. Para trabajos durables, usá `submitDocument()` una vez y persistí consultas con `getStatus()` entre ejecuciones del worker. Podés usar `isTerminalStatus()` y `extractRejectionReason()` para interpretar las respuestas. No mantengas abierto el request del checkout durante todo el polling.

## Reintentos y resultados inciertos

En SDK 0.4.0, `HttpClient` no reintenta POST/PATCH automáticamente y
`submitDocument()` desactiva explícitamente el replay. GET/PUT/DELETE conservan
hasta tres reintentos con backoff ante red y estados 5xx; no reintentan 4xx,
incluyendo 429. No envuelvas una operación de envío con `withRetry()`: ese
helper reintentaría el POST ante un resultado incierto. Envolver GET con otro
`withRetry()` también puede multiplicar los intentos que ya administra el cliente.

Cada request HTTP tiene un presupuesto de 30 segundos que incluye autenticación,
reintentos y lectura de la respuesta. Podés ajustarlo en el cliente:

```ts
import { HttpClient } from "@dojocoding/hacienda-sdk";

const httpClient = new HttpClient({
  envConfig,
  tokenManager,
  requestTimeoutMs: 15000,
  retryOptions: { maxRetries: 3 }, // Para métodos que admiten reintentos
});
```

`submitDocument()` y `getStatus()` aceptan `{ signal }` como tercer argumento.
`submitAndWait()` también admite `signal` en sus opciones. El timeout total de
esta última operación puede vencer antes del presupuesto de un request. TokenManager
tiene un límite independiente de 30 segundos por solicitud de tokens.

Si inyectás `fetchFn`, propagá y respetá la señal recibida. El SDK rechaza una
operación cancelada y detiene sus siguientes requests, pero un transporte que
ignore la señal puede continuar su propio I/O. Una cancelación después del POST
sigue siendo un resultado incierto que requiere consultar la misma clave.

| Situación                       | Recuperación de la aplicación                                                                |
| ------------------------------- | -------------------------------------------------------------------------------------------- |
| Red o 5xx después del POST      | Guardar incertidumbre y consultar la clave original antes de decidir otro envío              |
| 409                             | Consultar la clave existente y reconciliar con el documento guardado; no asignar otra clave  |
| 404 inmediato durante consulta  | Reprogramar con backoff; el documento puede no estar indexado todavía                        |
| 401 o autenticación fallida     | Revisar credenciales/ambiente y renovar autenticación antes de continuar                     |
| 400 o rechazo                   | Conservar el detalle; corregir la causa sin reintentar ciegamente la misma entrada           |
| 429                             | Reprogramar desde la aplicación y respetar `Retry-After` si tu capa de transporte lo captura |
| Tiempo de envío/polling agotado | Continuar consultas desde el trabajo durable con la misma clave                              |

Un 404 aislado no confirma que el POST nunca llegó. Definí una ventana de reconciliación y revisión operativa para resultados que no se puedan confirmar. Si decidís repetir un envío, conservá la misma identidad y solicitud; no generes un comprobante nuevo automáticamente para resolver la incertidumbre.

El rate limiter del SDK pertenece a cada `HttpClient`. Con varias réplicas, tu aplicación debe coordinar límites globales; crear más clientes no ofrece una cuota global compartida.

## Credenciales, perfiles y despliegue

Guardá credenciales por empresa y ambiente en el almacén de secretos de tu backend. Seleccioná el emisor autorizado a partir del tenant autenticado. Conservá `TokenManager` / `HttpClient` por emisor y ambiente; no compartas tokens entre empresas. El ciclo de refresh es automático dentro del manager, pero no reemplaza el manejo de credenciales inválidas o revocadas.

Los perfiles locales almacenan ambiente, identificación y rutas. La contraseña IDP y el PIN se resuelven desde `HACIENDA_PASSWORD` y `HACIENDA_P12_PIN`; cambiar de perfil no cambia esos secretos del proceso. Para scripts de varias empresas, suministrá los secretos correctos para cada ejecución. MCP cachea clientes por nombre de perfil: reiniciá el servidor después de cambiar un perfil o sus credenciales para descartar el cliente anterior.

El backend debe ejecutar en Node.js 22+ con soporte ESM. Mantené archivos y claves privadas fuera del frontend y del repositorio. En contenedores o funciones con disco efímero, usá almacenamiento durable para contadores, documentos e intentos. El ejemplo sandbox guarda estos datos en disco para facilitar la revisión local.

## Devoluciones, compras y asistentes

Para una devolución, creá una intención separada relacionada con la factura original. Usá `buildNotaCreditoXml()` con `informacionReferencia`, guardá la relación y procesá firma, envío y consulta con la misma arquitectura. Para otros documentos, revisá los campos de su tipo y las [notas v4.4](../packages/sdk/MIGRATION-v4.4.md); no todos usan la misma entrada de Factura Electrónica.

En un ERP, almacená compras y mensajes de receptor como documentos relacionados, conservando la referencia y su estado. El SDK aporta builders, pero tu producto decide el flujo de revisión y la operación que origina cada documento.

En un asistente, completá los placeholders de `draft_invoice` y revisá proveedor, emisor, receptor, líneas y pagos antes de `create_invoice`. Esta herramienta genera XML sin firmar y consume un consecutivo local. Guardá el resultado antes del handoff y evitá llamar otra vez a `create_invoice` como reintento de envío. Integrá la firma y el POST en el backend con la identidad ya generada. La [guía MCP](../packages/mcp/README.md) explica qué consultas necesitan credenciales.

## Verificar la integración antes de desplegar

Ejecutá el [recorrido sandbox](sandbox-guide.md) con tus datos y confirmá en tu producto la relación entre pedido, documento y respuesta. Probá eventos repetidos, dos workers concurrentes, reinicio después del POST, respuesta perdida, procesamiento pendiente, rechazo y una devolución referenciada. Verificá que cada recuperación conserva la clave y que los documentos se siguen consultando después de reiniciar el worker.

Registrá identificadores de operación, tenant, ambiente, clave, intento y tiempos para investigar problemas. Medí trabajos pendientes, demora hasta estado terminal, fallos de autenticación y rechazos. Protegé los documentos y evitá registrar contraseña, PIN, tokens o claves privadas. Mantené el estado de entrega al cliente separado del resultado de Hacienda para poder repetir una entrega sin emitir otra factura.
