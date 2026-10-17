---
"@dojocoding/hacienda-shared": minor
"@dojocoding/hacienda-sdk": minor
---

Add `ExactFeInputSchema`/`ExactFeCalculatedSchema`, string-only monetary/quantity
schemas and `calculateExactFe`/`buildExactFacturaXml` for explicitly named
`FE-domestic-ordinary-iva13-v1`. Use scaled BigInt with documented five-decimal
half-up boundaries and canonical exact XML strings. Preserve legacy Number APIs;
reject unsupported regimes, coercion, overflow and inconsistent full payment
allocation. No fiscal activation or CLI/MCP migration is implied.
