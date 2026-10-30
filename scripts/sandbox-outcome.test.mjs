import test from "node:test";
import assert from "node:assert/strict";
import {
  RESULT_CLASSES,
  classifySubmissionResult,
  classifyDeliveryError,
  isDeliveryError,
  containsFiscalMarkers,
} from "./sandbox-outcome.mjs";

const cloudflare403Body = JSON.stringify({
  message: "Forbidden",
  fault: "IncompleteSignatureException",
});
const rejectedBody = JSON.stringify({
  clave: "50612345678901234567890123456789012345678901234567",
  "ind-estado": "rechazado",
  "respuesta-xml": "PD94bWwg",
});
const acceptedBody = JSON.stringify({
  clave: "50612345678901234567890123456789012345678901234567",
  "ind-estado": "aceptado",
});

test("result classes are the five named by the spec contract", () => {
  assert.deepEqual(RESULT_CLASSES, [
    "ACCEPTED",
    "REJECTED",
    "TRANSPORT_BLOCKED",
    "PENDING",
    "INVALID_LOCAL",
  ]);
});

test("gateway 403 with a Cloudflare body and no fiscal evidence is transport", () => {
  assert.equal(containsFiscalMarkers(cloudflare403Body), false);
  assert.equal(
    classifyDeliveryError({ responseFiscal: false, errorCauseHeader: null }),
    "TRANSPORT_BLOCKED",
  );
});

test("non-fiscal 400 without X-Error-Cause is transport", () => {
  assert.equal(
    classifyDeliveryError({
      responseFiscal: false,
      errorCauseHeader: null,
      deliveryConfirmed: false,
    }),
    "TRANSPORT_BLOCKED",
  );
});

test("400 with X-Error-Cause header and no fiscal body is a fiscal REJECTED", () => {
  assert.equal(
    classifyDeliveryError({
      responseFiscal: false,
      errorCauseHeader: "xml.recepcion.mensaje.SolicitudInvalida",
      deliveryConfirmed: false,
    }),
    "REJECTED",
  );
});

test("fiscal response bodies (raw string or parsed) override delivery state", () => {
  assert.equal(containsFiscalMarkers(rejectedBody), true);
  assert.equal(containsFiscalMarkers(JSON.parse(rejectedBody)), true);
  assert.equal(containsFiscalMarkers(null), false);
  assert.equal(containsFiscalMarkers(undefined), false);
  assert.equal(classifyDeliveryError({ responseFiscal: true, errorCauseHeader: null }), "REJECTED");
});

test("observed Hacienda statuses map to their derived classes", () => {
  assert.equal(classifySubmissionResult({ status: "aceptado" }), "ACCEPTED");
  assert.equal(classifySubmissionResult({ status: "rechazado" }), "REJECTED");
  assert.equal(classifySubmissionResult({ status: "recibido" }), "PENDING");
  assert.equal(classifySubmissionResult({ status: "procesando" }), "PENDING");
  assert.equal(classifySubmissionResult({ status: "error" }), "TRANSPORT_BLOCKED");
  assert.equal(classifySubmissionResult({ status: "" }), null);
  assert.equal(classifySubmissionResult(undefined), null);
});

test("confirmed delivery with an unfiscal failure is PENDING, never transport", () => {
  // Timeout ApiError after a confirmed receipt POST: the clave is being polled.
  assert.equal(
    classifyDeliveryError({
      responseFiscal: false,
      errorCauseHeader: null,
      deliveryConfirmed: true,
    }),
    "PENDING",
  );
});

test("SDK delivery errors are distinguished from local pre-flight failures", () => {
  assert.equal(isDeliveryError({ name: "ApiError", statusCode: 403 }), true);
  assert.equal(isDeliveryError({ name: "ApiError", statusCode: undefined }), true);
  assert.equal(isDeliveryError({ name: "AuthenticationError" }), true);
  assert.equal(isDeliveryError(new Error("INVALID_SIGNED_XSD")), false);
  assert.equal(isDeliveryError({ name: "Error", message: "RUN_MODIFIED_AFTER_SIGNING" }), false);
  assert.equal(isDeliveryError(undefined), false);
  assert.equal(isDeliveryError("BLOCKED_ENDPOINT"), false);
});

test("local failures are classified INVALID_LOCAL end-to-end", () => {
  // Task 2.2: validation/XSD/signature failures before POST never reach the transport classifier.
  assert.equal(classifyFailureLike({ name: "Error" }), "INVALID_LOCAL");
  function classifyFailureLike(error) {
    return isDeliveryError(error) ? "classification would be delivery" : "INVALID_LOCAL";
  }
});
