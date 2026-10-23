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

## Desviaciones encontradas al portar sobre `main`

1. **Las expectativas del corpus son las del árbol vigente.** El corpus heredado
   de la línea de trabajo afirmaba `"Malformed"`, `"nesting"` o `"input limit"`
   para casos que aquí tienen otro veredicto: el XML truncado falla con
   _"Expected closing tag…"_, el atributo con markup falso con _"Unescaped '<'"_
   (el contador de límites ignora el markup dentro de atributos y CDATA, y el
   parser lo rechaza después), el documento vacío con _"Start tag expected."_ y
   el UTF-8 inválido con _"Unknown document root element"_. Cada caso declara
   ahora el mensaje **real** del árbol vigente, y el caso declara además si el
   límite barato debe cortarlo antes del parseo: seis casosbounded y seis no.

2. **El corpus corre además contra el parser de documentos**, que no existía en
   la línea de trabajo: el parser es un punto de entrada XML más, y el
   requisito lo nombra.

3. **La redacción de secretos captura el error estándar.** La prueba heredada
   miraba el mensaje; el requisito pide el log. La captura intercepta
   `console.error` y las escrituras a `process.stderr` durante la ruta con
   secreto y verifica que el secreto no aparece en ninguna de las dos.

4. **El scope de mutation testing se ajusta a las rutas que existen**: el parser
   de documentos, el límite de entrada, la identidad del documento, el validador
   XSD y el kernel decimal (`src/tax/exact-decimal.ts`, no el `calculator.ts`
   legacy). La suite que los mata es la que ya los protege: el corpus hostil,
   el parser y el baseline exacto publicado (que compara hashes, de modo que un
   mutante de redondeo cambia el hash y muere).

5. **Stryker 10** es la versión vigente (`@stryker-mutator/core`,
   `vitest-runner` y `typescript-checker` en `^10.0.0`); el heredado usaba el
   formato de plugins de la v8 y no fijaba dependencias.

6. **El cron semanal ya viaja en el PR #59.** Ese PR reescrito lleva el mismo
   cambio de mensual a semanal (lunes 12:00 UTC) con el mismo motivo: la
   definición de A2 exige re-descargar los XSD publicados cada semana. Aquí se
   repite porque el requisito del change lo pide; si #59 entra antes, el
   conflicto es de una línea.

## Score baseline de la mutation testing

Medido sobre el árbol vigente (830 mutantes, 3 min 16 s, sin red):

| Fichero                    | Score       | Matados | Vivos   | Sin cobertura |
| -------------------------- | ----------- | ------- | ------- | ------------- |
| `documents/parser.ts`      | 44.84 %     | 213     | 179     | 83            |
| `tax/exact-decimal.ts`     | 68.97 %     | 20      | 7       | 2             |
| `xml/document-identity.ts` | 43.48 %     | 70      | 65      | 26            |
| `xml/input-limits.ts`      | 58.21 %     | 39      | 27      | 1             |
| `xml/schema-validator.ts`  | 41.84 %     | 41      | 29      | 28            |
| **Total**                  | **46.14 %** | **383** | **307** | **140**       |

La puerta inicial queda en **45 %** (el score real medido, 46.27 %): una puerta que
nace en rojo no es una puerta, es un bloqueo, y su valor inmediato es
**impedir regresiones** mientras la cobertura crece. `high` deja registrado el
objetivo de 80 %.

El siguiente escalón (70 %) no depende de esta configuración sino de la
cobertura: **264 de los 306 mutantes vivos no tienen cobertura** — están en el
parser de documentos y en la identidad del documento, que hoy sólo ejercita el
corpus hostil y la prueba del parser. Subir la puerta sin subir la cobertura
sería subir el número sin subir la garantía; el camino es escribir las
pruebas que faltan en el parser (A4) y en la identidad, y entonces subir el
umbral.

El kernel decimal (68.97 %) es el módulo mejor cubierto: el baseline exacto
publicado compara hashes, de modo que un mutante de redondeo cambia el hash y
muere. Ése es el patrón que hay que extender al resto del scope.
