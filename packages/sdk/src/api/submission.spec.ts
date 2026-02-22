/**
 * Tests for the submission and polling module.
 */

import { describe, it, expect, vi } from "vitest";
import type { StatusResponse } from "@hacienda-cr/shared";
import { HaciendaStatus } from "@hacienda-cr/shared";

import {
  submitDocument,
  getStatus,
  isTerminalStatus,
  extractRejectionReason,
} from "./submission.js";
import type { HttpClient } from "./http-client.js";
import { ApiError } from "../errors.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockHttpClient(methods: {
  post?: ReturnType<typeof vi.fn>;
  get?: ReturnType<typeof vi.fn>;
}): HttpClient {
  return {
    post: methods.post ?? vi.fn(),
    get: methods.get ?? vi.fn(),
    request: vi.fn(),
  } as unknown as HttpClient;
}

// ---------------------------------------------------------------------------
// submitDocument
// ---------------------------------------------------------------------------

describe("submitDocument", () => {
  it("submits a document and returns the response", async () => {
    const mockPost = vi.fn().mockResolvedValue({
      status: 201,
      headers: new Headers({ Location: "/recepcion/12345" }),
      data: { status: 201 },
    });
    const client = createMockHttpClient({ post: mockPost });

    const request = {
      clave: "50601012300310123456700100001010000000001199999999",
      fecha: "2025-07-27T10:30:00-06:00",
      emisor: { tipoIdentificacion: "02" as const, numeroIdentificacion: "3101234567" },
      comprobanteXml: "base64data",
    };

    const response = await submitDocument(client, request);

    expect(mockPost).toHaveBeenCalledWith("/recepcion", request);
    expect(response.status).toBe(201);
    expect(response.location).toBe("/recepcion/12345");
  });

  it("enriches error message for 409 duplicate", async () => {
    const mockPost = vi
      .fn()
      .mockRejectedValue(new ApiError("Conflict", 409, { error: "duplicate" }));
    const client = createMockHttpClient({ post: mockPost });

    const request = {
      clave: "50601012300310123456700100001010000000001199999999",
      fecha: "2025-07-27T10:30:00-06:00",
      emisor: { tipoIdentificacion: "02" as const, numeroIdentificacion: "3101234567" },
      comprobanteXml: "base64data",
    };

    try {
      await submitDocument(client, request);
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).message).toContain("Duplicate submission");
      expect((error as ApiError).statusCode).toBe(409);
    }
  });

  it("re-throws non-409 ApiErrors as-is", async () => {
    const mockPost = vi
      .fn()
      .mockRejectedValue(new ApiError("Bad request", 400, { error: "invalid" }));
    const client = createMockHttpClient({ post: mockPost });

    const request = {
      clave: "12345",
      fecha: "2025-07-27T10:30:00-06:00",
      emisor: { tipoIdentificacion: "02" as const, numeroIdentificacion: "3101234567" },
      comprobanteXml: "base64data",
    };

    await expect(submitDocument(client, request)).rejects.toThrow(ApiError);
  });
});

// ---------------------------------------------------------------------------
// getStatus
// ---------------------------------------------------------------------------

describe("getStatus", () => {
  it("returns parsed status response for accepted document", async () => {
    const statusResponse: StatusResponse = {
      clave: "50601012300310123456700100001010000000001199999999",
      "ind-estado": HaciendaStatus.ACEPTADO,
      fecha: "2025-07-27T10:35:00-06:00",
    };

    const mockGet = vi.fn().mockResolvedValue({
      status: 200,
      headers: new Headers(),
      data: statusResponse,
    });
    const client = createMockHttpClient({ get: mockGet });

    const result = await getStatus(client, "50601012300310123456700100001010000000001199999999");

    expect(mockGet).toHaveBeenCalledWith(
      "/recepcion/50601012300310123456700100001010000000001199999999",
    );
    expect(result.clave).toBe("50601012300310123456700100001010000000001199999999");
    expect(result.status).toBe("aceptado");
    expect(result.date).toBe("2025-07-27T10:35:00-06:00");
    expect(result.responseXml).toBeUndefined();
  });

  it("decodes Base64 response XML", async () => {
    const responseXmlContent = "<MensajeHacienda><Codigo>01</Codigo></MensajeHacienda>";
    const base64Xml = Buffer.from(responseXmlContent).toString("base64");

    const statusResponse: StatusResponse = {
      clave: "12345",
      "ind-estado": HaciendaStatus.RECHAZADO,
      "respuesta-xml": base64Xml,
    };

    const mockGet = vi.fn().mockResolvedValue({
      status: 200,
      headers: new Headers(),
      data: statusResponse,
    });
    const client = createMockHttpClient({ get: mockGet });

    const result = await getStatus(client, "12345");

    expect(result.responseXml).toBe(responseXmlContent);
  });

  it("handles missing respuesta-xml gracefully", async () => {
    const statusResponse: StatusResponse = {
      clave: "12345",
      "ind-estado": HaciendaStatus.PROCESANDO,
    };

    const mockGet = vi.fn().mockResolvedValue({
      status: 200,
      headers: new Headers(),
      data: statusResponse,
    });
    const client = createMockHttpClient({ get: mockGet });

    const result = await getStatus(client, "12345");

    expect(result.responseXml).toBeUndefined();
  });

  it("preserves the raw response", async () => {
    const statusResponse: StatusResponse = {
      clave: "12345",
      "ind-estado": HaciendaStatus.ACEPTADO,
      fecha: "2025-07-27T10:35:00-06:00",
    };

    const mockGet = vi.fn().mockResolvedValue({
      status: 200,
      headers: new Headers(),
      data: statusResponse,
    });
    const client = createMockHttpClient({ get: mockGet });

    const result = await getStatus(client, "12345");

    expect(result.raw).toEqual(statusResponse);
  });
});

// ---------------------------------------------------------------------------
// isTerminalStatus
// ---------------------------------------------------------------------------

describe("isTerminalStatus", () => {
  it("returns true for 'aceptado'", () => {
    expect(isTerminalStatus(HaciendaStatus.ACEPTADO)).toBe(true);
  });

  it("returns true for 'rechazado'", () => {
    expect(isTerminalStatus(HaciendaStatus.RECHAZADO)).toBe(true);
  });

  it("returns true for 'error'", () => {
    expect(isTerminalStatus(HaciendaStatus.ERROR)).toBe(true);
  });

  it("returns false for 'procesando'", () => {
    expect(isTerminalStatus(HaciendaStatus.PROCESANDO)).toBe(false);
  });

  it("returns false for 'recibido'", () => {
    expect(isTerminalStatus(HaciendaStatus.RECIBIDO)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// extractRejectionReason
// ---------------------------------------------------------------------------

describe("extractRejectionReason", () => {
  it("extracts code and detail from response XML", () => {
    const xml = `
      <MensajeHacienda>
        <Codigo>05</Codigo>
        <DetalleMensaje>Clave duplicada en sistema</DetalleMensaje>
      </MensajeHacienda>
    `;

    const reason = extractRejectionReason(xml);

    expect(reason).toContain("[Code 05]");
    expect(reason).toContain("Duplicate clave");
    expect(reason).toContain("Clave duplicada en sistema");
  });

  it("extracts code only when DetalleMensaje is missing", () => {
    const xml = "<MensajeHacienda><Codigo>02</Codigo></MensajeHacienda>";

    const reason = extractRejectionReason(xml);

    expect(reason).toContain("[Code 02]");
    expect(reason).toContain("Digital signature");
  });

  it("extracts detail only when Codigo is missing", () => {
    const xml = "<MensajeHacienda><DetalleMensaje>Some error</DetalleMensaje></MensajeHacienda>";

    const reason = extractRejectionReason(xml);

    expect(reason).toBe("Some error");
  });

  it("returns undefined for XML without any error info", () => {
    const xml = "<MensajeHacienda><Status>OK</Status></MensajeHacienda>";

    const reason = extractRejectionReason(xml);

    expect(reason).toBeUndefined();
  });
});
