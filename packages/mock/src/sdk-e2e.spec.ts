/**
 * E2E del SDK contra el mock de Hacienda.
 *
 * Corre el pipeline completo (firmar → enviar → polear) contra el mock local,
 * sin credenciales ni red. El switch `HACIENDA_E2E_TARGET=sandbox` apunta la
 * misma suite al sandbox real (suite `e2e-pipeline.spec.ts` del SDK).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { HaciendaStatus } from "@dojocoding/hacienda-shared";
import {
  TokenManager,
  HttpClient,
  submitAndWait,
  buildFacturaXml,
  type EnvironmentConfig,
  FileDocumentStore,
  retryStoredDocuments,
} from "@dojocoding/hacienda-sdk";
import { MOCK_INVOICE } from "./__fixtures__/invoice.js";

import { createMockServer, type MockServer } from "./server.js";

const TARGET = process.env["HACIENDA_E2E_TARGET"] ?? "mock";
const EXTERNAL_URL = process.env["HACIENDA_MOCK_URL"];
const CLAVE = MOCK_INVOICE.clave;

function envConfigFor(mock: MockServer): EnvironmentConfig {
  if (EXTERNAL_URL) {
    return {
      name: "Mock",
      apiBaseUrl: `${EXTERNAL_URL}/recepcion-sandbox/v1`,
      idpTokenUrl: `${EXTERNAL_URL}/auth/realms/rut-stag/protocol/openid-connect/token`,
      clientId: "mock-client",
    };
  }
  return {
    name: "Mock",
    apiBaseUrl: mock.apiBaseUrl,
    idpTokenUrl: mock.idpTokenUrl,
    clientId: "mock-client",
  };
}

async function clientFor(mock: MockServer): Promise<HttpClient> {
  const envConfig = envConfigFor(mock);
  const tokens = new TokenManager({ envConfig });
  await tokens.authenticate({ username: "cpj-02-3101234567", password: "synthetic" });
  return new HttpClient({ envConfig, tokenManager: tokens });
}

function submissionBody(): Record<string, unknown> {
  return {
    clave: CLAVE,
    fecha: MOCK_INVOICE.fechaEmision,
    emisor: {
      tipoIdentificacion: MOCK_INVOICE.emisor.identificacion.tipo,
      numeroIdentificacion: MOCK_INVOICE.emisor.identificacion.numero,
    },
    comprobanteXml: Buffer.from(buildFacturaXml(MOCK_INVOICE), "utf-8").toString("base64"),
  };
}

describe.skipIf(TARGET !== "mock")("E2E del SDK contra el mock de Hacienda", () => {
  let mock: MockServer;

  beforeAll(async () => {
    mock = await createMockServer({ processingDelayMs: 0, acceptanceDelayMs: 0 });
  });

  afterAll(async () => {
    await mock.close();
  });

  it("firma, envia y recibe aceptacion sin credenciales ni red", async () => {
    const result = await submitAndWait(await clientFor(mock), submissionBody() as never, {
      pollIntervalMs: 10,
      timeoutMs: 10_000,
    });

    expect(result.accepted).toBe(true);
    expect(result.status).toBe(HaciendaStatus.ACEPTADO);
    expect(result.clave).toBe(CLAVE);
    expect(result.submissionStatus).toBe(201);
    expect(result.responseXml).toContain("MensajeHacienda");
    expect(mock.submissions()).toHaveLength(1);
  });

  it("reporta el motivo de rechazo cuando Hacienda rechaza", async () => {
    const rejecting = await createMockServer({
      processingDelayMs: 0,
      acceptanceDelayMs: 0,
      outcome: { status: "rechazado", codigo: "05" },
    });
    try {
      const result = await submitAndWait(await clientFor(rejecting), submissionBody() as never, {
        pollIntervalMs: 10,
        timeoutMs: 10_000,
      });
      expect(result.accepted).toBe(false);
      expect(result.status).toBe(HaciendaStatus.RECHAZADO);
      expect(result.rejectionReason).toContain("Code 05");
    } finally {
      await rejecting.close();
    }
  });

  it("rechaza una clave duplicada con 409", async () => {
    const fresh = await createMockServer({ processingDelayMs: 0, acceptanceDelayMs: 0 });
    try {
      const client = await clientFor(fresh);
      const body = submissionBody();
      const first = await client.post("/recepcion", body);
      expect(first.status).toBe(201);
      await expect(client.post("/recepcion", body)).rejects.toThrow(/409/);
    } finally {
      await fresh.close();
    }
  });

  it("almacena y reintenta cuando el enlace está caído (linkDown)", async () => {
    // 1. Mock con enlace caído (linkDown: true) - devuelve 503
    const linkDownMock = await createMockServer({
      processingDelayMs: 0,
      acceptanceDelayMs: 0,
      linkDown: true,
    });

    const client = await clientFor(linkDownMock);
    const body = submissionBody();
    const store = new FileDocumentStore({ baseDir: "./.delivery-test-linkdown" });

    // 1. Enviar con persistencia - el mock devuelve 503 (enlace caído)
    await expect(
      submitAndWait(client, body as never, {
        pollIntervalMs: 10,
        timeoutMs: 5000,
        persist: true,
        store,
      }),
    ).rejects.toThrow(/Enlace caído|Service unavailable|503/);

    // Verificar que el documento quedó en ALMACENADO en el outbox
    const doc = await store.get(MOCK_INVOICE.clave);
    expect(doc).not.toBeNull();
    if (!doc) throw new Error("Documento no encontrado");
    expect(doc.state).toBe("ALMACENADO");
    expect(doc.attempts).toBe(1);
    expect(doc.lastError).toMatch(/Enlace caído|Service unavailable|503/);

    // Cerrar mock con enlace caído
    await linkDownMock.close();

    // 2. Mock normal (enlace restablecido) - sin linkDown
    const normalMock = await createMockServer({
      processingDelayMs: 0,
      acceptanceDelayMs: 0,
    });

    try {
      const normalClient = await clientFor(normalMock);

      // Reintentar documentos almacenados
      const { retried, succeeded, failed } = await retryStoredDocuments(store, async (doc) => {
        const result = await submitAndWait(
          normalClient,
          {
            clave: doc.clave,
            fecha: doc.generatedAt,
            emisor: {
              tipoIdentificacion: "02",
              numeroIdentificacion: "3101234567",
            },
            comprobanteXml: doc.xml,
          } as never,
          {
            pollIntervalMs: 10,
            timeoutMs: 5000,
            store,
          },
        );
        return {
          type: result.accepted ? "success" : "rejected",
          state: result.accepted ? "ACEPTADO" : "RECHAZADO",
          response: result.responseXml,
          reason: result.rejectionReason,
        };
      });

      expect(retried).toBe(1);
      expect(succeeded).toBe(1);
      expect(failed).toBe(0);

      // Verificar que el documento quedó en ACEPTADO
      const finalDoc = await store.get(MOCK_INVOICE.clave);
      expect(finalDoc).not.toBeNull();
      if (!finalDoc) throw new Error("Documento no encontrado");
      expect(finalDoc.state).toBe("ACEPTADO");
    } finally {
      await normalMock.close();
    }

    await linkDownMock.close();
  });
});
