/**
 * Submit-and-poll orchestrator.
 *
 * High-level pipeline that orchestrates the full document submission lifecycle:
 * sign -> submit -> poll until accepted/rejected.
 *
 * @module api/orchestrator
 */

import type { SubmissionRequest } from "@dojocoding/hacienda-shared";
import { HaciendaStatus } from "@dojocoding/hacienda-shared";

import { sleep, withSignal } from "./cancellation.js";
import { ApiError } from "../errors.js";
import type { HttpClient } from "./http-client.js";
import type { ParsedStatusResponse } from "./submission.js";
import {
  submitDocument,
  getStatus,
  isTerminalStatus,
  extractRejectionReason,
} from "./submission.js";
import type {
  DocumentStore,
  StoredDocument,
  DeliverySituation,
  SendResult,
} from "../delivery/index.js";
import { createStoredDocument } from "../delivery/state-machine.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Options for the submit-and-wait orchestrator. */
export interface SubmitAndWaitOptions {
  /** Polling interval in milliseconds (default: 3000 = 3s). */
  readonly pollIntervalMs?: number;
  /** Maximum time for submission and polling in milliseconds (default: 60000 = 60s). */
  readonly timeoutMs?: number;
  /** Cancel submission, polling, and all waits. */
  readonly signal?: AbortSignal;
  /** Optional callback invoked on each poll iteration. */
  readonly onPoll?: (status: ParsedStatusResponse, attempt: number) => void;
  /** Si persistir el documento en el outbox antes de enviar. */
  readonly persist?: boolean;
  /** Almacén personalizado (usa el del SDK si no se provee). */
  readonly store?: DocumentStore;
  /** Reanudar documentos pendientes del almacén al iniciar. */
  readonly resumePending?: boolean;
  /** Plazo en días hábiles para documentos sin internet/contingencia. */
  readonly deadlineBusinessDays?: number;
  /** Situación del comprobante (para persistir). */
  readonly situation?: DeliverySituation;
  /** Referencia al comprobante provisional (solo contingencia). */
  readonly provisionalReference?: string;
  /** Callback para notificar cambios de estado. */
  readonly onStateChange?: (clave: string, from: string, to: string) => void;
}

/** Final result of the submit-and-wait pipeline. */
export interface SubmitAndWaitResult {
  /** Whether the document was accepted by Hacienda. */
  readonly accepted: boolean;
  /** Final processing status. */
  readonly status: HaciendaStatus;
  /** 50-digit clave numerica. */
  readonly clave: string;
  /** Hacienda response date (ISO 8601). */
  readonly date?: string;
  /** Decoded response XML from Hacienda. */
  readonly responseXml?: string;
  /** Human-readable rejection reason (if rejected). */
  readonly rejectionReason?: string;
  /** HTTP status from the initial submission. */
  readonly submissionStatus: number;
  /** Number of poll attempts made. */
  readonly pollAttempts: number;
  /** Si el documento fue persistido en el outbox. */
  readonly persisted?: boolean;
  /** Estado de entrega si fue persistido. */
  readonly deliveryState?: string;
}

/** Default configuration values. */
const DEFAULTS = {
  pollIntervalMs: 3000,
  timeoutMs: 60000,
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Determina el resultado del envío y actualiza el almacén. */
async function handleSendResult(
  store: DocumentStore | undefined,
  doc: StoredDocument,
  error: Error | null,
  httpStatus: number | undefined,
  haciendaResponse: { estado?: string; detalle?: string } | null | undefined,
): Promise<{ newState: string; result: SendResult }> {
  const { classifySendResult } = await import("../delivery/state-machine.js");
  const result = classifySendResult(error, httpStatus, haciendaResponse);

  const newState = result.state;
  if (store) {
    try {
      await store.transition(
        doc.clave,
        doc.state,
        newState,
        result.type === "rejected"
          ? result.reason
          : result.type === "link_down"
            ? "Enlace caído"
            : undefined,
      );
    } catch {
      // Si la transición falla (estado ya cambiado), no bloquear
    }
  }

  return { newState, result };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Submits a document and polls until a terminal status is reached.
 *
 * Orchestrates the full lifecycle:
 * 1. Submit the document (POST /recepcion)
 * 2. Poll for status (GET /recepcion/{clave}) at regular intervals
 * 3. Return the final result when accepted, rejected, or timed out
 *
 * @param httpClient - The authenticated HTTP client.
 * @param request - The submission request payload (must include comprobanteXml as Base64).
 * @param options - Optional orchestration configuration.
 * @returns The final submission result.
 * @throws {ApiError} If submission fails or times out.
 *
 * @example
 * ```ts
 * const result = await submitAndWait(httpClient, {
 *   clave: "50601...",
 *   fecha: "2025-07-27T10:30:00-06:00",
 *   emisor: { tipoIdentificacion: "02", numeroIdentificacion: "3101234567" },
 *   comprobanteXml: base64SignedXml,
 * });
 *
 * if (result.accepted) {
 *   console.log("Document accepted by Hacienda!");
 * } else {
 *   console.log("Rejected:", result.rejectionReason);
 * }
 * ```
 */
export async function submitAndWait(
  httpClient: HttpClient,
  request: SubmissionRequest,
  options?: SubmitAndWaitOptions,
): Promise<SubmitAndWaitResult> {
  const pollIntervalMs = options?.pollIntervalMs ?? DEFAULTS.pollIntervalMs;
  const timeoutMs = options?.timeoutMs ?? DEFAULTS.timeoutMs;

  if (
    !Number.isFinite(timeoutMs) ||
    timeoutMs <= 0 ||
    timeoutMs > 2147483647 ||
    !Number.isFinite(pollIntervalMs) ||
    pollIntervalMs < 0 ||
    pollIntervalMs > 2147483647
  ) {
    throw new RangeError("Invalid submission timeout or polling interval.");
  }

  // Si no hay persistencia, comportamiento original
  if (!options?.persist && !options?.store && !options?.resumePending) {
    return submitAndWaitLegacy(httpClient, request, options);
  }

  const { createDefaultStore } = await import("../delivery/file-store.js");
  const store = options.store ?? (await createDefaultStore("."));
  let pollAttempts = 0;
  const timeout = new AbortController();
  const signal = options?.signal
    ? AbortSignal.any([options.signal, timeout.signal])
    : timeout.signal;
  const deadline = Date.now() + timeoutMs;
  const expire = () =>
    timeout.abort(
      new ApiError(
        `Submission/polling timed out after ${String(timeoutMs)}ms (${String(pollAttempts)} attempts).`,
        undefined,
        { clave: request.clave, pollAttempts },
      ),
    );
  const checkDeadline = () => {
    if (Date.now() >= deadline) expire();
    signal.throwIfAborted();
  };
  const timer = setTimeout(expire, timeoutMs);

  try {
    checkDeadline();

    // Persistir documento si se solicita
    let doc: StoredDocument | undefined;
    let persisted = false;
    let submissionResponse: { status: number } | null = null;

    if (options?.persist) {
      doc = createStoredDocument({
        xml: request.comprobanteXml,
        clave: request.clave,
        situation: options.situation ?? "normal",
        generatedAt: new Date(request.fecha),
        deadlineBusinessDays: options.deadlineBusinessDays,
        provisionalReference: options.provisionalReference,
      });
      await store.persist(doc);
      persisted = true;
      options.onStateChange?.(doc.clave, "FIRMADO", "FIRMADO");
    } else if (options?.resumePending) {
      // Reanudar pendientes (no implementado en esta versión simplificada)
    }

    // Intentar envío inicial con manejo de enlace caído
    let sendError: Error | null = null;
    let httpStatus: number | undefined;
    let submissionAttempted = false;

    while (!submissionAttempted) {
      checkDeadline();
      try {
        const response = await withSignal(
          () => submitDocument(httpClient, request, { signal }),
          signal,
        );
        submissionResponse = response;
        submissionAttempted = true;
      } catch (error) {
        sendError = error as Error;
        httpStatus = (error as { statusCode?: number } | null)?.statusCode;

        // Manejar enlace caído en envío inicial
        if (doc && error && (httpStatus === undefined || httpStatus >= 500 || httpStatus === 0)) {
          // Transicionar a ALMACENADO
          await store.transition(doc.clave, "FIRMADO", "ALMACENADO", "Enlace caído");
          options.onStateChange?.(doc.clave, "FIRMADO", "ALMACENADO");

          // Actualizar intentos y error
          await store.update(doc.clave, {
            attempts: 1,
            lastError: sendError.message,
          });

          // No reintentar automáticamente aquí; dejar que el polling lo maneje
          break;
        }
        throw error;
      }
    }

    if (!submissionAttempted) {
      // Si salimos del loop sin enviar (enlace cau00eddo), lanzar error
      if (doc) {
        // El documento ya estu00e1 en ALMACENADO
        options.onStateChange?.(doc.clave, "FIRMADO", "ALMACENADO");
        throw sendError ?? new Error("Enlace cau00eddo al enviar comprobante");
      }
      throw new Error("Enlace cau00eddo al enviar comprobante");
    } else {
      // Envu00edo exitoso, transicionar a PENDIENTE
      if (doc) {
        const storedDoc = await store.get(doc.clave);
        if (storedDoc) {
          doc = storedDoc;
          await store.transition(doc.clave, "FIRMADO", "PENDIENTE", "Enviando a Hacienda");
          options.onStateChange?.(doc.clave, "FIRMADO", "PENDIENTE");
        }
      }
    }

    while (true) {
      checkDeadline();

      // Wait before polling
      await sleep(
        Math.min(
          deadline - Date.now(),
          pollAttempts === 0 ? Math.min(pollIntervalMs, 1000) : pollIntervalMs,
        ),
        signal,
      );
      checkDeadline();

      pollAttempts++;

      let statusResponse: ParsedStatusResponse | undefined;
      let sendError: Error | null = null;
      let httpStatus: number | undefined;

      try {
        statusResponse = await withSignal(
          () => getStatus(httpClient, request.clave, { signal }),
          signal,
        );
        checkDeadline();
      } catch (error) {
        if (error instanceof ApiError && error.statusCode === 404) {
          // No indexado aún, seguir polling
          if (doc) {
            await store.update(doc.clave, { attempts: (doc.attempts ?? 0) + 1 });
          }
          continue;
        }
        sendError = error as Error;
        httpStatus = (error as { statusCode?: number } | null)?.statusCode;
      }

      // Invoke the poll callback if provided
      if (options?.onPoll && statusResponse) {
        options.onPoll(statusResponse, pollAttempts);
        checkDeadline();
      }

      // Evaluar resultado del envío
      if (doc) {
        const haciendaResponse = statusResponse?.responseXml
          ? (JSON.parse(statusResponse.responseXml) as { estado?: string; detalle?: string })
          : undefined;
        const { newState, result } = await handleSendResult(
          store,
          doc,
          sendError,
          httpStatus,
          haciendaResponse,
        );

        if (result.type === "success" || result.type === "rejected") {
          // Terminal - devolver resultado
          const accepted = result.type === "success" && result.state === "ACEPTADO";
          let rejectionReason: string | undefined;

          if (!accepted && statusResponse?.responseXml) {
            rejectionReason = extractRejectionReason(statusResponse.responseXml);
          }

          clearTimeout(timer);
          return {
            accepted,
            status: statusResponse?.status ?? HaciendaStatus.RECHAZADO,
            clave: request.clave,
            date: statusResponse?.date,
            responseXml: statusResponse?.responseXml,
            rejectionReason,
            submissionStatus: submissionResponse?.status ?? 0,
            pollAttempts,
            persisted: true,
            deliveryState: newState,
          };
        } else if (result.type === "link_down") {
          // Enlace caído - almacenar y reintentar
          if (doc) {
            await store.update(doc.clave, {
              attempts: (doc.attempts ?? 0) + 1,
              lastError: result.error.message,
            });
          }
          continue;
        } else if (result.type === "ambiguous") {
          // Ambiguo - consultar estado antes de reenviar
          continue;
        }
      }

      // Check if we've reached a terminal status (legacy)
      if (statusResponse && isTerminalStatus(statusResponse.status)) {
        const accepted = statusResponse.status === HaciendaStatus.ACEPTADO;
        let rejectionReason: string | undefined;

        if (!accepted && statusResponse.responseXml) {
          rejectionReason = extractRejectionReason(statusResponse.responseXml);
        }

        clearTimeout(timer);
        return {
          accepted,
          status: statusResponse.status,
          clave: statusResponse.clave,
          date: statusResponse.date,
          responseXml: statusResponse.responseXml,
          rejectionReason,
          submissionStatus: submissionResponse?.status ?? 0,
          pollAttempts,
          persisted,
          deliveryState: doc?.state,
        };
      }
    }
  } finally {
    clearTimeout(timer);
  }
}

/** Versión legacy sin persistencia (comportamiento original). */
async function submitAndWaitLegacy(
  httpClient: HttpClient,
  request: SubmissionRequest,
  options?: SubmitAndWaitOptions,
): Promise<SubmitAndWaitResult> {
  const pollIntervalMs = options?.pollIntervalMs ?? DEFAULTS.pollIntervalMs;
  const timeoutMs = options?.timeoutMs ?? DEFAULTS.timeoutMs;
  let pollAttempts = 0;
  const timeout = new AbortController();
  const signal = options?.signal
    ? AbortSignal.any([options.signal, timeout.signal])
    : timeout.signal;
  const deadline = Date.now() + timeoutMs;
  const expire = () =>
    timeout.abort(
      new ApiError(
        `Submission/polling timed out after ${String(timeoutMs)}ms (${String(pollAttempts)} attempts).`,
        undefined,
        { clave: request.clave, pollAttempts },
      ),
    );
  const checkDeadline = () => {
    if (Date.now() >= deadline) expire();
    signal.throwIfAborted();
  };
  const timer = setTimeout(expire, timeoutMs);
  try {
    checkDeadline();
    const submissionResponse = await withSignal(
      () => submitDocument(httpClient, request, { signal }),
      signal,
    );
    while (true) {
      checkDeadline();
      await sleep(
        Math.min(
          deadline - Date.now(),
          pollAttempts === 0 ? Math.min(pollIntervalMs, 1000) : pollIntervalMs,
        ),
        signal,
      );
      checkDeadline();

      pollAttempts++;

      let statusResponse: ParsedStatusResponse;
      try {
        statusResponse = await withSignal(
          () => getStatus(httpClient, request.clave, { signal }),
          signal,
        );
        checkDeadline();
      } catch (error) {
        if (error instanceof ApiError && error.statusCode === 404) {
          continue;
        }
        throw error;
      }

      if (options?.onPoll) {
        options.onPoll(statusResponse, pollAttempts);
        checkDeadline();
      }

      if (isTerminalStatus(statusResponse.status)) {
        const accepted = statusResponse.status === HaciendaStatus.ACEPTADO;
        let rejectionReason: string | undefined;

        if (!accepted && statusResponse.responseXml) {
          rejectionReason = extractRejectionReason(statusResponse.responseXml);
        }

        return {
          accepted,
          status: statusResponse.status,
          clave: statusResponse.clave,
          date: statusResponse.date,
          responseXml: statusResponse.responseXml,
          rejectionReason,
          submissionStatus: submissionResponse.status,
          pollAttempts,
          persisted: false,
        };
      }
    }
  } finally {
    clearTimeout(timer);
  }
}
