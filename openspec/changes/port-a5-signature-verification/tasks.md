## 1. Alinear con la autoridad de main

- [ ] 1.1 Adoptar el modelo de confianza por pin de hoja explícito de `main` y retirar el `trustRoots` que no comparaba.
- [ ] 1.2 Confirmar que el identificador de política publicado es el oficial vigente (con guion) y que su hash coincide con el PDF vendorizado.
- [ ] 1.3 Confirmar que el `signer` de `main` emite `digestValue` (no hace falta cambiarlo) y que el digest escrito es el del PDF.

## 2. Verificador del documento propio firmado

- [ ] 2.1 Implementar la verificación de un comprobante firmado por el SDK: digest por referencia, firma sobre `ds:SignedInfo`, C14N, vigencia del certificado e identidad de partes.
- [ ] 2.2 Determinar el tipo de comprobante por el elemento raíz, sin inferirlo del contenido.
- [ ] 2.3 Exportar la API desde el barrel del SDK y documentar que la confianza se establece por pin.

## 3. Validación cruzada

- [ ] 3.1 Extender `policy-oracle.spec.ts` para verificar también el documento propio firmado bajo `libxml2 --c14n` + OpenSSL.
- [ ] 3.2 Mantener el lane `xmlsec1` como alternativa opcional y no bloqueante, con `skipped` explícito.
- [ ] 3.3 Verificar que un documento alterado es rechazado por el oráculo y por el verificador interno.

## 4. Anti-manipulación

- [ ] 4.1 Firmar el corpus dorado y comprobar que verifica bajo el verificador y bajo el oráculo.
- [ ] 4.2 Comprobar que mutar un byte del documento, del digest de política o de la firma falla con código nombrado.

## 5. OpenSpec

- [ ] 5.1 Verificar que `openspec validate port-a5-signature-verification` pasa.
- [ ] 5.2 Verificar que `openspec validate --specs` no presenta regresiones.

## 6. Puertas

- [ ] 6.1 Ejecutar `pnpm verify` y las pruebas de firma.
- [ ] 6.2 Documentar en el README que la verificación de firma no constituye aceptación fiscal.
