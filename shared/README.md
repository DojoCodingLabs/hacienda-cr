# @hacienda-cr/shared

Shared types, constants, enums, and Zod validation schemas for Costa Rica electronic invoicing (Hacienda API v4.4).

This package is used internally by `@hacienda-cr/sdk`, `@hacienda-cr/cli`, and `@hacienda-cr/mcp`. It is not typically imported directly by end users.

## Contents

### Constants

- **Document type codes** -- All electronic document types (`01`-`09`) with human-readable names
- **Identification types** -- Cedula Fisica, Juridica, DIMEX, NITE
- **Tax codes** -- IVA codes and rate codes
- **Sale conditions** -- Contado, Credito, etc.
- **Payment methods** -- Efectivo, Tarjeta, Cheque, Transferencia, etc.
- **Currency codes** -- CRC, USD, EUR, etc.
- **Province codes** -- Costa Rica provinces and cantons
- **XAdES policy** -- Policy URI and SHA-1 hash for XAdES-EPES signing
- **Environment URLs** -- Sandbox and production API/IDP endpoints

### Types

- `FacturaElectronica` -- Full invoice type
- `Emisor` / `Receptor` -- Issuer and receiver types
- `LineaDetalle` -- Invoice line item
- `Impuesto` / `Descuento` / `Exoneracion` -- Tax, discount, exoneration
- `SubmissionRequest` / `SubmissionResponse` / `StatusResponse` -- API request/response types
- `ComprobantesListResponse` / `ComprobanteDetail` -- Document listing and detail types

### Schemas (Zod)

- `FacturaElectronicaSchema` -- Validates invoice input
- `EmisorSchema` / `ReceptorSchema` -- Validates issuer/receiver
- `LineaDetalleSchema` -- Validates line items
- `IdentificacionSchema` -- Validates identification fields
- `ClaveSchema` -- Validates 50-digit clave format
- `EnvironmentSchema` -- Validates environment strings

## Installation

```bash
npm install @hacienda-cr/shared
```

This package is typically consumed as a workspace dependency via `workspace:*`.
