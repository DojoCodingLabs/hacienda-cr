# Referencia de Hacienda CR

[← Volver al README](../README.md)

Ejemplos y referencia detallada del SDK, la CLI y el servidor MCP.

Para ejecutar un flujo completo, seguí [Tu primera factura en sandbox](sandbox-guide.md).
Para integrarlo con pedidos, empresas y workers, consultá la [guía de producción](production-integration.md).
Los cambios de entradas y validación están en las [notas v4.4](../packages/sdk/MIGRATION-v4.4.md).

## SDK — Documentación completa

### HaciendaClient

El punto de entrada para autenticación y generación de claves. Las operaciones de XML, firma y API se usan como funciones independientes.

```ts
import { HaciendaClient, Environment, IdType } from "@dojocoding/hacienda-sdk";

const client = new HaciendaClient({
  // Requerido
  environment: Environment.Sandbox, // Environment.Sandbox | Environment.Production
  credentials: {
    idType: IdType.PersonaJuridica, // PersonaFisica, PersonaJuridica, DIMEX, NITE
    idNumber: "3101234567", // Cédula de 9-12 dígitos
    username: process.env.HACIENDA_USERNAME!, // Full issued IDP username.
    password: process.env.HACIENDA_PASSWORD!,
  },

  // Opcional
  p12Path: "/ruta/al/certificado.p12", // Para firma digital
  p12Pin: process.env.HACIENDA_P12_PIN, // PIN del .p12
  // fetchFn: customFetch, // Implementación fetch personalizada (definila antes de usarla)
});
```

Las opciones se validan al instanciar con Zod. Si algo está mal, lanza `ValidationError` con detalles claros.

### Autenticación OAuth2

Hacienda usa OAuth2 ROPC (Resource Owner Password Credentials). El SDK maneja todo el ciclo de vida del token automáticamente.

```ts
// Autenticarse (obtiene access + refresh token)
await client.authenticate();

// Verificar estado
console.log(client.isAuthenticated); // true

// Obtener token válido (refresca automáticamente si expiró)
const token = await client.getAccessToken();

// Forzar re-autenticación
client.invalidate();
await client.authenticate();
```

**Ciclo de vida del token:**

- Access token expira en ~5 minutos (se cachea en memoria, se refresca 30s antes)
- Refresh token dura ~10 horas
- `getAccessToken()` maneja el refresh de forma transparente

**Ambientes de Hacienda:**

| Ambiente     | URL base de la API                                         | IDP Realm  | Client ID  |
| ------------ | ---------------------------------------------------------- | ---------- | ---------- |
| `sandbox`    | `api.comprobanteselectronicos.go.cr/recepcion-sandbox/v1/` | `rut-stag` | `api-stag` |
| `production` | `api.comprobanteselectronicos.go.cr/recepcion/v1/`         | `rut`      | `api-prod` |

### Creación de documentos

Ejemplo completo de una Factura Electrónica — el flujo es igual para los demás tipos:

```ts
import {
  buildFacturaXml,
  validateFacturaInput,
  calculateLineItemTotals,
  calculateInvoiceSummary,
  buildClave,
  DocumentType,
  Situation,
} from "@dojocoding/hacienda-sdk";
import type { LineItemInput } from "@dojocoding/hacienda-sdk";

// 1. Definir las líneas de detalle
const lineas: LineItemInput[] = [
  {
    numeroLinea: 1,
    codigoCabys: "8310100000000", // Código CABYS (13 dígitos)
    cantidad: 2,
    unidadMedida: "Unid",
    detalle: "Servicios de desarrollo web",
    precioUnitario: 50000,
    esServicio: true,
    impuesto: [
      {
        codigo: "01", // IVA
        codigoTarifaIVA: "08", // Tarifa general 13%
        tarifa: 13,
      },
    ],
  },
  {
    numeroLinea: 2,
    codigoCabys: "4321000000000",
    cantidad: 1,
    unidadMedida: "Unid",
    detalle: "Laptop",
    precioUnitario: 500000,
    esServicio: false,
    impuesto: [
      {
        codigo: "01",
        codigoTarifaIVA: "08",
        tarifa: 13,
      },
    ],
    descuento: [
      {
        codigoDescuento: "07",
        montoDescuento: 25000,
        naturalezaDescuento: "Descuento por volumen",
      },
    ],
  },
];

// 2. Calcular totales por línea (agrega montoTotal, subTotal, impuestoNeto, etc.)
const lineasCalculadas = lineas.map(calculateLineItemTotals);

// 3. Calcular resumen de factura (ResumenFactura)
const resumen = calculateInvoiceSummary(lineasCalculadas);

// 4. Generar la clave numérica
const clave = buildClave({
  date: new Date(),
  taxpayerId: "3101234567",
  documentType: DocumentType.FACTURA_ELECTRONICA,
  sequence: 1,
  situation: Situation.NORMAL,
});

// 5. Consecutivo
const numeroConsecutivo = "00100001010000000001";

// 6. Armar la factura y generar XML
const factura = {
  clave,
  proveedorSistemas: "3101234567",
  codigoActividadEmisor: "620100",
  numeroConsecutivo,
  fechaEmision: new Date().toISOString(),
  emisor: {
    nombre: "Mi Empresa S.A.",
    identificacion: { tipo: "02", numero: "3101234567" },
    correoElectronico: "facturacion@miempresa.co.cr",
    ubicacion: { provincia: "1", canton: "01", distrito: "01", otrasSenas: "San José centro" },
  },
  receptor: {
    nombre: "Cliente S.R.L.",
    identificacion: { tipo: "02", numero: "3109876543" },
    correoElectronico: "pagos@cliente.co.cr",
  },
  condicionVenta: "01", // Contado
  detalleServicio: lineasCalculadas,
  resumenFactura: {
    ...resumen,
    medioPago: [{ tipoMedioPago: "01", totalMedioPago: resumen.totalComprobante }],
  },
};

const validacion = validateFacturaInput(factura);
if (!validacion.valid) throw new Error(JSON.stringify(validacion.errors));
// La validación anterior comprueba los códigos y campos antes del builder tipado.
const xml = buildFacturaXml(factura as Parameters<typeof buildFacturaXml>[0]);
```

**Validación de entrada y XML:**

```ts
import { validateFacturaInput, validateDocumentXml } from "@dojocoding/hacienda-sdk";

const resultado = validateFacturaInput(factura);
if (!resultado.valid) {
  for (const err of resultado.errors) {
    console.error(`${err.path}: ${err.message}`);
  }
}

const esquema = await validateDocumentXml(xml); // Permite un borrador sin firma
if (!esquema.valid) console.error(esquema.issues);
// Antes de enviar: await validateDocumentXml(xmlFirmado, { requireSignature: true })
```

`validateDocumentXml()` usa los XSD v4.4 incluidos, sin acceder a la red. La
firma presente se valida estructuralmente; no verifica su autenticidad
criptográfica ni garantiza aceptación de Hacienda.

### Cálculo de IVA

Utilidades para calcular impuestos, totales por línea y resúmenes según la normativa de Hacienda. Todos los montos se redondean a 5 decimales.

```ts
import { round5, calculateLineItemTotals, calculateInvoiceSummary } from "@dojocoding/hacienda-sdk";
import type { LineItemInput, CalculatedLineItem, InvoiceSummary } from "@dojocoding/hacienda-sdk";

const item: LineItemInput = {
  numeroLinea: 1,
  codigoCabys: "8310100000000",
  cantidad: 3,
  unidadMedida: "Sp",
  detalle: "Horas de consultoría",
  precioUnitario: 75000,
  esServicio: true,
  impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: 13 }],
};

const calculado: CalculatedLineItem = calculateLineItemTotals(item);
// calculado.montoTotal      = 225000       (3 × ₡75.000)
// calculado.subTotal        = 225000       (sin descuentos)
// calculado.impuestoNeto    = 29250        (₡225.000 × 13%)
// calculado.montoTotalLinea = 254250       (₡225.000 + ₡29.250)

const resumen: InvoiceSummary = calculateInvoiceSummary([calculado]);
// resumen.totalServGravados  = 225000
// resumen.totalImpuesto      = 29250
// resumen.totalComprobante   = 254250
```

**Exoneraciones de IVA:**

```ts
const itemExonerado: LineItemInput = {
  ...item, // Campos del ejemplo anterior
  impuesto: [
    {
      codigo: "01",
      codigoTarifaIVA: "08",
      tarifa: 13,
      exoneracion: {
        tipoDocumento: "01",
        numeroDocumento: "AL-001-2025",
        nombreInstitucion: "01", // Código ilustrativo de institución, no un nombre libre
        fechaEmision: "2025-01-01T00:00:00",
        tarifaExonerada: 13, // Puntos de la tarifa; 13 de 13 en este ejemplo
      },
    },
  ],
};
```

**Tarifas de IVA soportadas:** 0%, 1%, 2%, 4%, 8%, 13%

### Clave numérica

Cada comprobante electrónico requiere una clave numérica única de 50 dígitos. El SDK la genera y parsea automáticamente.

**Estructura:** `[506][DDMMYY][cédula 12 dígitos][sucursal 3][terminal 5][tipo doc 2][consecutivo 10][situación 1][código seguridad 8]`

```ts
import { buildClave, parseClave, DocumentType, Situation } from "@dojocoding/hacienda-sdk";

// Generar clave
const clave = buildClave({
  date: new Date(2025, 6, 15), // Fecha local: 15 de julio
  taxpayerId: "3101234567",
  documentType: DocumentType.FACTURA_ELECTRONICA,
  sequence: 42,
  securityCode: "12345678", // Fijo solo para que este ejemplo sea reproducible
  situation: Situation.NORMAL,
  branch: "001", // Opcional, default "001"
  pos: "00001", // Opcional, default "00001"
});
// => "50615072500310123456700100001010000000042112345678"

// Parsear clave existente
const parsed = parseClave(clave);
// parsed.countryCode   => "506"
// parsed.date          => Date(2025-07-15)
// parsed.taxpayerId    => "003101234567"
// parsed.documentType  => "01"
// parsed.sequence      => 42
// parsed.situation     => "1"
// parsed.securityCode  => "12345678"
```

**Códigos de situación:**

- `1` Normal (envío estándar en línea)
- `2` Contingencia (fallo del sistema de Hacienda)
- `3` Sin Internet (fuera de línea)

### Firma digital XAdES-EPES

Todo XML enviado a Hacienda debe estar firmado con XAdES-EPES usando el certificado `.p12` del contribuyente (RSA 2048 + SHA-256). El SDK maneja todo el proceso de firma.

```ts
import { readFileSync } from "node:fs";
import { signXml, signAndEncode, loadP12 } from "@dojocoding/hacienda-sdk";

const p12Buffer = readFileSync("/ruta/al/certificado.p12");
const pin = process.env.HACIENDA_P12_PIN!;

// Firmar XML (retorna XML firmado como string)
const xmlFirmado = await signXml(xml, p12Buffer, pin);

// Firmar y codificar en Base64 (listo para enviar a la API)
const xmlBase64 = await signAndEncode(xml, p12Buffer, pin);

// Cargar .p12 para inspeccionar el certificado
const credenciales = await loadP12(p12Buffer, pin);
// credenciales.privateKey      — CryptoKey para firma
// credenciales.certificateDer  — Certificado codificado en DER
```

### Envío y consulta de estado

**Opción simplificada — `submitAndWait` (recomendada):**

Envía el documento y espera a que Hacienda lo procese. Maneja el polling automáticamente.

```ts
import {
  submitAndWait,
  HttpClient,
  TokenManager,
  getEnvironmentConfig,
  loadCredentials,
  Environment,
  IdType,
} from "@dojocoding/hacienda-sdk";

const envConfig = getEnvironmentConfig(Environment.Sandbox);
const tokenManager = new TokenManager({ envConfig });
await tokenManager.authenticate(
  loadCredentials({
    idType: IdType.PersonaJuridica,
    idNumber: "3101234567",
    username: process.env.HACIENDA_USERNAME!, // Full issued IDP username.
    password: process.env.HACIENDA_PASSWORD!,
  }),
);
const httpClient = new HttpClient({ envConfig, tokenManager });

const resultado = await submitAndWait(
  httpClient,
  {
    clave: factura.clave,
    fecha: factura.fechaEmision,
    emisor: {
      tipoIdentificacion: "02",
      numeroIdentificacion: "3101234567",
    },
    comprobanteXml: xmlBase64,
  },
  {
    pollIntervalMs: 3000, // Consultar cada 3 segundos (default)
    timeoutMs: 60000, // Timeout a 60 segundos (default)
    onPoll: (status, intento) => {
      console.log(`Intento ${intento}: ${status.status}`);
    },
  },
);

if (resultado.accepted) {
  console.log("¡Comprobante aceptado por Hacienda!");
} else {
  console.log("Estado terminal:", resultado.status, resultado.rejectionReason);
}
```

Los estados terminales son `aceptado`, `rechazado` y `error`. `timeoutMs` limita
el envío y polling juntos; `signal` permite cancelar requests y esperas. Un
timeout del pipeline lanza `ApiError`; conservá la clave y continuá consultando
con `getStatus()` antes de decidir otro envío. Ver [reintentos y recuperación](production-integration.md#reintentos-y-resultados-inciertos).

**Opción granular — control total:**

```ts
import { submitDocument, getStatus, isTerminalStatus } from "@dojocoding/hacienda-sdk";

// Enviar
const response = await submitDocument(httpClient, solicitud);

// Consultar estado
const status = await getStatus(httpClient, factura.clave);
if (isTerminalStatus(status.status)) {
  console.log("Estado final:", status.status);
}
```

**Listar y consultar comprobantes:**

```ts
import { listComprobantes, getComprobante } from "@dojocoding/hacienda-sdk";

const lista = await listComprobantes(httpClient, {
  offset: 0,
  limit: 10,
  fechaEmisionDesde: "2025-01-01",
  fechaEmisionHasta: "2025-12-31",
});

const detalle = await getComprobante(httpClient, factura.clave);
```

**Reintentos con backoff exponencial:**

`HttpClient` usa `withRetry()` para GET/PUT/DELETE ante red y 5xx; no reintenta
4xx. En 0.4.0, POST/PATCH no se reintentan automáticamente y `submitDocument()`
desactiva explícitamente el replay. Evitá envolver envíos con `withRetry()` o
duplicar las capas de retry. Configurá los reintentos de consultas en el cliente:

```ts
const httpClientConReintentos = new HttpClient({
  envConfig,
  tokenManager,
  retryOptions: { maxRetries: 3, initialDelayMs: 1000, backoffMultiplier: 2 },
});
```

Guardá la solicitud antes de enviar y reconciliá la misma clave ante un
resultado incierto. `requestTimeoutMs` configura el presupuesto HTTP (30 segundos
por defecto), incluyendo autenticación, reintentos y lectura de la respuesta. El helper
`withRetry()` está disponible para operaciones que no tengan reintentos propios.

### Consulta de contribuyentes

Buscá información de cualquier contribuyente usando la API pública de actividades económicas de Hacienda (no requiere autenticación):

```ts
import { lookupTaxpayer } from "@dojocoding/hacienda-sdk";

const info = await lookupTaxpayer("3101234567");
console.log(info.nombre); // "MI EMPRESA S.A."
console.log(info.tipoIdentificacion); // "02"
for (const actividad of info.actividades) {
  console.log(`${actividad.codigo}: ${actividad.descripcion} (${actividad.estado})`);
}
```

### Gestión de configuración

La configuración se almacena en `~/.hacienda-cr/config.toml` con soporte para múltiples perfiles (ej: sandbox, producción, distintas empresas).

```ts
import {
  loadConfig,
  saveConfig,
  listProfiles,
  deleteProfile,
  getNextSequence,
  resetSequence,
} from "@dojocoding/hacienda-sdk";

// Guardar un perfil
await saveConfig(
  {
    environment: "sandbox",
    cedula_type: "02",
    cedula: "3101234567",
    p12_path: "/ruta/al/certificado.p12",
  },
  "miempresa",
);

// Cargar un perfil
const config = await loadConfig("miempresa");

// Listar perfiles
const perfiles = await listProfiles();

// Eliminar un perfil
await deleteProfile("perfil-viejo");

// Gestión de consecutivos (numeración automática)
const opciones = { configDir: "/ruta/durable/sandbox/3101234567" };
const consecutivo = await getNextSequence("01", "001", "00001", opciones);
// Solo para un contador de prueba sin documentos emitidos:
await resetSequence("01", "001", "00001", 0, opciones);
```

El contador local se agrupa por tipo de documento, sucursal y terminal; no
incluye empresa, ambiente ni perfil. Aislá directorios en uso local y usá una
reserva transaccional en base de datos para múltiples hosts. No reinicies un
contador utilizado para emisión. Ver [consecutivos](production-integration.md#consecutivos-y-aislamiento-por-empresa).

**Seguridad:** Las contraseñas y PINs **nunca** se almacenan en archivos de configuración. Siempre van por variables de entorno:

- `HACIENDA_PASSWORD` — Contraseña del IDP
- `HACIENDA_P12_PIN` — PIN del certificado .p12

El usuario IDP se suministra como `credentials.username` o a `loadCredentials({
username, password })`, exactamente como lo emite Hacienda, con guiones y dominio.
No se infiere su número a partir de la cédula. Sin `username` se conserva el
formato legado de `buildUsername()`. En CLI/MCP, `HACIENDA_USERNAME` tiene
precedencia sobre `username` guardado en el perfil; la cédula fiscal se conserva
por separado. Cambiá usuario y contraseña juntos al cambiar de empresa o ambiente.

### Logging estructurado

Logger integrado con niveles configurables y soporte para JSON (ideal para producción).

```ts
import { Logger, LogLevel, noopLogger } from "@dojocoding/hacienda-sdk";

const logger = new Logger({
  level: LogLevel.DEBUG, // DEBUG, INFO, WARN, ERROR, SILENT
  format: "text", // "text" | "json"
  context: "mi-app",
});

logger.debug("Token refrescado", { expiresIn: 300 });
logger.info("Comprobante enviado", { clave: "50601..." });
logger.warn("Rate limit acercándose");
logger.error("Envío falló", { statusCode: 500 });

// Logger silencioso (suprime toda salida)
const silencioso = noopLogger;
```

### Manejo de errores

Todos los errores del SDK extienden `HaciendaError` para un manejo uniforme:

```ts
import {
  HaciendaError,
  ValidationError,
  ApiError,
  AuthenticationError,
  SigningError,
} from "@dojocoding/hacienda-sdk";

try {
  await client.authenticate();
  const xml = buildFacturaXml(factura);
  const firmado = await signAndEncode(xml, p12, pin);
  const resultado = await submitAndWait(httpClient, solicitud);
} catch (err) {
  if (err instanceof ValidationError) {
    // Fallo de validación (esquema Zod o reglas de negocio)
    console.error("Validación:", err.message, err.details);
  } else if (err instanceof AuthenticationError) {
    // Fallo de autenticación o ciclo de vida del token
    console.error("Auth:", err.message);
  } else if (err instanceof SigningError) {
    // Fallo de firma XAdES-EPES (certificado malo, PIN incorrecto, etc.)
    console.error("Firma:", err.message);
  } else if (err instanceof ApiError) {
    // Error HTTP/red de la API de Hacienda
    console.error("API:", err.message, err.statusCode, err.responseBody);
  } else if (err instanceof HaciendaError) {
    // Cualquier otro error del SDK
    console.error(`[${err.code}]`, err.message);
  }
}
```

**Códigos de error (`HaciendaErrorCode`):**

| Código                  | Descripción                                               |
| ----------------------- | --------------------------------------------------------- |
| `VALIDATION_FAILED`     | Falló validación de Zod o reglas de negocio               |
| `API_ERROR`             | La API REST de Hacienda retornó error o no fue alcanzable |
| `AUTHENTICATION_FAILED` | Falló autenticación o ciclo de vida del token             |
| `SIGNING_FAILED`        | Falló la operación de firma XAdES-EPES                    |
| `INTERNAL_ERROR`        | Error interno inesperado                                  |

---

## CLI — Referencia de comandos

```bash
npm install -g @dojocoding/hacienda-cli
```

Todos los comandos soportan `--json` para salida legible por máquinas.

### `hacienda auth login`

Autenticarse con el IDP de Hacienda y guardar el perfil.

```bash
hacienda auth login \
  --cedula-type 02 \
  --cedula 3101234567 \
  --environment sandbox \
  --profile default

# Contraseña por variable de entorno (recomendado)
# Copy the full issued username, including hyphens and domain.
export HACIENDA_USERNAME="cpf-01-1234-5678@stag.comprobanteselectronicos.go.cr"
export HACIENDA_PASSWORD="tu-contraseña"
hacienda auth login --cedula-type 01 --cedula 112345678
```

| Argumento       | Descripción                                                          |
| --------------- | -------------------------------------------------------------------- |
| `--cedula-type` | `01` (Física), `02` (Jurídica), `03` (DIMEX), `04` (NITE)            |
| `--cedula`      | Número de identificación                                             |
| `--username`    | Usuario IDP completo (o `HACIENDA_USERNAME`); se guarda en el perfil |
| `--password`    | Contraseña del IDP (o usar `HACIENDA_PASSWORD`)                      |
| `--environment` | `sandbox` (default) o `production`                                   |
| `--profile`     | Nombre del perfil (default: `default`)                               |

### `hacienda auth status`

Mostrar estado actual de autenticación.

```bash
hacienda auth status
hacienda auth status --profile produccion
hacienda auth status --json
```

### `hacienda auth switch`

Cambiar entre perfiles de autenticación.

```bash
hacienda auth switch            # Listar perfiles disponibles
hacienda auth switch produccion # Cambiar a un perfil específico
```

### `hacienda submit`

Enviar una Factura Electrónica JSON completa a Hacienda. Valida entrada y XSD,
firma, envía y consulta el estado terminal. Para otros tipos de documento, usá
el SDK; este comando no acepta XML firmado ni entradas MCP simplificadas.

```bash
hacienda submit factura.json --dry-run   # Vista previa del XML
hacienda submit factura.json             # Enviar de verdad
hacienda submit factura.json --json      # Salida JSON
hacienda submit factura.json --profile sandbox --p12 certificado.p12 --json
```

| Opción      | Uso y valor predeterminado                                                              |
| ----------- | --------------------------------------------------------------------------------------- |
| `file`      | Archivo JSON requerido                                                                  |
| `--dry-run` | Generar y validar XML sin autenticación, firma ni envío; default `false`                |
| `--profile` | Perfil de autenticación; default `default`                                              |
| `--p12`     | Ruta al certificado; precedencia: argumento, `HACIENDA_P12_PATH`, `p12_path` del perfil |
| `--pin`     | PIN; default `HACIENDA_P12_PIN`. Preferí la variable para evitar exposición en procesos |
| `--json`    | Salida estructurada; default `false`                                                    |

Para envío real necesitás `HACIENDA_PASSWORD`, certificado y PIN. Ante un
resultado incierto, consultá la misma clave con el mismo perfil antes de
decidir otro envío. Ver el [recorrido completo](sandbox-guide.md).

### `hacienda status`

Consultar el estado de procesamiento de un comprobante por su clave.

```bash
hacienda status 50601012400310123456700100001010000000001199999999
```

### `hacienda list`

Listar comprobantes recientes desde Hacienda.

```bash
hacienda list
hacienda list --limit 50 --offset 0
hacienda list --json
```

### `hacienda get`

Obtener detalle completo de un comprobante por su clave.

```bash
hacienda get 50601012400310123456700100001010000000001199999999
```

### `hacienda sign`

Firmar un documento XML con certificado .p12 (XAdES-EPES).

```bash
hacienda sign factura.xml --p12 cert.p12 --pin 1234 --output firmado.xml
hacienda sign factura.xml --p12 cert.p12 --pin 1234  # stdout

# Con variables de entorno
export HACIENDA_P12_PATH=/ruta/al/cert.p12
export HACIENDA_P12_PIN=1234
hacienda sign factura.xml --output firmado.xml
```

### `hacienda validate`

Validar un archivo de factura (JSON o XML) contra esquemas y reglas de negocio.

```bash
hacienda validate factura.json
hacienda validate documento.xml
hacienda validate factura.json --json
```

### `hacienda lookup`

Consultar actividades económicas de un contribuyente por cédula (sin autenticación).

```bash
hacienda lookup 3101234567
hacienda lookup 3101234567 --json
```

### `hacienda draft`

Crear interactivamente un borrador de factura JSON para envío.

```bash
hacienda draft --output factura.json                 # Modo interactivo
hacienda draft --no-interactive                      # Plantilla en blanco
hacienda draft --template nota-credito --output nc.json
```

**Plantillas:** `factura` (default), `nota-credito`, `nota-debito`, `tiquete`

### Variables de entorno

| Variable            | Descripción                           |
| ------------------- | ------------------------------------- |
| `HACIENDA_PASSWORD` | Contraseña del IDP para autenticación |
| `HACIENDA_P12_PIN`  | PIN del archivo de certificado .p12   |
| `HACIENDA_P12_PATH` | Ruta al archivo de certificado .p12   |

---

## MCP Server — Integración con IA

Consultá la [guía MCP](../packages/mcp/README.md#authentication-and-document-lifecycle)
para los parámetros actuales, placeholders y autenticación de consultas.
`create_invoice` devuelve XML sin firmar y consume un consecutivo local.
Las consultas de documentos requieren un perfil guardado y `HACIENDA_PASSWORD`
en el proceso del servidor; cada herramienta acepta `profile` (default `default`).

El paquete `@dojocoding/hacienda-mcp` expone el SDK como servidor MCP ([Model Context Protocol](https://modelcontextprotocol.io)), permitiendo que asistentes de IA generen borradores y XML de facturas de forma conversacional. `create_invoice` devuelve XML sin firmar; la firma y el envío se realizan con el SDK o la CLI.

### Configuración con Claude Desktop

Agregá esto al `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "hacienda-cr": {
      "command": "npx",
      "args": ["-y", "@dojocoding/hacienda-mcp"]
    }
  }
}
```

### Herramientas disponibles

| Herramienta       | Descripción                                                                                               |
| ----------------- | --------------------------------------------------------------------------------------------------------- |
| `create_invoice`  | Crear una Factura Electrónica desde datos estructurados. Calcula impuestos, genera clave y construye XML. |
| `check_status`    | Consultar estado de procesamiento por clave numérica de 50 dígitos.                                       |
| `list_documents`  | Listar comprobantes electrónicos recientes con filtros opcionales.                                        |
| `get_document`    | Obtener detalle completo de un comprobante por clave.                                                     |
| `lookup_taxpayer` | Consultar información de contribuyente por cédula.                                                        |
| `draft_invoice`   | Generar borrador de factura con valores por defecto.                                                      |

### Recursos disponibles

| URI                                   | Descripción                                              |
| ------------------------------------- | -------------------------------------------------------- |
| `hacienda://schemas/factura`          | Esquema JSON para creación de facturas                   |
| `hacienda://reference/document-types` | Tipos de comprobante, códigos y descripciones            |
| `hacienda://reference/tax-codes`      | Códigos de impuesto, tarifas de IVA y unidades de medida |
| `hacienda://reference/id-types`       | Tipos de identificación y reglas de validación           |

---
