# @dojocoding/hacienda-shared

Shared types, constants, enums, and Zod validation schemas for Costa Rica electronic invoicing (Hacienda API v4.4).

This package is used internally by `@dojocoding/hacienda-sdk`, `@dojocoding/hacienda-cli`, and `@dojocoding/hacienda-mcp`. It is not typically imported directly by end users.

## Contents

### Constants

- **Generated catalogs** (`shared/src/generated/`) -- Code catalogs rendered
  from `packages/sdk/schemas/codes.json` by `pnpm spec:generate`: document
  type-independent enumerations such as `PaymentMethod`, `SaleCondition`,
  `TaxCode`, `IvaRateCode`, `IdentificationType`, `ProvinceCode`,
  `CURRENCY_CODES`, `DISCOUNT_CODES`, `OTHER_CHARGE_TYPES`,
  `EXONERATION_INSTITUTIONS`, `COMMERCIAL_CODE_TYPES` and
  `TRANSACTION_TYPES`. Every file starts with a `NO EDITAR` header: never
  edit them by hand (the parity-freeze test and the `pnpm verify` lock
  detect drift). The pairing registry is
  `scripts/codes-generate/table-map.mjs`.
- **Curated companions** -- Human-readable `*_NAMES` maps, derived subsets
  (`REP_*`), `IVA_RATE_PERCENTAGES`, `IDENTIFICATION_LENGTHS`, currency
  accessors, and the catalogs without an exact `codes.json` pairing
  (`ExonerationType`, `UNITS_OF_MEASURE`, `DocumentTypeCode`,
  `REFERENCE_*`) -- hand-written in `shared/src/constants/`.
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
npm install @dojocoding/hacienda-shared
```

Applications can import its public types, enums and validation schemas directly. Internal workspace dependencies are resolved to release versions when packed.
