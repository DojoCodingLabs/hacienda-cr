import { describe, expect, it, vi, afterEach } from "vitest";
import { draftCommand } from "./draft.js";

describe("draft command output contract", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("emits blank-template money and quantities as decimal text", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await draftCommand.run?.({
      args: { json: true, interactive: false, template: "factura", output: "unused.json" },
      rawArgs: [],
      cmd: draftCommand,
    });

    const output = JSON.parse(String(log.mock.calls.at(-1)?.[0])) as {
      detalleServicio: {
        cantidad: unknown;
        precioUnitario: unknown;
        montoTotal: unknown;
        subTotal: unknown;
        impuesto: { monto: unknown }[];
        impuestoNeto: unknown;
        montoTotalLinea: unknown;
      }[];
      resumenFactura: {
        totalComprobante: unknown;
        medioPago: { totalMedioPago: unknown }[];
      };
    };

    const line = output.detalleServicio[0];
    expect(typeof line?.cantidad).toBe("string");
    expect(typeof line?.precioUnitario).toBe("string");
    expect(typeof line?.montoTotal).toBe("string");
    expect(typeof line?.subTotal).toBe("string");
    expect(typeof line?.impuesto[0]?.monto).toBe("string");
    expect(typeof line?.impuestoNeto).toBe("string");
    expect(typeof line?.montoTotalLinea).toBe("string");
    expect(typeof output.resumenFactura.totalComprobante).toBe("string");
    expect(typeof output.resumenFactura.medioPago[0]?.totalMedioPago).toBe("string");
  });
});
