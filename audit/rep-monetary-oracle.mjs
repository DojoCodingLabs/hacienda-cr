/** Diagnostic native-XSD counterexamples only, never a producer/payment oracle.
 * No provider, credentials, signing, original-source authority or publication. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { validateAgainstXsd } from "../packages/sdk/src/__testing__/xsd.ts";
const source = "43feefa835e93d5139379e291305956ef0034566";
const hypotheses = [
  {
    name: "legacy net sale, gross receipt",
    line: "100.00000",
    subtotal: "100.00000",
    tax: "13.00000",
    lineTotal: "113.00000",
    sale: "100.00000",
    net: "100.00000",
    total: "113.00000",
  },
  {
    name: "gross sale summary only",
    line: "100.00000",
    subtotal: "100.00000",
    tax: "13.00000",
    lineTotal: "113.00000",
    sale: "113.00000",
    net: "113.00000",
    total: "113.00000",
  },
  {
    name: "gross line and summary",
    line: "113.00000",
    subtotal: "100.00000",
    tax: "13.00000",
    lineTotal: "113.00000",
    sale: "113.00000",
    net: "113.00000",
    total: "113.00000",
  },
  {
    name: "literal net total exception",
    line: "100.00000",
    subtotal: "100.00000",
    tax: "13.00000",
    lineTotal: "113.00000",
    sale: "100.00000",
    net: "100.00000",
    total: "100.00000",
  },
];
function xml(h) {
  return `<?xml version="1.0" encoding="utf-8"?><ReciboElectronicoPago xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/reciboElectronicoPago"><Clave>${"5".repeat(50)}</Clave><ProveedorSistemas>3101234567</ProveedorSistemas><NumeroConsecutivo>00100001100000000001</NumeroConsecutivo><FechaEmision>2026-10-18T12:00:00-06:00</FechaEmision><Emisor><Nombre>Emisor sintetico</Nombre><Identificacion><Tipo>02</Tipo><Numero>3101234567</Numero></Identificacion><CorreoElectronico>issuer@example.test</CorreoElectronico></Emisor><Receptor><Nombre>Receptor sintetico</Nombre><Identificacion><Tipo>02</Tipo><Numero>3109876543</Numero></Identificacion></Receptor><CondicionVenta>11</CondicionVenta><DetalleServicio><LineaDetalle><NumeroLinea>1</NumeroLinea><Detalle>Contraejemplo estructural sin pago real</Detalle><MontoTotal>${h.line}</MontoTotal><SubTotal>${h.subtotal}</SubTotal><Impuesto><Codigo>01</Codigo><CodigoTarifaIVA>08</CodigoTarifaIVA><Tarifa>13</Tarifa><Monto>${h.tax}</Monto></Impuesto><ImpuestoNeto>${h.tax}</ImpuestoNeto><MontoTotalLinea>${h.lineTotal}</MontoTotalLinea></LineaDetalle></DetalleServicio><ResumenFactura><CodigoTipoMoneda><CodigoMoneda>CRC</CodigoMoneda><TipoCambio>1</TipoCambio></CodigoTipoMoneda><TotalVenta>${h.sale}</TotalVenta><TotalVentaNeta>${h.net}</TotalVentaNeta><TotalDesgloseImpuesto><Codigo>01</Codigo><CodigoTarifaIVA>08</CodigoTarifaIVA><TotalMontoImpuesto>${h.tax}</TotalMontoImpuesto></TotalDesgloseImpuesto><TotalImpuesto>${h.tax}</TotalImpuesto><MedioPago><TipoMedioPago>04</TipoMedioPago><TotalMedioPago>${h.total}</TotalMedioPago></MedioPago><TotalComprobante>${h.total}</TotalComprobante></ResumenFactura><InformacionReferencia><TipoDocIR>01</TipoDocIR><Numero>${"6".repeat(50)}</Numero><FechaEmisionIR>2026-10-17T12:00:00-06:00</FechaEmisionIR><Codigo>04</Codigo><Razon>Referencia sintetica sin autoridad</Razon></InformacionReferencia></ReciboElectronicoPago>`;
}
const results = hypotheses.map((h) => {
  const document = xml(h);
  const native = ["2024", "2026"].map((generation) => {
    const result = validateAgainstXsd(document, "ReciboElectronicoPago_V4.4.xsd", {
      generation,
      allowMissingSignature: true,
    });
    assert.equal(result.valid, true, `${h.name}/${generation}: ${result.errors}`);
    return {
      generation,
      valid: result.valid,
      schemaSha256: createHash("sha256")
        .update(
          readFileSync(
            new URL(
              `../packages/sdk/schemas/${generation}/v4.4/ReciboElectronicoPago_V4.4.xsd`,
              import.meta.url,
            ),
          ),
        )
        .digest("hex"),
    };
  });
  return {
    hypothesis: h,
    xmlSha256: createHash("sha256").update(document).digest("hex"),
    native,
    productionOracleApproved: false,
  };
});
const currentReferenceXml = xml(hypotheses[0]).replace(
  "<Codigo>04</Codigo><Razon>",
  "<Codigo>17</Codigo><Razon>",
);
const referenceGeneration = ["2024", "2026"].map((generation) => {
  const result = validateAgainstXsd(currentReferenceXml, "ReciboElectronicoPago_V4.4.xsd", {
    generation,
    allowMissingSignature: true,
  });
  assert.equal(result.valid, generation === "2026");
  return { generation, referenceCode: "17", valid: result.valid };
});
console.log(
  JSON.stringify(
    {
      source,
      diagnosticReferenceCode: "04",
      referenceGeneration,
      scope:
        "Synthetic XML-only audit; placeholder signature is structural only; no SDK identity/original/payment authority is tested",
      results,
    },
    null,
    2,
  ),
);
