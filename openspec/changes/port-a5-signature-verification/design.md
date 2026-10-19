## Context

Ver `proposal.md` — Why. `main` ya tiene `response-verifier.ts` (pins de hoja, RSA nativo,
total exacto) y `policy-oracle.spec.ts` (`libxml2 --c14n` + OpenSSL) más la regresión
adversarial de GHSA-86w9-cpqp-85rv. El verificador local además tiene un bug: `trustRoots`
se acepta y se marca `ok` sin comparar nada.

## Goals / Non-Goals

**Goals:**

- Apoyarse en la autoridad de `main` en vez de duplicarla.
- Verificar el documento propio firmado (el gap real del brief).
- Fijar el modelo de confianza: pin de hoja explícito.

**Non-Goals:**

- Validar cadena CA, revocación o confianza institucional.
- Publicar un verificador de "confianza" que no la tenga.
- Reimplementar el oráculo nativo.

## Decisions

| Decisión                                                  | Racional                                                                                   | Alternativas consideradas                                      |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| **Reutilizar `response-verifier` + oráculo de `main`**    | Ya cubre digest, C14N, RSA nativo, identidad y total; está revisado                        | Portar el verificador local (384 LOC, duplicado y con bug)     |
| **Confianza por pin de hoja, no por cadena**              | `main` lo declara explícitamente; encadenar CA exige PKI institucional que el SDK no tiene | "trustRoots" con cadena (imposible de satisfacer honestamente) |
| **Se retira el `trustRoots` que no comparaba**            | Emitir `valid: true` con confianza no verificada es peor que no verificar                  | Dejarlo como está (falso positivo de seguridad)                |
| **Oráculo por defecto `libxml2` + OpenSSL**               | Ya está en CI (`libxml2-utils` instalado); no requiere red                                 | `xmlsec1` (no está en la imagen de CI)                         |
| **Se verifica el documento propio firmado**               | Es lo que el brief pide ("cada documento dorado verifica")                                 | Verificar sólo la respuesta de Hacienda (ya cubierto)          |
| **El identificador de política se alinea con el oficial** | `main` ya fijó `/xml-schemas/` con el hash del PDF; el local arrastraba el typo            | Mantener el typo local (rechazado por el review)               |

## Risks / Trade-offs

- **[Riesgo: la spec local pedía cadena y ahora pide pin]** → cambio de contrato explícito, con la justificación en la spec.
- **[Riesgo: el oráculo depende de binarios nativos]** → ya son prerrequisito de CI; si faltan, el lane se marca `skipped`.
- **[Riesgo: verificar el documento propio no prueba aceptación de Hacienda]** → se documenta: probar la firma es ≠ aceptación fiscal.
- **[Riesgo: el pin de hoja es por实例]** → cada consumidor declara sus propios pines revisados; el SDK no trae ninguno por defecto.
