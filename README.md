<p align="center">
  <a href="https://dojocoding.io">
    <img src="docs/assets/hacienda-cr-banner.png" alt="Hacienda CR por Dojo Coding — Facturación electrónica para Costa Rica. SDK, CLI y MCP en TypeScript." width="100%" />
  </a>
</p>

# Hacienda CR

**Facturación electrónica para Costa Rica, desde tu código, tu terminal o tu asistente de IA.**

Toolkit open-source en TypeScript para trabajar con comprobantes electrónicos v4.4 del Ministerio de Hacienda: autenticación OAuth2, generación de XML, firma XAdES-EPES, cálculo de IVA y consulta de estados.

[![npm](https://img.shields.io/npm/v/@dojocoding/hacienda-sdk?color=FF7151&labelColor=201E3D)](https://www.npmjs.com/package/@dojocoding/hacienda-sdk)
[![Descargas históricas en npm](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2FDojoCodingLabs%2Fhacienda-cr%2Fmain%2Fdocs%2Fnpm-downloads.json)](docs/npm-downloads.json)
[![CI](https://github.com/DojoCodingLabs/hacienda-cr/actions/workflows/ci.yml/badge.svg)](https://github.com/DojoCodingLabs/hacienda-cr/actions/workflows/ci.yml)
[![Licencia MIT](https://img.shields.io/badge/Licencia-MIT-FF7151?labelColor=201E3D)](LICENSE)
[![Node.js 22+](https://img.shields.io/badge/Node.js-22%2B-201E3D)](https://nodejs.org)

[Empezar](#empezá-acá) · [Documentación](#documentación) · [Contribuir](#desarrollo-y-contribuciones) · [Reportar un problema](https://github.com/DojoCodingLabs/hacienda-cr/issues/new)

## Elegí tu herramienta

| Paquete                                                                              | Para qué usarlo                                                          | Documentación                 |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ----------------------------- |
| [`@dojocoding/hacienda-sdk`](https://www.npmjs.com/package/@dojocoding/hacienda-sdk) | Integrar autenticación, XML, firma y API en tu aplicación.               | [SDK](packages/sdk/README.md) |
| [`@dojocoding/hacienda-cli`](https://www.npmjs.com/package/@dojocoding/hacienda-cli) | Crear borradores, validar, firmar, enviar y consultar desde la terminal. | [CLI](packages/cli/README.md) |
| [`@dojocoding/hacienda-mcp`](https://www.npmjs.com/package/@dojocoding/hacienda-mcp) | Generar borradores y XML con asistentes que soportan MCP.                | [MCP](packages/mcp/README.md) |

El SDK y la CLI permiten trabajar en **sandbox y producción**. El servidor MCP genera XML sin firmar; completá la firma y el envío con el SDK o la CLI.

## Empezá acá

Necesitás **Node.js 22+**. Para autenticarte, usá tus credenciales del IDP de Hacienda del ambiente elegido. Para firmar y enviar comprobantes, necesitás además un certificado `.p12` y su PIN.

### SDK: desde tu aplicación

```bash
npm install @dojocoding/hacienda-sdk
```

Definí `HACIENDA_PASSWORD` en tu entorno y ejecutá este ejemplo en un módulo TypeScript:

```ts
import {
  HaciendaClient,
  Environment,
  IdType,
  DocumentType,
  Situation,
} from "@dojocoding/hacienda-sdk";

const client = new HaciendaClient({
  environment: Environment.Sandbox,
  credentials: {
    idType: IdType.PersonaJuridica,
    idNumber: "3101234567", // Reemplazá por tu cédula jurídica.
    password: process.env.HACIENDA_PASSWORD!,
  },
});

await client.authenticate();

const clave = client.buildClave({
  date: new Date(),
  taxpayerId: "3101234567",
  documentType: DocumentType.FACTURA_ELECTRONICA,
  sequence: 1, // Asigná un consecutivo único para cada comprobante.
  situation: Situation.NORMAL,
});

console.log(clave); // Clave numérica de 50 dígitos.
```

Continuá con [creación de documentos](docs/reference.md#creación-de-documentos), [firma digital](docs/reference.md#firma-digital-xades-epes) y [envío y consulta](docs/reference.md#envío-y-consulta-de-estado). `HaciendaClient` gestiona autenticación y claves; las operaciones de XML, firma y envío se usan como funciones del SDK.

### CLI: desde tu terminal

```bash
npm install -g @dojocoding/hacienda-cli

# Definí HACIENDA_PASSWORD antes de autenticarte.
hacienda auth login --cedula-type 02 --cedula 3101234567 --environment sandbox

# Creá y validá un borrador.
hacienda draft --interactive --output factura.json
hacienda validate factura.json

# Revisá el XML antes de enviarlo.
hacienda submit factura.json --dry-run

# Consulta pública, sin autenticación.
hacienda lookup 3101234567
```

Para enviar, configurá el certificado y el PIN según la [referencia de la CLI](docs/reference.md#cli--referencia-de-comandos). Los comandos admiten `--json` para automatización.

### MCP: desde tu asistente de IA

Agregá este servidor a la configuración MCP de tu cliente (por ejemplo, Claude Desktop):

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

Probá: _“Generá un borrador de factura por dos horas de consultoría a ₡50.000 cada una con IVA del 13%.”_

Herramientas: `draft_invoice`, `create_invoice`, `lookup_taxpayer`, `check_status`, `list_documents` y `get_document`. Consultá [configuración, parámetros y recursos MCP](packages/mcp/README.md).

## Comprobantes soportados

| Comprobante                             | Builder del SDK                |
| --------------------------------------- | ------------------------------ |
| Factura Electrónica                     | `buildFacturaXml()`            |
| Nota de Débito Electrónica              | `buildNotaDebitoXml()`         |
| Nota de Crédito Electrónica             | `buildNotaCreditoXml()`        |
| Tiquete Electrónico                     | `buildTiqueteXml()`            |
| Factura Electrónica de Compra           | `buildFacturaCompraXml()`      |
| Factura Electrónica de Exportación      | `buildFacturaExportacionXml()` |
| Recibo Electrónico de Pago              | `buildReciboPagoXml()`         |
| Mensaje Receptor (aceptación o rechazo) | `buildMensajeReceptorXml()`    |

## Documentación

- [Referencia completa del SDK](docs/reference.md#sdk--documentación-completa): autenticación, XML, impuestos, claves, firma, API, configuración, logging y errores.
- [Referencia de comandos](docs/reference.md#cli--referencia-de-comandos): opciones y ejemplos de la CLI.
- [Integración MCP](docs/reference.md#mcp-server--integración-con-ia): configuración del cliente y recursos.
- [Tipos y constantes compartidos](shared/README.md).

### Credenciales y configuración

| Variable            | Uso                                                          |
| ------------------- | ------------------------------------------------------------ |
| `HACIENDA_PASSWORD` | Contraseña del IDP de Hacienda.                              |
| `HACIENDA_P12_PATH` | Ruta al certificado `.p12` para los comandos que la admiten. |
| `HACIENDA_P12_PIN`  | PIN del certificado `.p12`.                                  |

Los perfiles se guardan en `~/.hacienda-cr/config.toml`. Las contraseñas y PINs se suministran por variables de entorno y no se guardan en los perfiles. Empezá con `sandbox` antes de usar credenciales de producción.

### Descargas históricas de npm

El contador suma las descargas de **SDK, CLI, MCP y shared**, desde la creación de cada paquete hasta el último día disponible en npm. Son descargas del registro, incluyendo CI y dependencias transitivas; no representan instalaciones únicas ni personas.

[Ver totales por paquete y fecha de corte](docs/npm-downloads.json). El [workflow de actualización](.github/workflows/npm-downloads.yml) recalcula el total diariamente y también puede ejecutarse manualmente. Consulta el historial en bloques de hasta 365 días para respetar los límites de la API de npm. Si una consulta falla, conserva el último contador publicado.

## Desarrollo y contribuciones

Usá Node.js 22+ y la versión de pnpm declarada en `package.json`.

```bash
git clone https://github.com/DojoCodingLabs/hacienda-cr.git
cd hacienda-cr
pnpm install
pnpm build
pnpm test
pnpm lint
pnpm typecheck
pnpm format
```

```text
packages/sdk/   Autenticación, XML, firma digital, impuestos y API
packages/cli/   Binario hacienda
packages/mcp/   Servidor MCP con transporte stdio
shared/         Tipos, esquemas y constantes compartidos
docs/           Referencia, banner y métricas de npm
```

Para trabajar en un paquete: `pnpm --filter @dojocoding/hacienda-sdk test`.

Encontrá trabajo en [Issues](https://github.com/DojoCodingLabs/hacienda-cr/issues), abrí un issue con pasos para reproducir un error o proponé una mejora. Para contribuir código, hacé un fork, creá una rama, agregá los tests correspondientes y ejecutá los checks anteriores antes de abrir un pull request. Usamos Changesets para versionar los paquetes.

## Agradecimientos

Gracias a [CRLibre/API_Hacienda](https://github.com/CRLibre/API_Hacienda) y [CRLibre/fe-hacienda-cr-misc](https://github.com/CRLibre/fe-hacienda-cr-misc) por sus referencias y recursos para la comunidad de facturación electrónica costarricense.

## Licencia

[MIT](LICENSE). Construido por [Dojo Coding](https://dojocoding.io) para la comunidad de desarrolladores de Costa Rica 🇨🇷.

<p align="center">
  <a href="https://dojocoding.io"><img src="docs/assets/dojocoding-mark.png" alt="Logo oficial de Dojo Coding" width="48" /></a>
</p>
