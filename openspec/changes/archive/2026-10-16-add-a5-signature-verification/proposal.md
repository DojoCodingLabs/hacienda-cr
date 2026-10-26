## Why

El SDK firma y envía, pero no **verifica**. «No lanzó excepción» no es prueba de firma válida, y un bug silencioso en el identificador o el digest de la política (XAdES-EPES v4.4 **es** EPES por política explícita) genera documentos rechazados por Hacienda detectados solo en sandbox/producción. A5 añade un verificador independiente que revisa digest, firma, canonicalización, vigencia del certificado y, sobre todo, la identificación y el digest de la política de firma computados desde el PDF real del gobierno, con soporte de corpus firmado y cross-check externo.

## What Changes

- **Superficie pública nueva en el SDK**: `verifyXmlSignature(xml, options?)` (async) que devuelve `{ valid, errors, checks }` y tipifica los fallos (digest, firma, política, certificado) sin filtrar paths ni secretos.
- **Verificador de política**: `verifySigningPolicy(xml)` extrae `SignaturePolicyId` y `SigPolicyHash` y los compara byte a byte con `XADES_POLICY_URI` / `XADES_POLICY_HASH` publicados en `@dojocoding/hacienda-shared` y, opcionalmente, con el bloque `policy` de `manifest.json`.
- **Verificador de certificado**: vigencia (`notBefore`, `notAfter`), propósito (keyUsage digitalSignature) y comparación opcional contra `trustRoots` provistos por el caller (sin fetch de revocación ni verificación de cadena online en sandbox).
- **Anti-manipulación**: subir un byte del XML o del digest de política obliga a fallar la verificación con códigos nombrados (`DigestMismatch`, `InvalidSignature`, `PolicyMismatch`, `CertificateExpired`).
- **Corpus firmado no versionado**: firmado en tiempo de test con certificado autofirmado efímero; las propiedades firmadas y las pruebas de manipulación pasan a `pnpm verify`. A4 mantiene el corpus sin firmar byte-estable.
- **Lane externa opcional**: si `XMLSEC1_BIN`/`xmlsec1` está disponible, los tests lo contrastan y fallan si el resultado externo difiere.
- **Documentación**: `README.md` del SDK con API `verifyXmlSignature`, requisitos del `.p12` y warnings sobre CBC / confianza parcial.
- **Changeset**: `minor` para `@dojocoding/hacienda-sdk` por la superficie pública nueva.

**BREAKING**: ninguno; la firma y los tipos publicados no cambian. A6 cubre el parseo hostil y el endurecimiento de entradas agresivas.

## Capabilities

### New Capabilities

- `signing/verification`: verificación XAdES-EPES v4.4 independiente (digest, firma, canonicalización C14N, política, certificado, anti-manipulación y lane externa opcional).

### Modified Capabilities

Ninguna. A5 sólo añade; `validateDocumentXml` y los constructores no cambian.

## Impact

- **API pública**: nuevas funciones y tipos de verificación en `@dojocoding/hacienda-sdk` (`signing/verifier.ts`), extensión de `signing/index.ts`, barriles actualizados.
- **Código afectado**: `packages/sdk/src/signing/verifier.ts` (nuevo), tests `signer.spec.ts`/`verifier.spec.ts`, `packages/sdk/README.md`, changeset.
- **Dependencias**: ninguna obligatoria (node-forge, xadesjs/xmldsigjs ya figuran). Herramienta externa `xmlsec1` opcional por entorno.
- **Validación offline**: las pruebas de firma generan cert. autofirmado desechable (sin .p12 commiteado ni secretos); el gate `packages/sdk/src/signing/policy-manifest.spec.ts` permite limitar la policy al manifiesto.
- **Riesgo residual (documentado)**: canonicalización C14N centralizada en el mismo helper usado al firmar (no se duplican pipelines); si Hacienda publica una revisión de política, el gate `spec:verify` y `policy-manifest.spec.ts` se activan y CI fallará hasta actualizar el diges/PDF y constantes.
