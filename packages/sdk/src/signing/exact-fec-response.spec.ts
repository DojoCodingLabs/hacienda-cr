import { expect, it, vi } from "vitest";

// La prueba genera un par de claves RSA, firma y verifica: bajo carga
// paralela puede pasar de los 5 s por defecto, asi que lleva presupuesto propio.
vi.setConfig({ testTimeout: 60_000 });
import { exactFecFixture } from "../__fixtures__/exact-fec.js";
import { createTestP12 } from "../__fixtures__/signing.js";
import { signXml } from "./signer.js";
import { loadP12 } from "./p12-loader.js";
import { verifyHaciendaResponseXml } from "./response-verifier.js";
import { ResponseVerificationError } from "../errors.js";
it("binds a legitimate synthetic response to explicit caller context without inventing the live FEC party oracle", async () => {
  const source = exactFecFixture(),
    pin = "synthetic-fec-response",
    p12 = createTestP12(pin),
    credential = await loadP12(p12, pin);
  const supplier = {
      type: source.emisor.identificacion.tipo,
      number: source.emisor.identificacion.numero,
    },
    buyer = {
      type: source.receptor.identificacion.tipo,
      number: source.receptor.identificacion.numero,
    };
  // Both explicitly declared synthetic contexts exercise generic verification.
  // Neither ordering is evidence of Hacienda's actual FEC response role mapping.
  for (const [issuer, receiver] of [
    [supplier, buyer],
    [buyer, supplier],
  ] as const) {
    const xml = `<MensajeHacienda xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/mensajeHacienda"><Clave>${source.clave}</Clave><NombreEmisor>Identidad sintética declarada</NombreEmisor><TipoIdentificacionEmisor>${issuer.type}</TipoIdentificacionEmisor><NumeroCedulaEmisor>${issuer.number}</NumeroCedulaEmisor><NombreReceptor>Otra identidad sintética declarada</NombreReceptor><TipoIdentificacionReceptor>${receiver.type}</TipoIdentificacionReceptor><NumeroCedulaReceptor>${receiver.number}</NumeroCedulaReceptor><Mensaje>1</Mensaje><EstadoMensaje>Aceptado</EstadoMensaje><DetalleMensaje>Sin red ni aceptación real</DetalleMensaje><MontoTotalImpuesto>13.00000</MontoTotalImpuesto><TotalFactura>113.00000</TotalFactura></MensajeHacienda>`;
    const signed = await signXml(xml, p12, pin),
      options = {
        expectedClave: source.clave,
        expectedIssuer: issuer,
        expectedReceiver: receiver,
        expectedTotal: "113.00000",
        trustedSignerCertificates: [credential.certificatePem],
      };
    expect(await verifyHaciendaResponseXml(signed, options)).toMatchObject({
      valid: true,
      issuer,
      receiver,
      total: "113.00000",
    });
    for (const patch of [
      { expectedIssuer: receiver },
      { expectedReceiver: issuer },
      { expectedTotal: "100.00000" },
      { expectedClave: source.clave.replace(/.$/, "0") },
      { trustedSignerCertificates: [] },
    ])
      await expect(
        verifyHaciendaResponseXml(signed, { ...options, ...patch }),
      ).rejects.toBeInstanceOf(ResponseVerificationError);
    await expect(
      verifyHaciendaResponseXml(signed.replace("113.00000", "113.00001"), options),
    ).rejects.toBeInstanceOf(ResponseVerificationError);
  }
}, 60_000);
