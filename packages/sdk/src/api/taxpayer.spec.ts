/**
 * Tests for the taxpayer economic activity lookup.
 */

import { describe, it, expect, vi } from "vitest";
import type { ActividadEconomicaResponse } from "@hacienda-cr/shared";

import { lookupTaxpayer } from "./taxpayer.js";
import { ApiError } from "../errors.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
    headers: new Headers(),
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// lookupTaxpayer
// ---------------------------------------------------------------------------

describe("lookupTaxpayer", () => {
  it("returns taxpayer info on successful lookup", async () => {
    const mockData: ActividadEconomicaResponse = {
      nombre: "EMPRESA EJEMPLO S.A.",
      tipoIdentificacion: "02",
      actividades: [
        {
          codigo: "620100",
          descripcion: "Actividades de programacion informatica",
          estado: "A",
        },
      ],
    };

    const fetchFn = vi.fn().mockResolvedValue(createMockResponse(200, mockData));

    const result = await lookupTaxpayer("3101234567", { fetchFn });

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const calledUrl = fetchFn.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain("identificacion=3101234567");
    expect(result.nombre).toBe("EMPRESA EJEMPLO S.A.");
    expect(result.tipoIdentificacion).toBe("02");
    expect(result.actividades).toHaveLength(1);
    expect(result.actividades[0]?.codigo).toBe("620100");
  });

  it("returns multiple activities", async () => {
    const mockData: ActividadEconomicaResponse = {
      nombre: "MULTIPLE ACTIVITIES S.A.",
      tipoIdentificacion: "02",
      actividades: [
        { codigo: "620100", descripcion: "Programacion", estado: "A" },
        { codigo: "620200", descripcion: "Consultoria informatica", estado: "A" },
        { codigo: "461001", descripcion: "Venta al por mayor", estado: "I" },
      ],
    };

    const fetchFn = vi.fn().mockResolvedValue(createMockResponse(200, mockData));

    const result = await lookupTaxpayer("3101234567", { fetchFn });

    expect(result.actividades).toHaveLength(3);
    expect(result.actividades[2]?.estado).toBe("I");
  });

  it("throws ApiError with 404 for unknown cedula", async () => {
    const fetchFn = vi.fn().mockResolvedValue(createMockResponse(404, { error: "Not found" }));

    await expect(lookupTaxpayer("0000000000", { fetchFn })).rejects.toThrow(ApiError);
    await expect(lookupTaxpayer("0000000000", { fetchFn })).rejects.toThrow(/Taxpayer not found/);
  });

  it("throws ApiError on server error (500)", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(createMockResponse(500, { error: "Internal server error" }));

    await expect(lookupTaxpayer("3101234567", { fetchFn })).rejects.toThrow(ApiError);
    await expect(lookupTaxpayer("3101234567", { fetchFn })).rejects.toThrow(/500/);
  });

  it("throws ApiError on network error", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("DNS resolution failed"));

    await expect(lookupTaxpayer("3101234567", { fetchFn })).rejects.toThrow(ApiError);
    await expect(lookupTaxpayer("3101234567", { fetchFn })).rejects.toThrow(/Network error/);
  });
});
