## REMOVED Requirements

### Requirement: Los esquemas de entrada aceptan number y Money en los montos

**Reason:** La clase `Money` no se porta (la autoridad de `main` rechazó su frontera: normalizaba a `Number`, admitía `Infinity` y no acotaba el dominio). Los esquemas legacy tampoco cambian: el contrato de `main` manda preservar las APIs `Number` legacy y los adaptadores CLI/MCP, y reescribirlos sería el "broad unmerged PR59 monetary rewrite" que la especificación del camino exacto excluye explícitamente.

**Migration:** La frontera compartida de montos (`MoneyInputSchema`, `MontoSchema`, `MontoPositiveSchema` en `shared/src/schemas/common.ts`) queda publicada para adopción opt-in: acepta el `number` heredado o un texto decimal acotado y normaliza a texto acotado exacto, sin normalizar nunca a `Number`. Los esquemas legacy (`linea-detalle.ts`, `factura.ts`) conservan su contrato `Number` sin cambios. La guía para llevar un consumidor de `number` a texto decimal está en `MIGRATION.md`.

## ADDED Requirements

### Requirement: La frontera compartida de montos acepta number o texto y normaliza a texto acotado

La frontera compartida de montos (`MoneyInputSchema`, `MontoSchema`, `MontoPositiveSchema` en `shared/src/schemas/common.ts`) SHALL aceptar el `number` heredado —el JSON que CLI y MCP siguen enviando— o un texto decimal acotado, y SHALL normalizar a **texto decimal acotado** antes de aplicar las restricciones de signo. Un valor que no sea ni `number` ni texto decimal acotado SHALL rechazarse con un error de validación, sin excepción no controlada. La normalización SHALL rechazar `Infinity`, `NaN`, la notación exponencial, los valores fuera de cota y la precisión por encima de cinco decimales en un texto, nombrando la causa. El generador de catálogos (`pnpm spec:generate`) SHALL permanecer ajeno a los montos y determinista, y la representación monetaria SHALL vivir en los tipos escritos a mano y en el kernel, no en el código generado.

#### Scenario: Una entrada con texto decimal valida y se conserva

- **WHEN** se valida un monto como texto decimal acotado
- **THEN** la validación pasa y el valor normalizado es el mismo texto, con sus cinco
  decimales intactos

#### Scenario: Una entrada con number sigue validando

- **WHEN** se valida el mismo monto como `number`
- **THEN** la validación pasa y el resultado es el texto decimal equivalente

#### Scenario: Un valor no monetario se rechaza

- **WHEN** un monto recibe un valor que no es ni `number` ni texto decimal acotado
- **THEN** la validación falla con un error de validación y no lanza una excepción no
  controlada

#### Scenario: La normalización nunca produce una representación binaria

- **WHEN** se normaliza un `number` heredado
- **THEN** el resultado es un texto decimal acotado exacto, redondeado `HALF_UP` a
  cinco decimales

#### Scenario: El generador de catálogos no toca montos y sigue siendo determinista

- **WHEN** `pnpm spec:generate` se ejecuta dos veces sobre el mismo árbol
- **THEN** el código generado es byte a byte idéntico y no contiene tipos
  monetarios
