import { expect, it } from "vitest";
import { exactNcPartialFixture } from "../__fixtures__/exact-credit-extensions.js";
import { createTestP12 } from "../__fixtures__/signing.js";
import { signXml } from "./signer.js";
import { loadP12 } from "./p12-loader.js";
import { verifyHaciendaResponseXml } from "./response-verifier.js";
import { ResponseVerificationError } from "../errors.js";
it("verifies genuine synthetic partial NC response against its credit, not the original FE total or identity", async () => {
  const input = exactNcPartialFixture(),
    p12 = createTestP12("synthetic-partial-response"),
    credentials = await loadP12(p12, "synthetic-partial-response"),
    receiver = input.original.receptor.identificacion;
  const xml = `<MensajeHacienda xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/mensajeHacienda"><Clave>${input.clave}</Clave><NombreEmisor>Emisor sintético</NombreEmisor><TipoIdentificacionEmisor>${input.original.emisor.identificacion.tipo}</TipoIdentificacionEmisor><NumeroCedulaEmisor>${input.original.emisor.identificacion.numero}</NumeroCedulaEmisor><NombreReceptor>Receptor sintético</NombreReceptor><TipoIdentificacionReceptor>${receiver.tipo}</TipoIdentificacionReceptor><NumeroCedulaReceptor>${receiver.numero}</NumeroCedulaReceptor><Mensaje>1</Mensaje><EstadoMensaje>Aceptado</EstadoMensaje><DetalleMensaje>Sintético sin red</DetalleMensaje><MontoTotalImpuesto>1.30000</MontoTotalImpuesto><TotalFactura>11.30001</TotalFactura></MensajeHacienda>`;
  const signed = await signXml(xml, p12, "synthetic-partial-response"),
    options = {
      expectedClave: input.clave,
      expectedIssuer: {
        type: input.original.emisor.identificacion.tipo,
        number: input.original.emisor.identificacion.numero,
      },
      expectedReceiver: { type: receiver.tipo, number: receiver.numero },
      expectedTotal: "11.30001",
      trustedSignerCertificates: [credentials.certificatePem],
    };
  expect(await verifyHaciendaResponseXml(signed, options)).toMatchObject({
    valid: true,
    status: "accepted",
    clave: input.clave,
    total: "11.30001",
  });
  for (const change of [
    { expectedClave: input.original.clave },
    { expectedTotal: "113.00000" },
    { expectedReceiver: null },
    { trustedSignerCertificates: [] },
  ])
    await expect(
      verifyHaciendaResponseXml(signed, { ...options, ...change }),
    ).rejects.toBeInstanceOf(ResponseVerificationError);
  await expect(
    verifyHaciendaResponseXml(signed.replace("11.30001", "11.30002"), options),
  ).rejects.toBeInstanceOf(ResponseVerificationError);
});

import { exactFeReplacementFixture } from "../__fixtures__/exact-credit-extensions.js";
it("binds a legitimate synthetic replacement response to the fresh FE, never the rejected reference", async () => {
  const input = exactFeReplacementFixture(),
    next = input.replacement,
    password = "synthetic-replacement-response",
    p12 = createTestP12(password),
    credentials = await loadP12(p12, password),
    receiver = next.receptor.identificacion;
  const xml = `<MensajeHacienda xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/mensajeHacienda"><Clave>${next.clave}</Clave><NombreEmisor>Emisor sintético</NombreEmisor><TipoIdentificacionEmisor>${next.emisor.identificacion.tipo}</TipoIdentificacionEmisor><NumeroCedulaEmisor>${next.emisor.identificacion.numero}</NumeroCedulaEmisor><NombreReceptor>Receptor sintético</NombreReceptor><TipoIdentificacionReceptor>${receiver.tipo}</TipoIdentificacionReceptor><NumeroCedulaReceptor>${receiver.numero}</NumeroCedulaReceptor><Mensaje>1</Mensaje><EstadoMensaje>Aceptado</EstadoMensaje><DetalleMensaje>Sintético sin red</DetalleMensaje><MontoTotalImpuesto>13.00000</MontoTotalImpuesto><TotalFactura>113.00000</TotalFactura></MensajeHacienda>`;
  const signed = await signXml(xml, p12, password),
    options = {
      expectedClave: next.clave,
      expectedIssuer: {
        type: next.emisor.identificacion.tipo,
        number: next.emisor.identificacion.numero,
      },
      expectedReceiver: { type: receiver.tipo, number: receiver.numero },
      expectedTotal: "113.00000",
      trustedSignerCertificates: [credentials.certificatePem],
    };
  expect(await verifyHaciendaResponseXml(signed, options)).toMatchObject({
    valid: true,
    status: "accepted",
    clave: next.clave,
    total: "113.00000",
  });
  for (const change of [
    { expectedClave: input.rejected.clave },
    { expectedTotal: "11.30001" },
    { expectedReceiver: null },
    { trustedSignerCertificates: [] },
  ])
    await expect(
      verifyHaciendaResponseXml(signed, { ...options, ...change }),
    ).rejects.toBeInstanceOf(ResponseVerificationError);
  await expect(
    verifyHaciendaResponseXml(signed.replace("113.00000", "114.00000"), options),
  ).rejects.toBeInstanceOf(ResponseVerificationError);
});
