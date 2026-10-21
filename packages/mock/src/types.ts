/**
 * Public types of the Hacienda mock server.
 *
 * @module mock/types
 */

/** Terminal and non-terminal processing states of a comprobante. */
export type MockStatus = "recibido" | "procesando" | "aceptado" | "rechazado" | "error";

/** Outcome the mock assigns to a submitted document. */
export type MockOutcome = Exclude<MockStatus, "recibido" | "procesando">;

/** Outcome with the rejection code the recorded response carries. */
export interface MockOutcomeSpec {
  /** Terminal status assigned to the document. */
  readonly status: MockOutcome;
  /** Rejection code (the SDK's documented `01`–`12` set) for rejections. */
  readonly codigo?: string;
}

/** Rate limit budget enforced by the mock. */
export interface MockRateLimit {
  /** Maximum requests allowed per window (per client). */
  readonly limit: number;
  /** Window length in milliseconds. */
  readonly windowMs: number;
}

/** Configuration of a mock server instance. */
export interface MockServerOptions {
  /** Interface to bind (default `127.0.0.1`). */
  readonly host?: string;
  /** Port to bind (default `0`, an ephemeral port). */
  readonly port?: number;
  /** Access token lifetime in seconds (default `300`). */
  readonly tokenTtlSeconds?: number;
  /** Milliseconds from `recibido` to `procesando` (default `50`). */
  readonly processingDelayMs?: number;
  /** Milliseconds from `procesando` to the terminal state (default `250`). */
  readonly acceptanceDelayMs?: number;
  /** Rate limit budget per client (default 30 requests per minute). */
  readonly rateLimit?: MockRateLimit;
  /** Callback attempts before giving up (default `3`). */
  readonly callbackRetries?: number;
  /** Backoff between callback attempts in milliseconds (default `100`). */
  readonly callbackBackoffMs?: number;
  /** Outcome assigned to submitted documents. */
  readonly outcome?:
    MockOutcome | MockOutcomeSpec | ((clave: string) => MockOutcome | MockOutcomeSpec);
  /** `replay` serves the sanitized recorded responses; `record` captures them. */
  readonly mode?: "replay" | "record";
  /** Sink for captured responses in `record` mode. */
  readonly recordSink?: (entry: RecordedResponse) => void;
  /** Diagnostic sink; never receives credentials or document payloads. */
  readonly logger?: (line: string) => void;
  /** Si true, simula que el enlace con Hacienda está caído (error de red / 503). */
  readonly linkDown?: boolean;
}

/** A sanitized recorded response, reusable in `replay` mode. */
export interface RecordedResponse {
  /** Clave the response belongs to. */
  readonly clave: string;
  /** Status returned by the recorded response. */
  readonly indEstado: MockStatus;
  /** Hacienda response date (ISO 8601). */
  readonly fecha: string;
  /** Base64-encoded `MensajeHacienda` XML. */
  readonly respuestaXml: string;
  /** Rejection code, when the response is a rejection. */
  readonly codigo?: string;
  /** Human-readable rejection detail, when the response is a rejection. */
  readonly detalle?: string;
}

/** A document submitted to the mock. */
export interface MockSubmission {
  /** 50-digit clave. */
  readonly clave: string;
  /** Emisor identification type. */
  readonly emisorTipo: string;
  /** Emisor identification number. */
  readonly emisorNumero: string;
  /** Callback URL requested by the client, if any. */
  readonly callbackUrl?: string;
  /** ISO timestamp of the submission. */
  readonly receivedAt: string;
}

/** One callback delivery attempt. */
export interface MockCallbackAttempt {
  /** Clave of the document the callback notifies. */
  readonly clave: string;
  /** Callback URL that was called. */
  readonly url: string;
  /** Attempt number, starting at 1. */
  readonly attempt: number;
  /** Whether the attempt was answered with a 2xx status. */
  readonly ok: boolean;
  /** HTTP status returned by the callback endpoint. */
  readonly status?: number;
  /** Error message when the attempt failed at the transport level. */
  readonly error?: string;
}

/** Handle over a running mock server. */
export interface MockServer {
  /** Base URL of the server (`http://host:port`). */
  readonly url: string;
  /** Base URL the SDK must use as `envConfig.apiBaseUrl`. */
  readonly apiBaseUrl: string;
  /** URL the SDK must use as `envConfig.idpTokenUrl`. */
  readonly idpTokenUrl: string;
  /** Documents submitted so far. */
  readonly submissions: () => readonly MockSubmission[];
  /** Callback delivery attempts so far. */
  readonly callbackAttempts: () => readonly MockCallbackAttempt[];
  /** Responses captured in `record` mode. */
  readonly recorded: () => readonly RecordedResponse[];
  /** Clears documents, tokens, rate-limit counters and callback history. */
  reset(): void;
  /** Stops the server and releases the port. */
  close(): Promise<void>;
}
