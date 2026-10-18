# Exact non-subject personal-used-goods purchase

The additive `ExactFecUsedPersonalGoodsNonSubjectInputSchema`,
`calculateExactFecUsedPersonalGoodsNonSubject` and
`buildExactFacturaCompraUsedPersonalGoodsNonSubjectXml` implement only
`FEC-used-personal-goods-non-subject-v1`. This is an explicitly selected acquisition
of actual used personal goods from a non-contributor in a nonhabitual disposal,
independently classified non-subject with no IVA credit. Supplier06 alone never
selects this treatment. The SDK does not verify legal qualification, registration,
source authenticity, credit, acceptance, tax payment or customer delivery.

Actual supplier 06 stays XML Emisor; actual domestic buyer 01–04 owns clave 08 and
signs. Condition 13 is required. Goods CABYS 0–4, IVA code 01 / tariff 11 / rate 0, actual
supporting evidence and positive exact payment allocations are required. Known
local supplier location is optional; no address/activity is invented. Reference
06/07/99 uses reason 04; 99 requires its actual document-type description. No source
clave/date, qualification boolean or total can be fabricated. Credit days are not
invented under condition 13. Allocation is a declaration, not proof of cash receipt.

Ordinary commercial discounts reuse existing exact schemas: amount or percentage,
up to five per line; gift/bonus codes 01/02/03 remain unsupported. Gross products
and percentage discounts round HALF_UP to five decimals at their existing
boundaries. A line's deductions must leave a positive net amount. Gross values
sum into TotalMercNoSujeta, TotalNoSujeto and TotalVenta; discounts sum separately;
TotalVentaNeta and TotalComprobante equal gross minus discounts. Mandatory line
IVA nodes and the matching breakdown contain tariff 11 / zero. No gravado/exento,
exoneration, factor or future resale margin is synthesized.

This case excludes services, surtidos, factory tax, extra charges/levies, foreign
suppliers, transformed goods and other used-goods treatments. It does not produce
a reseller's later ordinary, margin or factor tax. Those economic events remain
separate required V1 work. No mutable policy flag or dummy IVA13 source is used.

## Primary source and verification limits

[Current annex](https://www.hacienda.go.cr/docs/ANEXOS_Y_ESTRUCTURAS_V4.4.pdf),
SHA256 `6e093226b29b38c5c8de825f70c1b1cb8ed81e2f4a6eb0b3ff52708fc1eb2769`,
provides supplier 06/condition 13, mandatory tax node, tariff 11 and gross non-subject
summary rules (pp. 37–38, 52–53, 69–74). The
[official worked presentation](https://www.hacienda.go.cr/docs/IVAenBienesUsados28_7_21.pdf)
separates the non-contributor's personal-goods purchase with no charged IVA from
later taxed resale. The [reviewed primary matrix](../openspec/changes/add-used-personal-goods-fec/design.md)
records the legal-case synthesis, exact evidence and retrieval limitations. It is
not a claim that Hacienda published this generated XML as a worked example.

Native XSD and legitimate synthetic signing demonstrate structure, not taxpayer
qualification or institutional acceptance. Generic synthetic response verification
binds only explicitly supplied test context; actual FEC response party/correlation
semantics remain gated. No app integration, transport activation or publication
is included. Existing current/retained/Number APIs and monetary output are preserved.

## Verification checkpoint

Full `pnpm verify` passed on the implemented runtime: 247 shared, 1,164 SDK,
75 CLI and 49 MCP unit tests (1,535 total), four intentional live skips,
118 script regressions and all four fresh packed consumers. The independent
Python Decimal matrix covers percentage/amount discounts, multiple lines,
half-up boundary, maximum gross/net, CRC/USD and split allocations. Existing
ordinary FEC and foreign-service FEC byte goldens remain unchanged. Final foreign-service byte-golden and genuine aggregate-bound assertions also pass
in the complete final verification.

The first declaration build correctly rejected an incompatible Zod safeExtend
from IVA13 to tariff 11. The fix explicitly reuses the broad internal line base
and reapplies goods classification under its own strict tax contract; current
FE/retained schemas are unchanged. An initial focused test expected compact XML;
it was corrected to compare insignificant formatting whitespace. Neither failure
was a financial/native producer pass and both diagnostic logs are retained.
