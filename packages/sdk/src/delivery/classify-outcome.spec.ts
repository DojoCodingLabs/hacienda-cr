import { describe, expect, it } from "vitest";
import { HaciendaStatus } from "@dojocoding/hacienda-shared";
import { ApiError } from "../errors.js";
import { classifyOutcome } from "./state-machine.js";

const clave = "50621102600310123456700100001010000000001112345678";

describe("classifyOutcome", () => {
  it("classifies aceptado as success", () => {
    const outcome = classifyOutcome({ clave, status: HaciendaStatus.ACEPTADO });
    expect(outcome).toMatchObject({ kind: "success", status: "aceptado" });
  });

  it("classifies rechazado as rejected", () => {
    const outcome = classifyOutcome({ clave, status: HaciendaStatus.RECHAZADO });
    expect(outcome).toMatchObject({ kind: "rejected", status: "rechazado" });
  });

  it.each([HaciendaStatus.RECIBIDO, HaciendaStatus.PROCESANDO])(
    "classifies %s as pending, distinct from unknown",
    (status) => {
      const outcome = classifyOutcome({ clave, status });
      expect(outcome).toEqual({ kind: "pending", status, response: { clave, status } });
      expect(outcome.kind).not.toBe("unknown");
    },
  );

  it("reads the raw ind-estado key of a GET /recepcion body", () => {
    expect(classifyOutcome({ clave, "ind-estado": "aceptado" }).kind).toBe("success");
    expect(classifyOutcome({ clave, "ind-estado": "procesando" }).kind).toBe("pending");
  });

  it.each([
    new Error("socket hang up"),
    new DOMException("HTTP request timed out.", "TimeoutError"),
    new ApiError("GET /recepcion failed (503)", 503),
  ])("classifies a failed status query as transport_error: %s", (error) => {
    const outcome = classifyOutcome(null, error);
    expect(outcome).toEqual({ kind: "transport_error", error });
  });

  it("wraps non-Error throwables in transport_error without leaking them", () => {
    const outcome = classifyOutcome(undefined, "secret-bearing string");
    expect(outcome.kind).toBe("transport_error");
    if (outcome.kind === "transport_error")
      expect(outcome.error.message).toBe("Status query failed");
  });

  it.each([
    [null, "No status response"],
    [{ clave }, "Unrecognized ind-estado"],
    [{ clave, status: "ACEPTADO " }, "Unrecognized ind-estado"],
    [{ clave, "ind-estado": "anulado" }, "Unrecognized ind-estado"],
    [{ clave, status: HaciendaStatus.ERROR }, "Hacienda reported a processing error"],
  ])("classifies an inconclusive response as unknown: %j", (response, reason) => {
    expect(classifyOutcome(response)).toMatchObject({ kind: "unknown", reason });
  });

  it("treats a response for another clave as unknown when expectedClave is set", () => {
    const other = clave.slice(0, -1) + "9";
    expect(
      classifyOutcome({ clave: other, status: "aceptado" }, undefined, { expectedClave: clave }),
    ).toMatchObject({ kind: "unknown", reason: "Status response clave does not match" });
    expect(
      classifyOutcome({ clave, status: "aceptado" }, undefined, { expectedClave: clave }).kind,
    ).toBe("success");
  });
});
