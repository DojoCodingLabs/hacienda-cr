## Context

Ver `proposal.md` — Why. El review de `main` sobre PR #59 rechazó la clase `Money`
por su frontera: `MoneyInputSchema` normalizaba a `Number` (pérdida de exactitud,
`Infinity` admitido, dominio sin cota) y `Money.toJSON` serializaba por `Number`
(incompatible con `structuredClone`).

El contrato de la rama objetivo (`AGENTS.md`, `docs/specs/exact-ordinary-fe.md`,
`README.md`) fija el alcance con tres frases que no admiten lectura amplia:

> Preserve legacy Number APIs.

> Those legacy Number contracts and CLI/MCP adapters are unchanged. It is not the
> broad unmerged PR59 monetary rewrite.

> The additive exact decimal ordinary FE API preserves supported financial strings
> through BigInt calculation, JSON and XML; legacy numeric APIs are unchanged.

Es decir: el camino exacto es **aditivo** y la reescritura amplia del camino
legacy está explícitamente fuera de alcance. La primera versión de este change
—escrita sobre la línea de staging— asumía migrar los DTOs legacy a texto; al
portar a `main` ese supuesto choca con el contrato de la rama, y el change se
re-escala a aditivo.

Lo que queda por entregar, y es el DoD de A3, es la **frontera estricta
reutilizable** y la **batería de propiedades con oráculo independiente**.

## Goals / Non-Goals

**Goals:**

- Que el texto decimal acotado sea una primitiva pública, documentada y probada.
- Que la frontera compartida nunca normalice a `Number` y nunca degrade exactitud.
- Que las invariantes monetarias se juzguen por propiedades, contra un oráculo
  independiente, sobre miles de casos.
- Que los bytes publicados 0.9.0 no cambien.

**Non-Goals:**

- Migrar los DTOs legacy a texto decimal (prohibido por el contrato de la rama).
- Cambiar `calculateLineItemTotals`, `calculateInvoiceSummary`, `FacturaElectronica`
  ni los adaptadores CLI/MCP.
- Introducir una clase `Money` o cualquier valor monetario con semántica de objeto.
- Ampliar el alcance de casos fiscales del camino exacto (sólo IVA13 ordinario con
  pago totalmente asignado, como hasta ahora).
- Habilitar release, publicación o llamada fiscal.

## Decisions

| Decisión                                                                                                          | Racional                                                                                                                              | Alternativas consideradas                                                   |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **Cambio aditivo: las APIs `Number` legacy no se tocan**                                                          | El contrato de `main` lo exige y el README lo publica; migrarlas rompería a todo consumidor                                           | Reescribir los DTOs legacy (el "broad PR59 rewrite" que main excluye)       |
| **Sin clase `Money`; texto decimal acotado**                                                                      | El review rechazó la frontera de `Money`; el texto es serializable, clonable y exacto                                                 | Portar `Money` con `toJSON` corregido (misma clase, mismo riesgo de Number) |
| **La frontera estricta vive en `shared/`, no dentro de `exact-fe.ts`**                                            | Hoy el esquema estricto es una expresión regular local; sin primitivas públicas nadie puede adoptar texto decimal sin reimplementarlo | Dejar el regex local (el DoD de A3 no se cumple)                            |
| **Los límites salen del XSD oficial** (`DecimalDineroType`: 18 dígitos, 5 decimales, 0 ≤ v ≤ 9999999999999.99999) | La cota no es arbitraria: es el tipo del XSD, y citarla evita Inflar o encoger el dominio                                             | Cota inventada más amplia (aceptaría montos que el XSD rechaza)             |
| **Precisión por encima de la escala: se rechaza, no se redondea**                                                 | Es lo que ya hace el camino exacto publicado; redondear en silencio pierde información fiscal                                         | Redondear al 5º decimal como en el legacy binario                           |
| **El `number` heredado se lee por su representación más corta y se redondea `HALF_UP`**                           | Un `number` no porta contrato decimal; leerlo por su forma más corta evita arrastrar ruido binario (`0.1 + 0.2`)                      | Tratar el `number` como decimal exacto (imposible: ya perdió dígitos)       |
| **El kernel conserva `scaled`/`round`/`money`/`sum` byte a byte**                                                 | El baseline publicado 0.9.0 (`exact-ordinary-090-baseline.json`) fija esos bytes por hash                                             | Reimplementarlos "más bonito" (rompe el baseline publicado)                 |
| **El oráculo de las propiedades es una segunda implementación**                                                   | Un oráculo que comparta la representación con el kernel puede ocultar un defecto compartido                                           | Reusar los helpers del kernel (autoengaño)                                  |
| **El oráculo es de aritmética decimal por texto, no `BigInt` escalado**                                           | Otra representación hace imposible que un error de escala se esconda en ambos lados                                                   | Oráculo `BigInt` independiente (misma representación, menos garantía)       |
| **`fast-check` como devDependency del SDK**                                                                       | Es la herramienta que ya usa la línea de propiedades del repo y la que usará A4; miles de casos con shrinking                         | Generador propio con PRNG sembrado (menos shrinking, más código)            |
| **La regla de redondeo vive en el módulo que la aplica**                                                          | Una sola cita, un solo sitio; el brief lo pide explícitamente                                                                         | Repetir la cita en el SDK, el CLI y el MCP (tres fuentes)                   |
| **La adopción de texto decimal es opt-in y documentada**                                                          | El cambio no obliga a nadie a migrar, pero quien quiera hacerlo tiene la frontera y la guía                                           | Migración forzada de los consumidores del repo                              |

## Risks / Trade-offs

- **[Riesgo: la frontera compartida queda sin uso dentro del repo]** → es deliberado: es la pieza pública que permite adoptar texto decimal sin reimplementar la exactitud. `MIGRATION.md` dice cómo usarla.
- **[Riesgo: un `number` heredado redondeado `HALF_UP` difiere del redondeo binario histórico]** → la guía de migración da la tabla de equivalencias y nombra los casos donde difieren.
- **[Riesgo: ampliar el kernel rompe el baseline publicado]** → la regresión de compatibilidad existente corre en CI y el kernel nuevo sólo añade primitivos.
- **[Riesgo: la batería de properties es lenta]** → presupuesto configurable y generador con shrinking; los casos XSD (que son los caros) no forman parte de este cambio.
- **[Riesgo: la frontera acepta `number` y alguien cree que eso es "exactitud" garantizada]** → la documentación nombra explícitamente que un `number` es binario y que su valor exacto ya se perdió antes de entrar.
- **[Riesgo: el texto es un `string` y un consumidor lo compara con `===` contra un número]** → es el motivo del cambio; la guía de migración cubre el choque de tipos.
- **[Hallazgo, no introducido aquí: la cota del kernel es más floja que el `totalDigits` del XSD]** → `money()` rechaza por encima de `999999999999999999` escalado, es decir hasta 18 dígitos enteros; el tipo oficial `DecimalDineroType` admite 18 dígitos **totales** (13 enteros + 5 decimales). Una cantidad de 16 dígitos por un precio de `0.00001` produce un monto de 14 dígitos enteros que el kernel acepta y el XSD rechazaría. La **frontera de texto** sí es estricta (13 dígitos enteros); el hueco está en los montos _calculados_. No se corrige en este change: tocar `money()` alteraría el comportamiento de las familias exact publicadas y su baseline.
