/**
 * Tests for the submit-and-poll orchestrator.
 */

import { describe, it, expect, vi } from "vitest";
import { HaciendaStatus } from "@dojocoding/hacienda-shared";
import type { SubmissionRequest, StatusResponse } from "@dojocoding/hacienda-shared";

import { submitAndWait } from "./orchestrator.js";
import type { HttpClient } from "./http-client.js";
import { ApiError } from "../errors.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_REQUEST: SubmissionRequest = {
  clave: "50601012300310123456700100001010000000001199999999",
  fecha: "2025-07-27T10:30:00-06:00",
  emisor: { tipoIdentificacion: "02", numeroIdentificacion: "3101234567" },
  comprobanteXml: "base64SignedXmlData",
};

function createMockHttpClient(postResponse: unknown, getResponses: StatusResponse[]): HttpClient {
  let getCallIndex = 0;

  const mockPost = vi.fn().mockResolvedValue({
    status: 201,
    headers: new Headers({ Location: `/recepcion/${MOCK_REQUEST.clave}` }),
    data: postResponse,
  });

  const mockGet = vi.fn().mockImplementation(() => {
    const responseData = getResponses[getCallIndex];
    if (getCallIndex < getResponses.length - 1) {
      getCallIndex++;
    }
    return Promise.resolve({
      status: 200,
      headers: new Headers(),
      data: responseData,
    });
  });

  return {
    post: mockPost,
    get: mockGet,
    request: vi.fn(),
  } as unknown as HttpClient;
}

// ---------------------------------------------------------------------------
// submitAndWait
// ---------------------------------------------------------------------------

describe("submitAndWait", () => {
  it("submits and returns accepted result on first poll", async () => {
    const client = createMockHttpClient({ status: 201 }, [
      {
        clave: MOCK_REQUEST.clave,
        "ind-estado": HaciendaStatus.ACEPTADO,
        fecha: "2025-07-27T10:35:00-06:00",
      },
    ]);

    const result = await submitAndWait(client, MOCK_REQUEST, {
      pollIntervalMs: 10,
      timeoutMs: 5000,
    });

    expect(result.accepted).toBe(true);
    expect(result.status).toBe("aceptado");
    expect(result.clave).toBe(MOCK_REQUEST.clave);
    expect(result.submissionStatus).toBe(201);
    expect(result.pollAttempts).toBe(1);
  });

  it("polls multiple times before reaching terminal status", async () => {
    const client = createMockHttpClient({ status: 201 }, [
      {
        clave: MOCK_REQUEST.clave,
        "ind-estado": HaciendaStatus.PROCESANDO,
      },
      {
        clave: MOCK_REQUEST.clave,
        "ind-estado": HaciendaStatus.PROCESANDO,
      },
      {
        clave: MOCK_REQUEST.clave,
        "ind-estado": HaciendaStatus.ACEPTADO,
        fecha: "2025-07-27T10:35:00-06:00",
      },
    ]);

    const result = await submitAndWait(client, MOCK_REQUEST, {
      pollIntervalMs: 10,
      timeoutMs: 5000,
    });

    expect(result.accepted).toBe(true);
    expect(result.pollAttempts).toBe(3);
  });

  it("returns rejected result with rejection reason", async () => {
    const responseXmlContent =
      "<MensajeHacienda><Codigo>02</Codigo><DetalleMensaje>Firma digital invalida</DetalleMensaje></MensajeHacienda>";
    const base64Xml = Buffer.from(responseXmlContent).toString("base64");

    const client = createMockHttpClient({ status: 201 }, [
      {
        clave: MOCK_REQUEST.clave,
        "ind-estado": HaciendaStatus.RECHAZADO,
        fecha: "2025-07-27T10:35:00-06:00",
        "respuesta-xml": base64Xml,
      },
    ]);

    const result = await submitAndWait(client, MOCK_REQUEST, {
      pollIntervalMs: 10,
      timeoutMs: 5000,
    });

    expect(result.accepted).toBe(false);
    expect(result.status).toBe("rechazado");
    expect(result.rejectionReason).toContain("Digital signature");
    expect(result.rejectionReason).toContain("Firma digital invalida");
    expect(result.responseXml).toContain("MensajeHacienda");
  });

  it("throws ApiError when polling times out", async () => {
    const client = createMockHttpClient({ status: 201 }, [
      {
        clave: MOCK_REQUEST.clave,
        "ind-estado": HaciendaStatus.PROCESANDO,
      },
    ]);

    await expect(
      submitAndWait(client, MOCK_REQUEST, {
        pollIntervalMs: 10,
        timeoutMs: 50,
      }),
    ).rejects.toThrow(ApiError);
  });

  it("handles 404 during polling (document not yet indexed)", async () => {
    let callCount = 0;
    const mockGet = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount <= 2) {
        return Promise.reject(new ApiError("Not found", 404));
      }
      return Promise.resolve({
        status: 200,
        headers: new Headers(),
        data: {
          clave: MOCK_REQUEST.clave,
          "ind-estado": HaciendaStatus.ACEPTADO,
        },
      });
    });

    const client = {
      post: vi.fn().mockResolvedValue({
        status: 201,
        headers: new Headers(),
        data: { status: 201 },
      }),
      get: mockGet,
      request: vi.fn(),
    } as unknown as HttpClient;

    const result = await submitAndWait(client, MOCK_REQUEST, {
      pollIntervalMs: 10,
      timeoutMs: 5000,
    });

    expect(result.accepted).toBe(true);
    // 2 failed polls (404) + 1 successful
    expect(result.pollAttempts).toBe(3);
  });

  it("invokes onPoll callback on each poll iteration", async () => {
    const client = createMockHttpClient({ status: 201 }, [
      {
        clave: MOCK_REQUEST.clave,
        "ind-estado": HaciendaStatus.PROCESANDO,
      },
      {
        clave: MOCK_REQUEST.clave,
        "ind-estado": HaciendaStatus.ACEPTADO,
      },
    ]);

    const onPoll = vi.fn();

    await submitAndWait(client, MOCK_REQUEST, {
      pollIntervalMs: 10,
      timeoutMs: 5000,
      onPoll,
    });

    expect(onPoll).toHaveBeenCalledTimes(2);
    expect(onPoll).toHaveBeenCalledWith(expect.objectContaining({ status: "procesando" }), 1);
    expect(onPoll).toHaveBeenCalledWith(expect.objectContaining({ status: "aceptado" }), 2);
  });

  it("handles error terminal status", async () => {
    const client = createMockHttpClient({ status: 201 }, [
      {
        clave: MOCK_REQUEST.clave,
        "ind-estado": HaciendaStatus.ERROR,
      },
    ]);

    const result = await submitAndWait(client, MOCK_REQUEST, {
      pollIntervalMs: 10,
      timeoutMs: 5000,
    });

    expect(result.accepted).toBe(false);
    expect(result.status).toBe("error");
  });
});
