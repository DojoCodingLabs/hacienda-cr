## Why

A5 (verificación de firmas) se implementó localmente como un verificador propio con `trustRoots` **que nunca compara** (marca la cadena como `ok` sin verificar nada) y un lane externo con `xmlsec1`, que no está instalado en CI. La autoridad de `main` ya tiene algo más fuerte: `response-verifier.ts` con **pins de hoja explícitos**, RSA nativo (WebCrypto) y un oráculo independiente (`policy-oracle.spec.ts`: `libxml2 --c14n` + OpenSSL) más una regresión adversarial del advisory GHSA-86w9-cpqp-85rv.

El brief de A5 pide: _verificador independiente_ (digest, cadena, canonicalización, política desde el PDF real), _validación cruzada contra una segunda implementación_ y _cada documento dorado verifica bajo nuestro verificador y bajo una herramienta externa_. `main` cubre la validación cruzada; falta la pieza del brief: **verificar el documento dorado propio firmado**, no sólo la respuesta de Hacienda.

## What Changes

- **Se abandona el verificador propio**: no se porta. El verificador de respuestas de `main` es la autoridad y cubre digest, canonicalización, RSA nativo, identidad de partes y total exacto.
- **Modelo de confianza explícito**: se documenta y se prueba que la confianza es por **pin de hoja exacto** (nunca cadena CA implícita, nunca revocación por red), alineado con `main`.
- **Verificación del documento propio firmado**: nueva capacidad que verifica el XML firmado que el SDK produce, comprobando digest, firma, canonicalización C14N, vigencia del certificado y — sobre todo — que el `ds:SigPolicyHash` escrito sea el SHA-256 del PDF de política vendorizado.
- **Validación cruzada con una segunda implementación**: se reutiliza el oráculo de `main` (`libxml2 --c14n` + OpenSSL) en lugar de `xmlsec1`; el lane externo queda **opcional y no bloqueante**, con `skipped` explícito cuando la herramienta no está.
- **Anti-manipulación sobre el corpus dorado firmado**: mutar un byte del documento, del digest de política o de la firma debe hacer fallar la verificación con código nombrado.
- **Corrección de la divergencia de política**: el identificador de política se alinea con el valor oficial vigente (`/xml-schemas/`, con guion) y con el hash del PDF que `main` ya fijó.

**BREAKING**: ninguno (superficie nueva; se retira el verificador local que nunca se publicó en `main`).

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `signing/verification`: la verificación pasa a apoyarse en el verificador de respuestas y el oráculo de `main`, con confianza por pin de hoja explícito y verificación del documento propio firmado, incluido el digest de política.

## Impact

- **Código afectado**: `packages/sdk/src/signing/verifier.ts` (nuevo, sobre `response-verifier.ts`), `packages/sdk/src/signing/verifier.spec.ts`, `packages/sdk/src/signing/policy-oracle.spec.ts` (extendido al documento propio), `packages/sdk/src/signing/signer.ts` (sin cambios: `main` ya emite `digestValue`).
- **Corrección de la spec**: el requirement que hoy exige "encadenar a una de las anclas" se reescribe al modelo de pin de hoja, que es el que `main` sostiene y el único verificable sin CA.
- **Lane externo**: `xmlsec1` queda como opción; el oráculo por defecto es `libxml2` + OpenSSL, ya disponible en CI.
- **Riesgo residual**: la regresión adversarial de GHSA ya cubierta por `main`; este port no la duplica.
