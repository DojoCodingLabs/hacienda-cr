## Context

Ver `proposal.md` — Why/Motivation y las motivaciones de A4. A5 es cross-cutting (firma + verificación + política + cert.), por lo que el diseño va aquí. A4 entrega el corpus unsigned, el parser y las propiedades de XSD/punto fijo; A5 reutiliza el helper de canonicalización de `xmldsigjs`, el gate `policy-manifest.spec.ts` y los certificados generados en temp (patrón `signer.spec.ts`).

## Goals / Non-Goals

**Goals:**

- Verificador independiente con digest + firma RSA + policy + cert, sin depender exclusivamente del mismo código de firma.
- Anti-manipulación byte a byte (firma, digest, política) con códigos nombrados.
- Policy computada desde el PDF vendorizado (ya gate en `spec:verify`) y comparada contra constants del SDK.
- Lane externo opcional con `xmlsec1` cuando esté disponible.

**Non-Goals:**

- Revocación por red (no-opera en sandbox).
- Certificates chaining (trust roots) más allá de validación básica cuando el caller los entregue.
- Versionar bytes firmados (no deterministas).
- Parseo hostil y endurecimiento (A6).

## Decisions

| Decisión                                                                                    | Racional                                                                                                                                                     | Alternativas consideradas                                              |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| **Reutilizar `XmlDsigC14NTransform` de xmldsigjs/xmldsig en el helper de canonicalización** | Evita divergencia de algoritmo C14N con el signer. El veredicto sigue siendo nuestro (digest+RSA+policy)                                                     | Eseribir C14N a mano (alto riesgo R1); usar openssl (variables)        |
| **Veredicto estructurado con `checks`**                                                     | Diferencia fallos digest/signature/policy/cert, no solo "válido/ inválido". A5 requires explicar _qué_ faltó                                                 | Res booleano simple (no apto para tamper tests)                        |
| **Utilizar `node-forge` para parseo X.509/ RSA verify**                                     | Independiente de `xadesjs` para el algoritmo; deja el crypto verificable                                                                                     | WebCrypto.crypto.verify (acopla a node-forge en tests)                 |
| **Policy en build time, constants en tiempo de compilación**                                | `spec:verify` valida ya el sha256 del PDF; A5 expone `verifyPolicy(xml)` que valora la policy block de la firma contra constants + optional `manifest` block | Recalcular desde PDF en runtime (costoso, acopla rutas)                |
| **Cert. autofirmado efímero en tests**                                                      | No commitear `.p12` ni secretos; el patrón `signer.spec` ya lo establece                                                                                     | Cert fijo en test (violación boundaries AGENTS.md)                     |
| **Lane externa opcional por env `XMLSEC1_BIN`**                                             | No fuerza coste de instalación ni red en CI. Cuando disponible compara con SDK                                                                               | Instalar xmlsec1 por default (overhead, posibles flakiness en Windows) |

## Risks / Trade-offs

- **[Riesgo: canonicalización divergente]** → helper compartido + prueba de propiedad de agreement entre firma y verificador. Si se detecta mismmatch, se ajusta el helper, no se reescriben cert.
- **[Riesgo: sin xmlsec1 externo en CI]** → test skipped por env y reporter incluye el lane. GOarn job externo on-demand con apt.
- **[Riesgo: cadena falsificada]** → `trustRoots?` opcional, resultado marca `partial` si no se otorga; date validity y basic constraints obligatorios. Test de cert posterior.
- **[Riesgo: tampering detection-flaky por flotación]** → tests separados para digest, firma, policy y cert, un byte distinto por cada.
- **[Riesgo: romper `policy-manifest.spec.ts` por divergencia]** → `verifyPolicy` usa constants actuales, no mutated evidence, sin breaking.

## Migration Plan

1. `verifier.ts` + test harness (sin cambios públicos fuera de signing).
2. export y README.
3. `pnpm verify` + property test budget moderado → evaluar.
4. Cierre de A5 se evalúa cuando todos los tests de tamper pertenecen.

## Open Questions

- **Policy attestation vía test**: ¿A5 debe exportar `verifyPolicy` separado, o es parte de `verifyXmlSignature({only: "policy"})`? Ambos son equivalentes con alias. Resuelto en implementación sin cambio de spec.

- **C14N confiar plenamente a xmldsigjs**: se adopta por reducción de riesgo; la API sigue siendo el mismo helper.
