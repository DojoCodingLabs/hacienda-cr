# hacienda-cr — Facturación Electrónica Costa Rica

<!-- SEO: facturación electrónica Costa Rica, comprobantes electrónicos, Hacienda API v4.4, SDK factura electrónica, firma digital XAdES, IVA Costa Rica -->

**El toolkit open-source más completo para facturación electrónica en Costa Rica.**\
SDK + CLI + Servidor MCP para emitir comprobantes electrónicos contra la API v4.4 del Ministerio de Hacienda.

[![npm version](https://img.shields.io/npm/v/@hacienda-cr/sdk.svg)](https://www.npmjs.com/package/@hacienda-cr/sdk)
[![CI](https://github.com/DojoCodingLabs/hacienda-cr/actions/workflows/ci.yml/badge.svg)](https://github.com/DojoCodingLabs/hacienda-cr/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/Licencia-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-22%2B-green.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](https://www.typescriptlang.org)

---

## ¿Por qué hacienda-cr?

Emitir facturas electrónicas en Costa Rica no debería ser un dolor de cabeza. Entre la autenticación OAuth2, la generación de XML con namespaces específicos, la firma digital XAdES-EPES, la clave numérica de 50 dígitos y el polling del estado... hay demasiada complejidad accidental.

**hacienda-cr** resuelve todo eso en un solo toolkit:

- **SDK** — Librería TypeScript con tipado estricto: auth, XML, firma digital, cálculo de IVA, envío y consulta.
- **CLI** — Herramienta de línea de comandos `hacienda` para emitir, firmar, validar y consultar desde la terminal.
- **MCP Server** — Servidor de Model Context Protocol para que asistentes de IA (Claude, etc.) emitan facturas por vos.

> Funciona con los 7 tipos de comprobante + Mensaje Receptor. Compatible con sandbox y producción.

---

## Empezá en 2 minutos

### Opción 1: SDK (para desarrolladores)

```bash
npm install @hacienda-cr/sdk
```

```ts
import { HaciendaClient, DocumentType, Situation } from "@hacienda-cr/sdk";

// 1. Crear el cliente
const client = new HaciendaClient({
  environment: "sandbox",
  credentials: {
    idType: "02", // Cédula Jurídica
    idNumber: "3101234567",
    password: process.env.HACIENDA_PASSWORD!,
  },
});

// 2. Autenticarse
await client.authenticate();

// 3. Generar la clave numérica
const clave = client.buildClave({
  date: new Date(),
  taxpayerId: "3101234567",
  documentType: DocumentType.FACTURA_ELECTRONICA,
  sequence: 1,
  situation: Situation.NORMAL,
});

// 4. Construir XML, firmar y enviar (ver ejemplo completo abajo)
```

### Opción 2: CLI (para facturar desde la terminal)

```bash
npm install -g @hacienda-cr/cli

# Autenticarse
hacienda auth login --cedula-type 02 --cedula 3101234567

# Crear borrador interactivo
hacienda draft --interactive

# Validar antes de enviar
hacienda validate factura.json

# Enviar (vista previa primero)
hacienda submit factura.json --dry-run

# Consultar contribuyente
hacienda lookup 3101234567
```

### Opción 3: MCP Server (para asistentes de IA)

```bash
npm install -g @hacienda-cr/mcp
hacienda-mcp
```

Le podés decir a Claude: _"Creá una factura de Mi Empresa S.A. (cédula 3101234567) a Cliente S.R.L. (cédula 3109876543) por 2 horas de consultoría a ₡50.000 cada una con IVA del 13%."_

---

## Tipos de comprobante soportados

| Código | Tipo de comprobante                   | Builder del SDK                |
| ------ | ------------------------------------- | ------------------------------ |
| `01`   | Factura Electrónica                   | `buildFacturaXml()`            |
| `02`   | Nota de Débito Electrónica            | `buildNotaDebitoXml()`         |
| `03`   | Nota de Crédito Electrónica           | `buildNotaCreditoXml()`        |
| `04`   | Tiquete Electrónico                   | `buildTiqueteXml()`            |
| `05`   | Factura Electrónica de Compra         | `buildFacturaCompraXml()`      |
| `06`   | Factura Electrónica de Exportación    | `buildFacturaExportacionXml()` |
| `07`   | Recibo Electrónico de Pago            | `buildReciboPagoXml()`         |
| —      | Mensaje Receptor (aceptación/rechazo) | `buildMensajeReceptorXml()`    |

---

## Tabla de contenidos

- [SDK — Documentación completa](#sdk--documentación-completa)
  - [HaciendaClient](#haciendaclient)
  - [Autenticación OAuth2](#autenticación-oauth2)
  - [Creación de documentos](#creación-de-documentos)
  - [Cálculo de IVA](#cálculo-de-iva)
  - [Clave numérica](#clave-numérica)
  - [Firma digital XAdES-EPES](#firma-digital-xades-epes)
  - [Envío y consulta de estado](#envío-y-consulta-de-estado)
  - [Consulta de contribuyentes](#consulta-de-contribuyentes)
  - [Gestión de configuración](#gestión-de-configuración)
  - [Logging estructurado](#logging-estructurado)
  - [Manejo de errores](#manejo-de-errores)
- [CLI — Referencia de comandos](#cli--referencia-de-comandos)
- [MCP Server — Integración con IA](#mcp-server--integración-con-ia)
- [Desarrollo](#desarrollo)
- [Licencia](#licencia)

---

## SDK — Documentación completa

### HaciendaClient

El punto de entrada principal. Orquesta autenticación, generación de claves y operaciones con la API.

```ts
import { HaciendaClient } from "@hacienda-cr/sdk";

const client = new HaciendaClient({
  // Requerido
  environment: "sandbox", // "sandbox" | "production"
  credentials: {
    idType: "02", // "01"=Física, "02"=Jurídica, "03"=DIMEX, "04"=NITE
    idNumber: "3101234567", // Cédula de 9-12 dígitos
    password: process.env.HACIENDA_PASSWORD!,
  },

  // Opcional
  p12Path: "/ruta/al/certificado.p12", // Para firma digital
  p12Pin: process.env.HACIENDA_P12_PIN, // PIN del .p12
  fetchFn: customFetch, // Implementación fetch personalizada
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
  calculateLineItemTotals,
  calculateInvoiceSummary,
  buildClave,
  DocumentType,
  Situation,
} from "@hacienda-cr/sdk";
import type { LineItemInput } from "@hacienda-cr/sdk";

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
        codigoTarifa: "08", // Tarifa general 13%
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
        codigoTarifa: "08",
        tarifa: 13,
      },
    ],
    descuento: [
      {
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
  codigoActividad: "620100",
  numeroConsecutivo,
  fechaEmision: new Date().toISOString(),
  emisor: {
    nombre: "Mi Empresa S.A.",
    identificacion: { tipo: "02", numero: "3101234567" },
    correoElectronico: "facturacion@miempresa.co.cr",
  },
  receptor: {
    nombre: "Cliente S.R.L.",
    identificacion: { tipo: "02", numero: "3109876543" },
    correoElectronico: "pagos@cliente.co.cr",
  },
  condicionVenta: "01", // Contado
  medioPago: ["01"], // Efectivo
  detalleServicio: lineasCalculadas,
  resumenFactura: resumen,
};

const xml = buildFacturaXml(factura);
```

**Validación de XML:**

```ts
import { validateFacturaInput } from "@hacienda-cr/sdk";

const resultado = validateFacturaInput(datosFactura);
if (!resultado.valid) {
  for (const err of resultado.errors) {
    console.error(`${err.path}: ${err.message}`);
  }
}
```

### Cálculo de IVA

Utilidades para calcular impuestos, totales por línea y resúmenes según la normativa de Hacienda. Todos los montos se redondean a 5 decimales.

```ts
import { round5, calculateLineItemTotals, calculateInvoiceSummary } from "@hacienda-cr/sdk";
import type { LineItemInput, CalculatedLineItem, InvoiceSummary } from "@hacienda-cr/sdk";

const item: LineItemInput = {
  numeroLinea: 1,
  codigoCabys: "8310100000000",
  cantidad: 3,
  unidadMedida: "Sp",
  detalle: "Horas de consultoría",
  precioUnitario: 75000,
  esServicio: true,
  impuesto: [{ codigo: "01", codigoTarifa: "08", tarifa: 13 }],
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
  // ...campos base
  impuesto: [
    {
      codigo: "01",
      codigoTarifa: "08",
      tarifa: 13,
      exoneracion: {
        tipoDocumento: "01",
        numeroDocumento: "AL-001-2025",
        nombreInstitucion: "MEIC",
        fechaEmision: "2025-01-01T00:00:00",
        porcentajeExoneracion: 100,
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
import { buildClave, parseClave, DocumentType, Situation } from "@hacienda-cr/sdk";

// Generar clave
const clave = buildClave({
  date: new Date("2025-07-15"),
  taxpayerId: "3101234567",
  documentType: DocumentType.FACTURA_ELECTRONICA,
  sequence: 42,
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
import { signXml, signAndEncode, loadP12 } from "@hacienda-cr/sdk";

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
import { submitAndWait, HttpClient } from "@hacienda-cr/sdk";

const httpClient = new HttpClient({
  baseUrl: "https://api.comprobanteselectronicos.go.cr/recepcion-sandbox/v1",
  getToken: () => client.getAccessToken(),
});

const resultado = await submitAndWait(
  httpClient,
  {
    clave: "50601...",
    fecha: new Date().toISOString(),
    emisor: {
      tipoIdentificacion: "02",
      numeroIdentificacion: "3101234567",
    },
    comprobanteXml: xmlBase64Firmado,
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
  console.log("Rechazado:", resultado.rejectionReason);
}
```

**Opción granular — control total:**

```ts
import { submitDocument, getStatus, isTerminalStatus } from "@hacienda-cr/sdk";

// Enviar
const response = await submitDocument(httpClient, solicitud);

// Consultar estado
const status = await getStatus(httpClient, "50601...");
if (isTerminalStatus(status.status)) {
  console.log("Estado final:", status.status);
}
```

**Listar y consultar comprobantes:**

```ts
import { listComprobantes, getComprobante } from "@hacienda-cr/sdk";

const lista = await listComprobantes(httpClient, {
  offset: 0,
  limit: 10,
  fechaEmisionDesde: "2025-01-01",
  fechaEmisionHasta: "2025-12-31",
});

const detalle = await getComprobante(httpClient, "50601...");
```

**Reintentos con backoff exponencial:**

```ts
import { withRetry } from "@hacienda-cr/sdk";

const resultado = await withRetry(() => submitDocument(httpClient, solicitud), {
  maxAttempts: 3,
  delayMs: 1000,
  backoff: "exponential",
});
```

### Consulta de contribuyentes

Buscá información de cualquier contribuyente usando la API pública de actividades económicas de Hacienda (no requiere autenticación):

```ts
import { lookupTaxpayer } from "@hacienda-cr/sdk";

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
} from "@hacienda-cr/sdk";

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
const consecutivo = await getNextSequence("02", "3101234567", "01", "001", "00001");
await resetSequence("02", "3101234567", "01", "001", "00001");
```

**Seguridad:** Las contraseñas y PINs **nunca** se almacenan en archivos de configuración. Siempre van por variables de entorno:

- `HACIENDA_PASSWORD` — Contraseña del IDP
- `HACIENDA_P12_PIN` — PIN del certificado .p12

### Logging estructurado

Logger integrado con niveles configurables y soporte para JSON (ideal para producción).

```ts
import { Logger, LogLevel, noopLogger } from "@hacienda-cr/sdk";

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
} from "@hacienda-cr/sdk";

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
npm install -g @hacienda-cr/cli
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
export HACIENDA_PASSWORD="tu-contraseña"
hacienda auth login --cedula-type 02 --cedula 3101234567
```

| Argumento       | Descripción                                               |
| --------------- | --------------------------------------------------------- |
| `--cedula-type` | `01` (Física), `02` (Jurídica), `03` (DIMEX), `04` (NITE) |
| `--cedula`      | Número de identificación                                  |
| `--password`    | Contraseña del IDP (o usar `HACIENDA_PASSWORD`)           |
| `--environment` | `sandbox` (default) o `production`                        |
| `--profile`     | Nombre del perfil (default: `default`)                    |

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

Enviar un comprobante electrónico a Hacienda.

```bash
hacienda submit factura.json --dry-run   # Vista previa del XML
hacienda submit factura.json             # Enviar de verdad
hacienda submit factura.json --json      # Salida JSON
```

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
hacienda draft                                       # Modo interactivo
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

El paquete `@hacienda-cr/mcp` expone el SDK como servidor MCP ([Model Context Protocol](https://modelcontextprotocol.io)), permitiendo que asistentes de IA emitan facturas electrónicas de forma conversacional.

### Configuración con Claude Desktop

Agregá esto al `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "hacienda-cr": {
      "command": "npx",
      "args": ["-y", "@hacienda-cr/mcp"]
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

## Desarrollo

### Requisitos previos

- **Node.js** 22+ (usa `fetch` y `crypto.subtle` nativos)
- **pnpm** 9+

### Comenzar

```bash
git clone https://github.com/DojoCodingLabs/hacienda-cr.git
cd hacienda-cr
pnpm install
pnpm build
pnpm test
pnpm lint
pnpm typecheck
```

### Estructura del proyecto

```
hacienda-cr/
├── packages/
│   ├── sdk/       # @hacienda-cr/sdk — Core: auth, XML, firma, API
│   ├── cli/       # @hacienda-cr/cli — Binario `hacienda` (citty)
│   └── mcp/       # @hacienda-cr/mcp — Servidor MCP
├── shared/        # @hacienda-cr/shared — Tipos, constantes, enums compartidos
├── turbo.json     # Configuración de Turborepo
├── vitest.workspace.ts
└── pnpm-workspace.yaml
```

### Construir paquetes individuales

```bash
pnpm --filter @hacienda-cr/sdk build
pnpm --filter @hacienda-cr/sdk test
pnpm --filter @hacienda-cr/sdk test clave.spec.ts
```

### Stack tecnológico

| Herramienta                 | Propósito                                   |
| --------------------------- | ------------------------------------------- |
| TypeScript (strict)         | Lenguaje                                    |
| pnpm workspaces + Turborepo | Gestión del monorepo                        |
| tsup                        | Build (zero-config)                         |
| Vitest                      | Testing (780+ tests)                        |
| ESLint + Prettier           | Lint y formato                              |
| Zod                         | Validación en runtime + inferencia de tipos |
| fast-xml-parser             | Generación y parseo de XML                  |
| citty                       | Framework CLI                               |
| @modelcontextprotocol/sdk   | Framework MCP                               |
| xadesjs / xmldsigjs         | Firma digital XAdES-EPES                    |

### Contribuir

1. Hacé fork del repositorio
2. Creá un branch (`git checkout -b feature/mi-feature`)
3. Hacé tus cambios con tests
4. Ejecutá `pnpm test && pnpm lint && pnpm typecheck`
5. Abrí un pull request

**Convenciones:**

- Archivos: `kebab-case.ts`
- Tipos/Clases: `PascalCase`
- Funciones/Variables: `camelCase`
- Constantes: `UPPER_SNAKE_CASE`

---

## Agradecimientos

Este proyecto se construye sobre el trabajo pionero de la comunidad open-source costarricense:

- **[CRLibre/API_Hacienda](https://github.com/CRLibre/API_Hacienda)** — La API open-source original para facturación electrónica en Costa Rica (PHP). Su documentación, diagramas de flujo y recursos comunitarios fueron referencias invaluables para entender la API de Hacienda. Gracias a toda la comunidad CRLibre por hacer la facturación electrónica accesible para los desarrolladores ticos.
- **[CRLibre/fe-hacienda-cr-misc](https://github.com/CRLibre/fe-hacienda-cr-misc)** — Recursos compartidos y documentación para facturación electrónica en Costa Rica.

---

## Licencia

[MIT](LICENSE)

---

<p align="center">
  <strong>Construido por <a href="https://dojocoding.io">Dojo Coding</a></strong><br/>
  Herramientas open-source para desarrolladores costarricenses 🇨🇷
</p>

<!-- Keywords: facturación electrónica costa rica, comprobantes electrónicos, hacienda costa rica api, sdk factura electrónica, typescript hacienda cr, firma digital xades costa rica, iva costa rica, api hacienda v4.4, ministerio de hacienda, factura electronica sdk, nota credito electronica, nota debito electronica, tiquete electronico, factura compra electronica, factura exportacion, recibo pago electronico, mensaje receptor, clave numerica hacienda, certificado p12 costa rica, oauth2 hacienda, mcp server facturacion, cli facturacion electronica, contribuyente costa rica, cedula juridica, dimex, nite, cabys codigo, comprobante electronico typescript -->
