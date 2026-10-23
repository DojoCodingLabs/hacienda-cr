## Context

Ver `proposal.md` — Why. A6 es cross-cutting: endurecimiento de parsing XML + fuzzing + mutation testing. El SDK ya tiene `checkXmlInput`, `validateDocumentXml`, `parseDocumentXml`, `signXml` y redacción en logger, pero sin corpus versionado ni mutation score.

## Goals / Non-Goals

**Goals:**

- Corpus de fuzzing versionado y reproducible en CI.
- Redacción de secretos en rutas de error del SDK.
- Mutation testing sobre parsing e impuestos con score mínimo.
- Integración en `pnpm verify` (fuzz) y job separado (mutation).

**Non-Goals:**

- Fuzzing de APIs de red o autenticación (A6 se limita a XML).
- Mutation testing de signing/crypto (fuera de scope inicial).
- Fuzzing dinámico que dependa de red o credenciales.

## Decisions

| Decisión                                      | Racional                                                                                       | Alternativas consideradas                                 |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **Corpus estático + dinámico (`fast-check`)** | Reproducibilidad (estático) + cobertura (dinámico)                                             | Solo estático (limitado), solo dinámico (no reproducible) |
| **Mutation con Stryker + vitest runner**      | Madurez, soporte TS, integración con Vitest                                                    | Manual (no CI), `mutator` custom (mantenimiento)          |
| **Scope mutation: parser + xml + calculator** | Parsing e impuestos son los módulos de alto riesgo; signing/crypto queda fuera por complejidad | Todo `src/` (coste CI prohibitivo)                        |
| **Mutation en job separado**                  | `pnpm verify` sigue rápido; PRs no bloqueados por mutation                                     | Integrar en verify (ralentiza PRs)                        |
| **Redacción de secretos en logger + errors**  | Un solo punto de control; fácil de testear por contrato                                        | Redacción por módulo (inconsistente)                      |

## Risks / Trade-offs

- **[Riesgo: mutation score bajo al inicio]** → empezar con umbral 70 % y subir a 80 % iterativamente.
- **[Riesgo: fuzzing no determinista]** → seeds fijos + `fast-check` modesto en PRs.
- **[Riesgo: corpus estático desactualizado]** → añadir un caso por cada vulnerabilidad descubierta en el futuro.
- **[Riesgo: `xmllint-wasm` 64 MiB]** → limitar tamaño de casos de fuzz (≤ 1 MiB) y depth (≤ 64).
- **[Riesgo: secretos en logs de dependencias]** → redacción en el logger del SDK y tests de contrato; node-forge/@xmldom no se testan directamente.

## Migration Plan

1. Crear corpus estático + spec de fuzzing.
2. Añadir fuzzing dinámico con fast-check (budget modesto).
3. Extender tests de redacción de secretos.
4. Configurar Stryker y añadir script `pnpm test:mutation`.
5. Integrar fuzz en `pnpm verify` y mutation en job CI separado.
6. Documentar en README.

## Open Questions

- **Score mínimo inicial**: sugiero 70 %, subir a 80 % cuando el corpus esté completo. ¿Acordamos?
- **Scope de mutation**: ¿incluir `signer.ts` o solo parsing/impuestos? Recomiendo solo parsing/impuestos inicialmente.
- **Job de mutation**: ¿GitHub Actions o script manual? Recomiendo GHA para no ralentizar PRs.
