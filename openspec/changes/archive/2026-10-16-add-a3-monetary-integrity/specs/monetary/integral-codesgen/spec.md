## Purpose

Frontera de entrada monetaria del SDK `hacienda-cr`: los esquemas públicos de validación aceptan tanto `number` (JSON de CLI/MCP) como `Money` y normalizan antes de validar, mientras que los tipos de dominio siguen llevando `Money`. El generador de catálogos (`pnpm spec:generate`) permanece ajeno a los montos y determinista.

## ADDED Requirements

### Requirement: Los esquemas de entrada aceptan number y Money en los montos

Los esquemas públicos de validación monetaria (`MoneyInputSchema`, `MontoSchema`,
`MontoPositiveSchema` en `shared/src/schemas/common.ts`, aplicados en
`linea-detalle.ts` y `factura.ts`) SHALL aceptar `number | Money` en cada campo
monetario y SHALL normalizar a `number` antes de aplicar las restricciones de
signo, de modo que las entradas JSON existentes (CLI, MCP, ejemplos) sigan
funcionando sin cambios. Los tipos de dominio SHALL seguir usando `Money`. Un
valor que no sea ni `number` ni un valor monetario con `toNumber()` SHALL
rechazarse con un error de validación.

#### Scenario: Una entrada con Money valida y se normaliza

- **WHEN** se valida un documento cuyos montos son instancias de `Money` (por ejemplo la salida de `calculateInvoiceSummary`)
- **THEN** la validación pasa y los valores normalizados son los números decimales equivalentes

#### Scenario: Una entrada con number sigue validando

- **WHEN** se valida el mismo documento con los montos como `number` (JSON de CLI o MCP)
- **THEN** la validación produce el mismo resultado que con `Money`

#### Scenario: Un valor no monetario se rechaza

- **WHEN** un campo monetario recibe un valor que no es ni `number` ni un valor con `toNumber()`
- **THEN** la validación falla con un error de validación y no lanza una excepción no controlada

### Requirement: El generador de catálogos no toca montos y sigue siendo determinista

`pnpm spec:generate` SHALL seguir generando únicamente catálogos de códigos desde
`packages/sdk/schemas/codes.json` (sin tipos monetarios) y su salida SHALL ser
byte a byte idéntica entre corridas sobre un árbol idéntico. `pnpm verify` SHALL
fallar ante cualquier deriva entre `shared/src/generated/` y `codes.json`. La
migración de montos a `Money` vive en los tipos escritos a mano
(`shared/src/types/documents.ts`) y en la capa de cálculo, no en el código
generado.

#### Scenario: Regeneración determinista

- **WHEN** `pnpm spec:generate` se ejecuta dos veces sobre el mismo árbol
- **THEN** el código generado es byte a byte idéntico y no contiene tipos monetarios

#### Scenario: La deriva del catálogo falla

- **WHEN** el catálogo generado difiere de `codes.json`
- **THEN** `pnpm verify` falla señalando la deriva, sin que el cambio de montos lo silencie
