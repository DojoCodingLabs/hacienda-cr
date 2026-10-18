import { describe, expect, it } from "vitest";
import {
  ExactRecipientMessageInputSchema,
  type ExactRecipientMessageInput,
} from "@dojocoding/hacienda-shared";
import { exactNcFixture } from "../__fixtures__/exact-nc.js";
import { createTestP12 } from "../__fixtures__/signing.js";
import { validateAgainstXsd } from "../__testing__/xsd.js";
import { signXml } from "../signing/signer.js";
import { validateDocumentXml } from "../xml/schema-validator.js";
import { calculateExactFe } from "../tax/exact-fe.js";
import { buildExactMensajeReceptorXml } from "./exact-recipient-message-builder.js";
import { buildMensajeReceptorXml } from "./mensaje-receptor-builder.js";
function fixture(message: "1" | "2" | "3" = "1"): ExactRecipientMessageInput {
  return {
    caseCode: "MR-domestic-ordinary-fe-iva13-v1",
    original: exactNcFixture().original,
    fechaEmisionDoc: "2026-10-18T13:00:00-06:00",
    numeroConsecutivoReceptor: `00100001${{ "1": "05", "2": "06", "3": "07" }[message]}0000000001`,
    mensaje: message,
    ...(message === "1" ? {} : { detalleMensaje: "Diferencia real de los servicios recibidos" }),
  };
}
describe("exact original-bound recipient confirmation", () => {
  it.each(["1", "2", "3"] as const)(
    "preserves complete original money and identity for message %s",
    async (message) => {
      const input = fixture(message),
        before = JSON.stringify(input);
      const xml = buildExactMensajeReceptorXml(input);
      expect(xml).toContain(`<Clave>${input.original.clave}</Clave>`);
      expect(xml).toContain(
        `<NumeroCedulaEmisor>${input.original.emisor.identificacion.numero}</NumeroCedulaEmisor>`,
      );
      expect(xml).toContain(
        `<NumeroCedulaReceptor>${input.original.receptor.identificacion.numero}</NumeroCedulaReceptor>`,
      );
      expect(xml).toContain(`<FechaEmisionDoc>${input.fechaEmisionDoc}</FechaEmisionDoc>`);
      expect(xml).toContain(
        `<NumeroConsecutivoReceptor>${input.numeroConsecutivoReceptor}</NumeroConsecutivoReceptor>`,
      );
      expect(xml).toContain("<MontoTotalImpuesto>13.00000</MontoTotalImpuesto>");
      expect(xml).toContain("<TotalFactura>113.00000</TotalFactura>");
      expect(xml).not.toContain("<CondicionImpuesto>");
      for (const generation of ["2024", "2026"] as const)
        expect(
          validateAgainstXsd(xml, "MensajeReceptor_V4.4.xsd", {
            allowMissingSignature: true,
            generation,
          }).errors,
        ).toBe("");
      expect((await validateDocumentXml(xml)).valid).toBe(true);
      expect(JSON.stringify(input)).toBe(before);
    },
  );
  it("does not infer credit from partial acceptance and preserves independent explicit tax decisions", () => {
    const input = {
      ...fixture("2"),
      iva: {
        condicionImpuesto: "02" as const,
        codigoActividad: "620100",
        montoTotalImpuestoAcreditar: "1.23456",
        montoTotalDeGastoAplicable: "10.00001",
      },
    };
    for (const condicionImpuesto of ["01", "02", "03"] as const)
      expect(
        ExactRecipientMessageInputSchema.safeParse({
          ...fixture(),
          iva: { condicionImpuesto, montoTotalImpuestoAcreditar: "1" },
        }).success,
      ).toBe(false);
    const xml = buildExactMensajeReceptorXml(input);
    expect(xml).toContain("<MontoTotalImpuestoAcreditar>1.23456</MontoTotalImpuestoAcreditar>");
    expect(xml).toContain("<MontoTotalDeGastoAplicable>10.00001</MontoTotalDeGastoAplicable>");
    expect(xml).toContain("<TotalFactura>113.00000</TotalFactura>");
    for (const iva of [
      { condicionImpuesto: "02", montoTotalImpuestoAcreditar: "13.00001" },
      { condicionImpuesto: "02", montoTotalDeGastoAplicable: "113.00001" },
      { condicionImpuesto: "04", montoTotalImpuestoAcreditar: "0.00001" },
      { condicionImpuesto: "01", montoTotalImpuestoAcreditar: "12.99999" },
    ] as const)
      expect(() =>
        buildExactMensajeReceptorXml({ ...fixture(), iva: { ...iva, codigoActividad: "620100" } }),
      ).toThrow("allocation");
    expect(() =>
      buildExactMensajeReceptorXml({ ...fixture(), iva: { condicionImpuesto: "05" } }),
    ).not.toThrow();
    expect(() =>
      buildExactMensajeReceptorXml({
        ...fixture(),
        iva: { condicionImpuesto: "04", montoTotalImpuestoAcreditar: "0" },
      }),
    ).not.toThrow();
    expect(
      ExactRecipientMessageInputSchema.safeParse({
        ...fixture(),
        iva: { condicionImpuesto: "05", codigoActividad: "620100" },
      }).success,
    ).toBe(false);
    expect(
      ExactRecipientMessageInputSchema.safeParse({
        ...fixture("3"),
        iva: { condicionImpuesto: "04" },
      }).success,
    ).toBe(false);
  });
  it("rejects caller money, source-proof flags, wrong consecutive and altered original identity", () => {
    const input = fixture();
    for (const patch of [
      { totalFactura: "1" },
      { montoTotalImpuesto: "1" },
      { accepted: true },
      { numeroCedulaReceptor: "3101999999" },
      { numeroConsecutivoReceptor: "00100001060000000001" },
      { numeroConsecutivoReceptor: "00000001050000000001" },
      { numeroConsecutivoReceptor: "00100000050000000001" },
      { numeroConsecutivoReceptor: "00100001050000000000" },
      { numeroConsecutivoReceptor: 123 },
    ])
      expect(ExactRecipientMessageInputSchema.safeParse({ ...input, ...patch }).success).toBe(
        false,
      );
    expect(() =>
      buildExactMensajeReceptorXml({
        ...input,
        original: { ...input.original, numeroConsecutivo: "00100001010000000999" },
      }),
    ).toThrow("identity");
    const badMoney = structuredClone(input);
    const line = badMoney.original.detalleServicio[0];
    if (!line) throw new Error("Missing source line");
    line.precioUnitario = "99";
    expect(() => buildExactMensajeReceptorXml(badMoney)).toThrow("allocation");
  });
  it("preserves Unicode reason bounds and full fractional chronology across offsets", () => {
    for (const count of [5, 160])
      expect(() =>
        buildExactMensajeReceptorXml({ ...fixture("2"), detalleMensaje: "😀".repeat(count) }),
      ).not.toThrow();
    for (const detalleMensaje of ["😀".repeat(4), "😀".repeat(161), "     ", undefined])
      expect(
        ExactRecipientMessageInputSchema.safeParse({ ...fixture("2"), detalleMensaje }).success,
      ).toBe(false);
    const input = fixture();
    input.original.fechaEmision += ".invalid";
    expect(ExactRecipientMessageInputSchema.safeParse(input).success).toBe(false);
    const original = fixture().original;
    const equal = {
      ...fixture(),
      original: { ...original, fechaEmision: "2026-10-18T12:00:00.0000000009-06:00" },
      fechaEmisionDoc: "2026-10-18T18:00:00.0000000009+00:00",
    };
    expect(ExactRecipientMessageInputSchema.safeParse(equal).success).toBe(true);
    expect(
      ExactRecipientMessageInputSchema.safeParse({
        ...equal,
        fechaEmisionDoc: "2026-10-18T18:00:00.0000000008+00:00",
      }).success,
    ).toBe(false);
  });
  it("uses exact original decimal totals, signs synthetic XML, and preserves the Number builder wire", async () => {
    const input = fixture();
    const line = input.original.detalleServicio[0];
    if (!line) throw new Error("Missing source line");
    line.precioUnitario = "0.00001";
    input.original.medioPago = [{ tipoMedioPago: "01", totalMedioPago: "0.00001" }];
    const totals = calculateExactFe(input.original).resumenFactura;
    expect(totals.totalImpuesto).toBe("0.00000");
    const xml = buildExactMensajeReceptorXml(input);
    expect(xml).toContain("<TotalFactura>0.00001</TotalFactura>");
    expect(xml).toContain("<MontoTotalImpuesto>0.00000</MontoTotalImpuesto>");
    const signed = await signXml(xml, createTestP12("recipient-source"), "recipient-source");
    expect((await validateDocumentXml(signed, { requireSignature: true })).valid).toBe(true);
    const legacy = buildMensajeReceptorXml({
      clave: input.original.clave,
      numeroCedulaEmisor: input.original.emisor.identificacion.numero,
      fechaEmisionDoc: input.fechaEmisionDoc,
      mensaje: "1",
      montoTotalImpuesto: 13,
      totalFactura: 113,
      numeroCedulaReceptor: input.original.receptor.identificacion.numero,
      numeroConsecutivoReceptor: input.numeroConsecutivoReceptor,
    });
    expect(legacy).toContain("<TotalFactura>113</TotalFactura>");
    expect(legacy).toContain("<MontoTotalImpuesto>13</MontoTotalImpuesto>");
  });
});
