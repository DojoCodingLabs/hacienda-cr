## Context

Ver `proposal.md` — Why. A6 aporta corpus de fuzzing + mutation testing, que `main` no tiene.
`main` sí tiene la regresión adversarial del advisory `node-forge` (GHSA-86w9-cpqp-85rv), que
no se duplica. Y el brief de A2 exige deriva **semanal**, mientras `main` y la línea local
programan **mensual**.

## Goals / Non-Goals

**Goals:**

- Corpus que apunte a los módulos reales del árbol vigente.
- Puerta de mutation testing con score mínimo, en job separado.
- Cerrar la DoD semanal del job de deriva.

**Non-Goals:**

- Re-implementar la regresión adversarial de `node-forge`.
- Fuzzing de red, de autenticación o de los endpoints del API.
- Cambiar los límites de entrada del SDK.

## Decisions

| Decisión                                             | Racional                                                         | Alternativas consideradas                               |
| ---------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------- |
| **El corpus se ejecuta en `pnpm verify`**            | Barato y siempre en verde; el corpus estático no necesita budget | Job aparte (duplica la definición de "suite del SDK")   |
| **Mutation en job separado**                         | Cuesta minutos; no debe frenar PRs                               | En `pnpm verify` (ralentiza todo)                       |
| **Scope de mutation: parser + xml + kernel decimal** | Son los módulos donde un mutanteauzaría un defecto silencioso    | Todo `src/` (caro, poco señal)                          |
| **No se duplica la regresión de `node-forge`**       | Ya está en `main` y es más específica                            | Copiarla (dos pruebas del mismo bug)                    |
| **Deriva semanal**                                   | Es la DoD literal de A2                                          | Dejarla mensual (DoD incumplida)                        |
| **Redacción probada como contrato**                  | Es una frontera de seguridad, no una preferencia                 | Confiar en el logger (ya lo hace, pero no está probado) |

## Risks / Trade-offs

- **[Riesgo: el scope de mutation nombra rutas que cambian]** → el config se valida en el job (si una ruta no existe, Stryker falla visible).
- **[Riesgo: la deriva semanal descarga más]** → el job es de sólo lectura y acotado; se mide su coste en la primera corrida.
- **[Riesgo: el corpus falla por falsos positivos con XML válido]** → cada caso declara el error esperado.
