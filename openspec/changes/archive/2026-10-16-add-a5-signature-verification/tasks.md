## 1. Corrección de la política de firma (Signer)

- [x] 1.0 El `signer.ts` actual almacena como `ds:SigPolicyHash` el SHA-256 del `Identifier` (vía xadesjs), no el digest del PDF: pasar `digestValue: XADES_POLICY_HASH` en el bloque `policy` para que `xadesjs` escriba la constante publicada, validada por `spec:verify` y `policy-manifest.spec.ts`. Sin esto, el verificador de A5 rechazará todos los documentos firmados.

## 2. Verificador core

- [x] 2.1 Crear `packages/sdk/src/signing/verifier.ts` con `verifyXmlSignature(xml, options?)` (async) que devuelva `{ valid, errors, checks }` tipado.
- [x] 2.2 Implementar extracción de la firma y validación de entrada con `checkXmlInput` + `XMLValidator` (sin resolución de entidades externas ni lectura de archivos).
- [x] 2.3 Implementar el digest de referencias (enveloped transform + C14N + SHA-256) con el helper de canonicalización compartido, comparando con `DigestValue`.
- [x] 2.4 Implementar verificación RSA-PKCS#1-v1.5/SHA-256 de `SignatureValue` usando la clave pública del certificado X.509 embebido (node-forge).
- [x] 2.5 Exportar el verificador y sus tipos desde `packages/sdk/src/signing/index.ts` y `packages/sdk/src/index.ts`.

## 3. Policy y certificado

- [x] 3.1 Implementar `verifySigningPolicy(xml, options?)` (o modo `only: 'policy'`) que compare identificador, hash y método con `XADES_POLICY_URI` / `XADES_POLICY_HASH`.
- [x] 3.2 Validar vigencia del certificado (`notBefore`, `notAfter`) y propósito X.509; manejar `trustRoots?` con resultado `partial` cuando no se aporte.
- [x] 3.3 Exponer diagnóstico nombrado por comprobación (`DigestMismatch`, `InvalidSignature`, `PolicyMismatch`, `CertificateExpired`, `CertificateNotYetValid`, `CanonicalizationMismatch`).
- [x] 3.4 Validar política con SHA-256 del PDF vendorizado (recalcular digest y comparar con `XADES_POLICY_HASH`) para certificar la fuente.

## 4. Pruebas de firma y anti-manipulación

- [x] 4.1 Generar certificado autofirmado efímero con OpenSSL en temp (patrón `signer.spec.ts`) y firmar fixtures v4.4.
- [x] 4.2 Probar que un documento firmado válido verifica (`valid: true`).
- [x] 4.3 Probar variantes corruptas: byte del documento, byte del digest, byte del hash de política, byte de la firma (fallan con códigos nombrados).
- [x] 4.4 Probar certificado vencido y clave no coincidente con el certificado.
- [x] 4.5 Probar la lane externa: si `XMLSEC1_BIN` está disponible, contrastar y fallar si difiere; si no, marcar `skipped`.
- [x] 4.6 Probar anti-manipulación sobre todos los bytes de la firma y la política.

## 5. Integración y documentación

- [x] 5.1 Documentar en `packages/sdk/README.md` la API `verifyXmlSignature`, requisitos y caveat de `trustRoots`.
- [x] 5.2 Crear changeset `minor` para `@dojocoding/hacienda-sdk` por la superficie de verificación.
- [x] 5.3 Formatear únicamente los archivos tocados por este cambio.

## 6. OpenSpec

- [x] 6.1 Verificar que `openspec validate add-a5-signature-verification` pasa.
- [x] 6.2 Verificar que `openspec validate --specs` no presenta regresiones tras el cambio.

## 7. Puertas

- [x] 7.1 Ejecutar `pnpm verify` y documentar budget/tiempos.
