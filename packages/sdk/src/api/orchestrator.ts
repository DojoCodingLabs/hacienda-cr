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
}

/** Default configuration values. */
const DEFAULTS = {
  pollIntervalMs: 3000,
  timeoutMs: 60000,
} as const;

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
      // Wait before polling (except on the first attempt, give Hacienda a moment)
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
        // If we get a 404, the document may not be indexed yet — keep polling
        if (error instanceof ApiError && error.statusCode === 404) {
          continue;
        }
        throw error;
      }

      // Invoke the poll callback if provided
      if (options?.onPoll) {
        options.onPoll(statusResponse, pollAttempts);
        checkDeadline();
      }

      // Check if we've reached a terminal status
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
        };
      }
    }
  } finally {
    clearTimeout(timer);
  }
}
