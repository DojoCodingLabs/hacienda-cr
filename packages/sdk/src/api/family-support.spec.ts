/**
 * Support matrix and REP/MR submission gate (roadmap P0-9).
 */

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect, vi } from "vitest";
import type { SubmissionRequest } from "@dojocoding/hacienda-shared";

import {
  assertSubmittableDocument,
  detectDocumentFamily,
  familyFromDocumentType,
  getFamilySupport,
} from "./family-support.js";
import { submitDocument } from "./submission.js";
import { submitAndWait } from "./orchestrator.js";
import type { HttpClient } from "./http-client.js";
import { HaciendaErrorCode, UnsupportedDocumentFamilyError } from "../errors.js";
import { buildReciboPagoXml } from "../documents/recibo-pago-builder.js";
import { buildMensajeReceptorXml } from "../documents/mensaje-receptor-builder.js";
import { buildFacturaXml } from "../documents/factura-builder.js";
import { buildFacturaCompraXml } from "../documents/factura-compra-builder.js";
import { validateDocumentXml } from "../xml/schema-validator.js";
import {
  SIMPLE_RECIBO_PAGO,
  MENSAJE_ACEPTACION_TOTAL,
  SIMPLE_FACTURA,
  SIMPLE_FACTURA_COMPRA,
} from "../__fixtures__/document-fixtures.js";
import { FileDocumentStore } from "../delivery/file-store.js";

function mockClient(): { client: HttpClient; post: ReturnType<typeof vi.fn> } {
  const post = vi.fn().mockResolvedValue({ status: 201, headers: new Headers(), data: {} });
  const client = { post, get: vi.fn(), request: vi.fn() } as unknown as HttpClient;
  return { client, post };
}

function requestFor(xml: string, clave: string, extra: object = {}): SubmissionRequest {
  return {
    clave,
    fecha: "2025-07-27T10:30:00-06:00",
    emisor: { tipoIdentificacion: "02", numeroIdentificacion: "3101234567" },
    comprobanteXml: Buffer.from(xml).toString("base64"),
    ...extra,
  } as SubmissionRequest;
}

const repXml = buildReciboPagoXml(SIMPLE_RECIBO_PAGO);
const mrXml = buildMensajeReceptorXml(MENSAJE_ACEPTACION_TOTAL);

describe("getFamilySupport", () => {
  it("covers every family once, read-only, with no production evidence", () => {
    const matrix = getFamilySupport();
    expect(matrix.map((row) => row.family)).toEqual([
      "FE",
      "TE",
      "NC",
      "ND",
      "FEC",
      "FEE",
      "REP",
      "MR",
    ]);
    expect(Object.isFrozen(matrix)).toBe(true);
    expect(Object.isFrozen(matrix[0])).toBe(true);
    expect(matrix.every((row) => row.productionEvidence === null)).toBe(true);
  });

  it("records sandbox evidence only for FE and TE", () => {
    const withEvidence = getFamilySupport()
      .filter((row) => row.sandboxEvidence !== null)
      .map((row) => row.family);
    expect(withEvidence).toEqual(["FE", "TE"]);
  });

  it("refuses REP and MR, keeps FEC unverified", () => {
    const submit = Object.fromEntries(getFamilySupport().map((row) => [row.family, row.submit]));
    expect(submit).toMatchObject({
      FE: "allowed",
      TE: "allowed",
      FEC: "unverified",
      REP: "refused",
      MR: "refused",
    });
  });
});

describe("detectDocumentFamily", () => {
  it("reads the root element after the prolog", () => {
    expect(detectDocumentFamily(repXml)).toBe("REP");
    expect(detectDocumentFamily(mrXml)).toBe("MR");
    expect(detectDocumentFamily(buildFacturaXml(SIMPLE_FACTURA))).toBe("FE");
    expect(detectDocumentFamily(buildFacturaCompraXml(SIMPLE_FACTURA_COMPRA))).toBe("FEC");
    expect(
      detectDocumentFamily('﻿<?xml version="1.0"?>\n<!-- c --><?pi x?><ns:MensajeReceptor/>'),
    ).toBe("MR");
    expect(detectDocumentFamily("<Other/>")).toBeUndefined();
    expect(detectDocumentFamily("<!-- unterminated")).toBeUndefined();
  });

  it("maps document type codes", () => {
    expect(familyFromDocumentType("10")).toBe("REP");
    expect(["05", "06", "07"].map(familyFromDocumentType)).toEqual(["MR", "MR", "MR"]);
    expect(familyFromDocumentType("08")).toBe("FEC");
    expect(familyFromDocumentType("99")).toBeUndefined();
  });
});

describe("assertSubmittableDocument", () => {
  it("keeps the REP and MR builders producing valid unsigned XML", async () => {
    expect((await validateDocumentXml(repXml)).valid).toBe(true);
    expect((await validateDocumentXml(mrXml)).valid).toBe(true);
  });

  it("refuses REP with a typed, documented error", () => {
    let caught: unknown;
    try {
      assertSubmittableDocument({ xml: repXml, clave: SIMPLE_RECIBO_PAGO.clave });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(UnsupportedDocumentFamilyError);
    const error = caught as UnsupportedDocumentFamilyError;
    expect(error.code).toBe(HaciendaErrorCode.UNSUPPORTED_FAMILY);
    expect(error.family).toBe("REP");
    expect(error.docsUrl).toMatch(/rep-monetary-oracle-research\.md$/);
    expect(error.message).toContain(error.docsUrl);
  });

  it("refuses MR by root, by consecutivoReceptor or by an MR clave type", () => {
    const mr = (facts: Parameters<typeof assertSubmittableDocument>[0]) => () =>
      assertSubmittableDocument(facts);
    expect(mr({ xml: mrXml })).toThrow(UnsupportedDocumentFamilyError);
    expect(mr({ xml: mrXml })).toThrow(/consecutivoReceptor/);
    expect(mr({ xml: buildFacturaXml(SIMPLE_FACTURA), consecutivoReceptor: "1" })).toThrow(
      /mr-transport-correlation-research\.md/,
    );
    const mrTypeClave = `${"5".repeat(29)}05${"1".repeat(19)}`;
    expect(mr({ clave: mrTypeClave })).toThrow(UnsupportedDocumentFamilyError);
  });

  it("lets FE and FEC through", () => {
    expect(() =>
      assertSubmittableDocument({
        xml: buildFacturaXml(SIMPLE_FACTURA),
        clave: SIMPLE_FACTURA.clave,
      }),
    ).not.toThrow();
    expect(() =>
      assertSubmittableDocument({
        xml: buildFacturaCompraXml(SIMPLE_FACTURA_COMPRA),
        clave: SIMPLE_FACTURA_COMPRA.clave,
      }),
    ).not.toThrow();
  });
});

describe("submit path refusal happens before any POST", () => {
  it("submitDocument refuses REP and MR without network access", async () => {
    const { client, post } = mockClient();
    await expect(
      submitDocument(client, requestFor(repXml, SIMPLE_RECIBO_PAGO.clave)),
    ).rejects.toBeInstanceOf(UnsupportedDocumentFamilyError);
    await expect(
      submitDocument(client, requestFor(mrXml, MENSAJE_ACEPTACION_TOTAL.clave)),
    ).rejects.toBeInstanceOf(UnsupportedDocumentFamilyError);
    expect(post).not.toHaveBeenCalled();
  });

  it("submitAndWait refuses before persisting or POSTing", async () => {
    const { client, post } = mockClient();
    const dir = await mkdtemp(join(tmpdir(), "family-gate-"));
    try {
      const store = new FileDocumentStore({ baseDir: dir });
      await expect(
        submitAndWait(client, requestFor(repXml, SIMPLE_RECIBO_PAGO.clave), {
          persist: true,
          store,
        }),
      ).rejects.toBeInstanceOf(UnsupportedDocumentFamilyError);
      expect(await store.get(SIMPLE_RECIBO_PAGO.clave)).toBeNull();
      await expect(
        submitAndWait(
          client,
          requestFor(buildFacturaXml(SIMPLE_FACTURA), SIMPLE_FACTURA.clave, {
            consecutivoReceptor: "00100001050000000001",
          }),
        ),
      ).rejects.toBeInstanceOf(UnsupportedDocumentFamilyError);
      expect(post).not.toHaveBeenCalled();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
