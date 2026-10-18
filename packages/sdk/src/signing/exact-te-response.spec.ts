import { expect, it } from "vitest";
import { exactTeFixture } from "../__fixtures__/exact-te.js";
import { createTestP12 } from "../__fixtures__/signing.js";
import { signXml } from "./signer.js";
import { loadP12 } from "./p12-loader.js";
import { verifyHaciendaResponseXml } from "./response-verifier.js";
import { ResponseVerificationError } from "../errors.js";
it("binds legitimately signed synthetic TE responses to absent or identified receivers and exact totals", async () => {
  const source = exactTeFixture(),
    p12 = createTestP12("synthetic-te-response"),
    credentials = await loadP12(p12, "synthetic-te-response");
  for (const receiver of [null, { type: "01", number: "112345678" }]) {
    const xml = `<MensajeHacienda xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/mensajeHacienda"><Clave>${source.clave}</Clave><NombreEmisor>Emisor sintético</NombreEmisor><TipoIdentificacionEmisor>02</TipoIdentificacionEmisor><NumeroCedulaEmisor>3101234567</NumeroCedulaEmisor>${receiver ? `<NombreReceptor>Persona real</NombreReceptor><TipoIdentificacionReceptor>${receiver.type}</TipoIdentificacionReceptor><NumeroCedulaReceptor>${receiver.number}</NumeroCedulaReceptor>` : ""}<Mensaje>1</Mensaje><EstadoMensaje>Aceptado</EstadoMensaje><DetalleMensaje>Sintético sin red</DetalleMensaje><MontoTotalImpuesto>13.00000</MontoTotalImpuesto><TotalFactura>113.00001</TotalFactura></MensajeHacienda>`;
    const signed = await signXml(xml, p12, "synthetic-te-response");
    const options = {
      expectedClave: source.clave,
      expectedIssuer: { type: "02", number: "3101234567" },
      expectedReceiver: receiver,
      expectedTotal: "113.00001",
      trustedSignerCertificates: [credentials.certificatePem],
    };
    expect(await verifyHaciendaResponseXml(signed, options)).toMatchObject({
      valid: true,
      status: "accepted",
      receiver,
      total: "113.00001",
    });
    await expect(
      verifyHaciendaResponseXml(signed, {
        ...options,
        expectedReceiver: receiver ? null : { type: "01", number: "112345678" },
      }),
    ).rejects.toBeInstanceOf(ResponseVerificationError);
    await expect(
      verifyHaciendaResponseXml(signed, { ...options, expectedTotal: "113.00002" }),
    ).rejects.toBeInstanceOf(ResponseVerificationError);
    await expect(
      verifyHaciendaResponseXml(signed.replace("113.00001", "113.00002"), options),
    ).rejects.toBeInstanceOf(ResponseVerificationError);
    await expect(
      verifyHaciendaResponseXml(signed, { ...options, trustedSignerCertificates: [] }),
    ).rejects.toBeInstanceOf(ResponseVerificationError);
  }
});
