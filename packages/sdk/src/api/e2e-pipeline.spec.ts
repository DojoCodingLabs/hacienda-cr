import { readFile } from "node:fs/promises";
import {
  TokenManager,
  Environment,
  getEnvironmentConfig,
  signAndEncode,
  validateFacturaInput,
} from "../index.js";
import { FacturaElectronicaSchema } from "@dojocoding/hacienda-shared";
/**
 * End-to-end pipeline integration test.
 *
 * Tests the full document lifecycle: build XML -> sign -> submit -> poll.
 * Runs only when explicitly authorized by HACIENDA_SANDBOX_E2E=1.
 * Also includes a fully mocked pipeline test that always runs.
 */

import { describe, it, expect, vi } from "vitest";
import { HaciendaStatus } from "@dojocoding/hacienda-shared";
import type { StatusResponse, SubmissionRequest } from "@dojocoding/hacienda-shared";

import { buildFacturaXml } from "../documents/index.js";
import { submitAndWait } from "./orchestrator.js";
import { HttpClient } from "./http-client.js";
import type { HttpResponse } from "./http-client.js";
import { SIMPLE_INVOICE } from "../__fixtures__/invoices.js";

// ---------------------------------------------------------------------------
// Environment detection
// ---------------------------------------------------------------------------

const LIVE_SANDBOX_ENABLED = process.env["HACIENDA_SANDBOX_E2E"] === "1";

describe.skipIf(!LIVE_SANDBOX_ENABLED)("e2e pipeline (explicit sandbox submission)", () => {
  it("builds, signs, submits and receives acceptance from the sandbox", async () => {
    const required = (name: string): string => {
      const value = process.env[name];
      if (!value) throw new Error(`Missing sandbox test variable: ${name}`);
      return value;
    };
    const invoice = FacturaElectronicaSchema.parse(
      JSON.parse(await readFile(required("HACIENDA_SANDBOX_INVOICE"), "utf8")),
    );
    const business = validateFacturaInput(invoice);
    expect(business.valid, business.errors.join("; ")).toBe(true);
    const envConfig = getEnvironmentConfig(Environment.Sandbox);
    const tokens = new TokenManager({ envConfig });
    await tokens.authenticate({
      username: required("HACIENDA_USERNAME"),
      password: required("HACIENDA_PASSWORD"),
    });
    const xml = await signAndEncode(
      buildFacturaXml(invoice),
      await readFile(required("HACIENDA_P12_PATH")),
      required("HACIENDA_P12_PIN"),
    );
    const result = await submitAndWait(
      new HttpClient({ envConfig, tokenManager: tokens }),
      {
        clave: invoice.clave,
        fecha: invoice.fechaEmision,
        emisor: {
          tipoIdentificacion: invoice.emisor.identificacion.tipo,
          numeroIdentificacion: invoice.emisor.identificacion.numero,
        },
        comprobanteXml: xml,
      },
      { timeoutMs: 60000 },
    );
    expect(result.accepted, result.rejectionReason).toBe(true);
    expect(result.status).toBe(HaciendaStatus.ACEPTADO);
  }, 90000);
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
