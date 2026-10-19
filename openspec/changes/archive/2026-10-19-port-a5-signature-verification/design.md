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

## Desviaciones encontradas al portar sobre `main`

1. **El verificador de respuestas no verifica documentos.** `main` autentica la
   respuesta de Hacienda (`MensajeHacienda`); el gap del brief —nadie verifica el
   comprobante que firma el propio SDK— no se cierra con esa función. El port
   **extrajo el núcleo criptográfico** del verificador de respuestas a un módulo
   interno (`signing/signature-core.ts`: perfil estricto de la firma, decisión de
   confianza por pin de hoja y verificación RSA nativa) y construyó encima el
   verificador de documentos. El verificador de respuestas conserva su
   comportamiento y sus códigos de motivo: el refactor es un movimiento, no una
   reescritura, y sus 49 pruebas siguen verdes.

2. **El oráculo ya verificaba el documento propio.** `policy-oracle.spec.ts`
   ya contrastaba la factura firmada con `libxml2 --c14n` + OpenSSL y ya
   comprobaba que el digest emitido es el SHA-256 del PDF de política. El port
   extrajo ese oráculo a un módulo reutilizable (`signing/native-oracle.ts`) y
   añadió la contraste del **corpus dorado completo** (las siete familias) bajo
   el oráculo y bajo el verificador.

3. **El lane externo tiene dos formas.** El requisito habla de un binario
   alternativo (`xmlsec1`); el oráculo del repositorio es una _implementación_,
   no un binario. El verificador acepta ambas: un verificador inyectado
   (`options.externalVerifier`, que es como se usa el oráculo) o un binario
   (`options.externalVerifierBinary` / `XMLSEC1_BIN`). Sin ninguno, el lane
   queda `skipped`; con discrepancia entre las dos fuentes, el fallo nombra a
   las dos.

4. **La confianza es por pin de hoja, y el pin es del consumidor.** No hay
   `trustRoots` en el árbol vigente (el verificador local nunca llegó a `main`),
   así que la tarea de retirarlo se cumple por construcción: la única vía de
   confianza es `options.trustedSignerCertificates`, y sin ella el resultado
   declara la confianza como no establecida y no es válido.

5. **La identidad se contrasta contra la clave, no contra un期望 externo.** El
   requisito habla de "la identidad de las partes": para un documento propio no
   hay una contraparte externa que esperar, así que la identidad se comprueba
   contra la propia clave (contribuyente, consecutivo, fecha y tipo), que es lo
   que `validateDocumentIdentity` ya garantiza en el árbol vigente.
