## Context

Ver `proposal.md` — Why. Restricciones del repo que condicionan el diseño:

- `loadP12` es el único módulo de producción que importa `node-forge` (`packages/sdk/src/signing/p12-loader.ts`). `signXml` lo invoca siempre antes de firmar; el resto del SDK (verificación de respuestas, validación XML, oráculo nativo) no lo toca.
- El paquete es ESM y `pnpm verify` es el gate de CI. `scripts/verify-packages.mjs` empaqueta los 4 tarballs e instala un consumidor aislado que hoy firma con un `.p12` generado con `openssl`.
- Los tests del repo necesitan el parser instalado (`p12-loader.spec.ts` y el corpus adversarial).
- `@types/node-forge` debe seguir disponible para compilar, pero ningún tipo suyo puede aparecer en el `.d.ts` publicado.
- Los cambios de comportamiento publicado requieren changeset; la publicación npm no está autorizada por este cambio.

## Goals / Non-Goals

**Goals:**

- Que la instalación por defecto del SDK no incluya ningún parser PKCS#12 y que `npm audit --omit=dev` de un consumidor que no firma quede limpio.
- Que la ruta que sí carga `.p12` siga funcionando sin cambios funcionales cuando el consumidor instala el parser.
- Que la falta del parser produzca un fallo explícito, temprano y accionable, nunca un `TypeError` opaco.

**Non-Goals:**

- Sustituir `node-forge` por otro parser (nativo, `openssl` o WASM). Queda fuera de alcance y se sigue rastreando en el issue #69.
- Cambiar la firma pública de `loadP12`/`signXml`, el pipeline XAdES, la verificación de respuestas o el oráculo nativo.
- Cerrar el issue #69 o declarar remediada la ruta vulnerable de forge.

## Decisions

### D1 — Peer dependency opcional, no `optionalDependencies`

Declarar `node-forge` en `peerDependencies` con `peerDependenciesMeta["node-forge"].optional = true`, y en `devDependencies` para el repo.

**Por qué:** `optionalDependencies` se instala por defecto; el advisory seguiría en el árbol de producción y el cambio no cumpliría su objetivo. Una peer opcional no se auto-instala (npm ≥ 7 respeta la marca `optional`), así que desaparece del árbol por defecto y tampoco rompe instalaciones con `strict-peer-dependencies`.

**Alternativas descartadas:** `optionalDependencies` (no limpia el audit); peer obligatoria (rompe instalaciones de consumidores que no firman).

### D2 — Import dinámico perezoso, memoizado sólo a nivel de módulo

`loadP12` resuelve el parser con `await import("node-forge")` dentro de la función, con el especificador literal, y cachea únicamente la promesa del módulo. Las credenciales, el PIN y el buffer nunca se cachean.

**Por qué:** evita top-level await, mantiene el import del SDK libre de efectos y permite que el bundler separe el parser. El especificador literal es requisito para que el import sea analizable y para conservar los tipos en desarrollo.

**Alternativa descartada:** especificador dinámico (`import(specifier)`) para que el bundler no lo resuelva. Rompe el tipado y el empaquetado; el problema de bundlers se documenta como configuración del consumidor.

### D3 — La superficie pública no expone tipos del parser

El módulo usa `import type` sólo para uso interno y castea en el borde. `P12Credentials` sigue siendo el tipo de retorno y no referencia tipos de `node-forge`.

**Por qué:** si el `.d.ts` publicado mencionara `node-forge`, cualquier consumidor sin el parser fallaría en `tsc` aunque nunca cargue un `.p12`, lo que reintroduce la dependencia por la puerta de tipos.

### D4 — Reusar `SigningError`, sin nuevo código de error

El fallo por parser ausente lanza `SigningError` (`SIGNING_FAILED`) con mensaje estable que nombra la dependencia y el comando de instalación. No se agrega una subclase ni un valor nuevo a `HaciendaErrorCode`.

**Por qué:** la categoría `SIGNING_FAILED` ya es la correcta y agregar un código es un cambio de API pública no justificado por el alcance. El mensaje es el contrato observable; los tests lo verifican por subcadena, no por igualdad literal completa.

**Alternativa descartada:** `MissingDependencyError` con código propio — más preciso, pero amplía la API pública sin necesidad.

### D5 — Rango de versión peer alineado con lo probado

Peer `^1.4.0` y devDependency `^1.4.0` (la versión que hoy resuelve el lockfile). Un parche futuro dentro de `1.x` entra sin cambiar el rango.

### D6 — TDD: tres pruebas rojas antes de tocar producción

1. **Ausencia del parser (unidad).** Spec propio `p12-loader-missing-dep.spec.ts` con `vi.mock("node-forge", …)` que rechaza la resolución; `vi.resetModules()` + import dinámico del loader; se espera `SigningError` con `node-forge` y el comando de instalación en el mensaje, y se verifica que el PIN no aparece en el mensaje.
2. **Invariante de empaquetado (unidad).** Spec que lee `packages/sdk/package.json` y afirma: ausente de `dependencies`; presente en `peerDependencies`; `peerDependenciesMeta` marcado opcional; presente en `devDependencies`.
3. **Consumidor empaquetado sin parser (integración).** En `scripts/verify-packages.mjs`: el consumidor que hoy firma instala `node-forge` explícitamente (prueba el camino opt-in real) y se agrega un segundo consumidor mínimo, sin el parser, que importa el SDK y verifica el `SigningError` accionable además de que `node-forge` no aparece en el árbol instalado.

**Por qué el mock no basta:** la prueba 3 ejecuta la resolución ESM real, que es donde puede diferir el comportamiento del mock.

### D7 — Changeset `minor` del SDK

El cambio es incompatible sólo para consumidores que llaman `loadP12` sin instalar el parser. En `0.x`, un `minor` con nota de migración es la convención del repo. El grupo `linked` de changesets alinea el resto de paquetes `@dojocoding/*` al publicar.

### D8 — Documentación como parte del contrato operativo

`packages/sdk/README.md` (instalación del parser para quien firma), `MIGRATION.md` (nota de ruptura y remedio) y `docs/forge-reachability-audit.md` (el advisory sale del árbol por defecto, sigue presente para quien opta por forge; #69 permanece abierto).

## Risks / Trade-offs

- **Bundlers que resuelven el import dinámico y fallan si el paquete no está instalado** → documentar `external`/`optional peer` en la guía del SDK; mantener el especificador literal para conservar tipos y tree-shaking; la suite de consumidor empaquetado valida el caso Node/ESM.
- **Mock de módulo distinto de una resolución ESM real** → mitigado por la prueba 3 sobre el tarball instalado, que es la evidencia de aceptación.
- **`dist/` commiteado queda desactualizado** → el build forma parte de `pnpm verify`; el empaquetado de `verify-packages` usa la salida construida, no el fuente.
- **Consumidores que hoy firman y actualizan sin leer la nota** → error en tiempo de llamada con comando de instalación, más changeset `minor` y nota de migración; no hay fallo silencioso.
- **El advisory sigue existiendo para quien opta por forge** → aceptado: el cambio reduce exposición, no reemplaza la librería. El issue #69 no se cierra.
- **Advertencia de peer faltante en `pnpm install` del repo** → esperada y benigna por la marca `optional`; se documenta para no tratarla como error.

## Migration Plan

1. Aterrizar tests rojos (D6) y luego el import dinámico + manifiesto (D1–D5).
2. Actualizar documentación y changeset (D7–D8); reconstruir `dist/`.
3. Verificar con el comando focalizado del paquete y con `pnpm verify`.
4. Publicar sólo con autorización explícita de tarea, siguiendo `docs/releasing.md`.
5. Rollback: revertir el commit devuelve forge a `dependencies` y el import estático; no hay estado persistido ni migración de datos.

## Open Questions

Ninguna que cambie el alcance o los specs. La sustitución completa del parser se difiere al issue #69.
