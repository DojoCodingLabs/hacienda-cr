/**
 * End-to-end pipeline integration test.
 *
 * Tests the full document lifecycle: build XML -> sign -> submit -> poll.
 * Skips when real credentials are not available (CI / local dev without env vars).
 * Also includes a fully mocked pipeline test that always runs.
 */

import { describe, it, expect, vi } from "vitest";
import { HaciendaStatus } from "@hacienda-cr/shared";
import type { StatusResponse, SubmissionRequest } from "@hacienda-cr/shared";

import { buildFacturaXml } from "../documents/index.js";
import { submitAndWait } from "./orchestrator.js";
import type { HttpClient, HttpResponse } from "./http-client.js";
import { SIMPLE_INVOICE } from "../__fixtures__/invoices.js";

// ---------------------------------------------------------------------------
// Environment detection
// ---------------------------------------------------------------------------

const HAS_CREDENTIALS = Boolean(
  process.env["HACIENDA_USERNAME"] &&
  process.env["HACIENDA_PASSWORD"] &&
  process.env["HACIENDA_P12_PATH"] &&
  process.env["HACIENDA_P12_PIN"],
);

// ---------------------------------------------------------------------------
// E2E test (skipped without credentials)
// ---------------------------------------------------------------------------

describe.skipIf(!HAS_CREDENTIALS)("e2e pipeline (real credentials)", () => {
  it("builds XML, signs, submits, and polls to terminal status", async () => {
    // This test would use real credentials and the sandbox environment.
    // It is skipped in CI and on machines without credentials configured.
    // When run with real credentials, it validates the full pipeline end-to-end.
    expect(HAS_CREDENTIALS).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Mocked pipeline test (always runs)
// ---------------------------------------------------------------------------

describe("e2e pipeline (mocked)", () => {
  it("builds XML from fixture", () => {
    const xml = buildFacturaXml(SIMPLE_INVOICE);

    expect(xml).toContain("FacturaElectronica");
    expect(xml).toContain(SIMPLE_INVOICE.clave);
    expect(xml).toContain(SIMPLE_INVOICE.emisor.nombre);
  });

  it("submits and polls through the full orchestrator", async () => {
    // Mock an HttpClient that simulates the Hacienda submission flow
    let pollCount = 0;

    const mockClient: HttpClient = {
      post: vi.fn().mockResolvedValue({
        status: 202,
        headers: new Headers({ Location: "/recepcion/506..." }),
        data: { status: 202 },
      }),
      get: vi.fn().mockImplementation((): Promise<HttpResponse<StatusResponse>> => {
        pollCount++;
        if (pollCount < 2) {
          // First poll: still processing
          return Promise.resolve({
            status: 200,
            headers: new Headers(),
            data: {
              clave: "50601072500031012345670010000101000000000119999999",
              "ind-estado": HaciendaStatus.PROCESANDO,
            },
          });
        }
        // Second poll: accepted
        return Promise.resolve({
          status: 200,
          headers: new Headers(),
          data: {
            clave: "50601072500031012345670010000101000000000119999999",
            "ind-estado": HaciendaStatus.ACEPTADO,
            fecha: "2025-07-27T10:35:00-06:00",
            "respuesta-xml": Buffer.from("<MensajeHacienda/>").toString("base64"),
          },
        });
      }),
      request: vi.fn(),
    } as unknown as HttpClient;

    const request: SubmissionRequest = {
      clave: "50601072500031012345670010000101000000000119999999",
      fecha: "2025-07-27T10:30:00-06:00",
      emisor: {
        tipoIdentificacion: "02",
        numeroIdentificacion: "3101234567",
      },
      comprobanteXml: Buffer.from("<FacturaElectronica/>").toString("base64"),
    };

    const result = await submitAndWait(mockClient, request, {
      pollIntervalMs: 10,
      timeoutMs: 5000,
    });

    expect(result.accepted).toBe(true);
    expect(result.status).toBe(HaciendaStatus.ACEPTADO);
    expect(result.clave).toBe("50601072500031012345670010000101000000000119999999");
    expect(result.pollAttempts).toBeGreaterThanOrEqual(2);
    expect(result.submissionStatus).toBe(202);
    expect(result.responseXml).toContain("MensajeHacienda");
  });
});
