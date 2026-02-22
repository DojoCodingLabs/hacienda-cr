/**
 * Tests for the comprobantes listing and detail endpoints.
 */

import { describe, it, expect, vi } from "vitest";
import type { ComprobantesListResponse, ComprobanteDetail } from "@hacienda-cr/shared";
import { HaciendaStatus } from "@hacienda-cr/shared";

import { listComprobantes, getComprobante } from "./comprobantes.js";
import type { HttpClient } from "./http-client.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockHttpClient(methods: { get?: ReturnType<typeof vi.fn> }): HttpClient {
  return {
    post: vi.fn(),
    get: methods.get ?? vi.fn(),
    request: vi.fn(),
  } as unknown as HttpClient;
}

// ---------------------------------------------------------------------------
// listComprobantes
// ---------------------------------------------------------------------------

describe("listComprobantes", () => {
  it("calls GET /comprobantes without params", async () => {
    const mockData: ComprobantesListResponse = {
      totalRegistros: 2,
      offset: 0,
      comprobantes: [
        {
          clave: "50601012300310123456700100001010000000001199999999",
          fechaEmision: "2025-01-15T10:00:00-06:00",
          emisor: { tipoIdentificacion: "02", numeroIdentificacion: "3101234567" },
          estado: HaciendaStatus.ACEPTADO,
        },
        {
          clave: "50601012300310123456700100001010000000002199999998",
          fechaEmision: "2025-01-16T10:00:00-06:00",
          emisor: { tipoIdentificacion: "02", numeroIdentificacion: "3101234567" },
          estado: HaciendaStatus.PROCESANDO,
        },
      ],
    };

    const mockGet = vi.fn().mockResolvedValue({ status: 200, data: mockData });
    const client = createMockHttpClient({ get: mockGet });

    const result = await listComprobantes(client);

    expect(mockGet).toHaveBeenCalledWith("/comprobantes");
    expect(result.totalRegistros).toBe(2);
    expect(result.comprobantes).toHaveLength(2);
    expect(result.comprobantes[0]?.estado).toBe("aceptado");
  });

  it("calls GET /comprobantes with query params", async () => {
    const mockData: ComprobantesListResponse = {
      totalRegistros: 0,
      offset: 10,
      comprobantes: [],
    };

    const mockGet = vi.fn().mockResolvedValue({ status: 200, data: mockData });
    const client = createMockHttpClient({ get: mockGet });

    await listComprobantes(client, { offset: 10, limit: 5 });

    expect(mockGet).toHaveBeenCalledWith("/comprobantes?offset=10&limit=5");
  });

  it("includes date filters in query string", async () => {
    const mockData: ComprobantesListResponse = {
      totalRegistros: 0,
      offset: 0,
      comprobantes: [],
    };

    const mockGet = vi.fn().mockResolvedValue({ status: 200, data: mockData });
    const client = createMockHttpClient({ get: mockGet });

    await listComprobantes(client, {
      fechaEmisionDesde: "2025-01-01",
      fechaEmisionHasta: "2025-01-31",
    });

    const calledPath = (mockGet.mock.calls[0] as string[])[0] as string;
    expect(calledPath).toContain("fechaEmisionDesde=2025-01-01");
    expect(calledPath).toContain("fechaEmisionHasta=2025-01-31");
  });

  it("includes identification filters in query string", async () => {
    const mockData: ComprobantesListResponse = {
      totalRegistros: 0,
      offset: 0,
      comprobantes: [],
    };

    const mockGet = vi.fn().mockResolvedValue({ status: 200, data: mockData });
    const client = createMockHttpClient({ get: mockGet });

    await listComprobantes(client, { emisorIdentificacion: "3101234567" });

    const calledPath = (mockGet.mock.calls[0] as string[])[0] as string;
    expect(calledPath).toContain("emisorIdentificacion=3101234567");
  });
});

// ---------------------------------------------------------------------------
// getComprobante
// ---------------------------------------------------------------------------

describe("getComprobante", () => {
  it("calls GET /comprobantes/{clave} and returns detail", async () => {
    const mockDetail: ComprobanteDetail = {
      clave: "50601012300310123456700100001010000000001199999999",
      fechaEmision: "2025-01-15T10:00:00-06:00",
      emisor: { tipoIdentificacion: "02", numeroIdentificacion: "3101234567" },
      comprobanteXml: "PEZhY3R1cmFFbGVjdHJvbmljYT4=",
      estado: HaciendaStatus.ACEPTADO,
      respuestaXml: "PE1lbnNhamVIYWNpZW5kYT4=",
      fechaRespuesta: "2025-01-15T10:05:00-06:00",
    };

    const mockGet = vi.fn().mockResolvedValue({ status: 200, data: mockDetail });
    const client = createMockHttpClient({ get: mockGet });

    const result = await getComprobante(
      client,
      "50601012300310123456700100001010000000001199999999",
    );

    expect(mockGet).toHaveBeenCalledWith(
      "/comprobantes/50601012300310123456700100001010000000001199999999",
    );
    expect(result.clave).toBe("50601012300310123456700100001010000000001199999999");
    expect(result.estado).toBe("aceptado");
    expect(result.comprobanteXml).toBe("PEZhY3R1cmFFbGVjdHJvbmljYT4=");
  });

  it("returns detail without optional fields", async () => {
    const mockDetail: ComprobanteDetail = {
      clave: "50601012300310123456700100001010000000001199999999",
      fechaEmision: "2025-01-15T10:00:00-06:00",
      emisor: { tipoIdentificacion: "02", numeroIdentificacion: "3101234567" },
      comprobanteXml: "PEZhY3R1cmFFbGVjdHJvbmljYT4=",
      estado: HaciendaStatus.PROCESANDO,
    };

    const mockGet = vi.fn().mockResolvedValue({ status: 200, data: mockDetail });
    const client = createMockHttpClient({ get: mockGet });

    const result = await getComprobante(
      client,
      "50601012300310123456700100001010000000001199999999",
    );

    expect(result.respuestaXml).toBeUndefined();
    expect(result.fechaRespuesta).toBeUndefined();
    expect(result.receptor).toBeUndefined();
  });
});
