---
"@dojocoding/hacienda-sdk": minor
---

A5 — verificación de firmas, no solo generación

Superficie pública nueva: `verifyXmlSignature(xml, options?)` y `verifySigningPolicy(xml, options?)`, que devuelven un resultado estructurado (`valid`, `errors`, `checks`) con verificaciones separadas de digest, firma RSA, política XAdES-EPES v4.4 (identificador, hash SHA-256, canonicalización C14N) y vigencia del certificado.

También se corrigió el flujo de firma para que `ds:SigPolicyHash` almacene el SHA-256 base64 del PDF de la resolución técnica (antes almacenaba el digest del identificador), lo que hace que las firmas reales se validen contra la política de Hacienda.

Corpus y anti-manipulación: pruebas de firma válida y corrupción byte a byte vía certificado autofirmado efímero, con lane externa opcional `xmlsec1`.
