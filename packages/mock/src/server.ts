/**
 * Core of the Hacienda mock server.
 *
 * Reproduces the reception API (v4.4) with the parts that matter in
 * production: `201` on receipt, `400` with the real reason in
 * `X-Error-Cause`, `401` on an expired token, `409` on a duplicate clave,
 * `429` with `X-Ratelimit-*` headers, asynchronous callbacks with three
 * attempts, and states that take time to move from `recibido` through
 * `procesando` to a terminal state.
 *
 * @module mock/server
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";

import { recordedResponse, sanitizeResponseXml, toBase64Xml } from "./responses.js";
import type {
  MockCallbackAttempt,
  MockOutcome,
  MockOutcomeSpec,
  MockServer,
  MockServerOptions,
  MockStatus,
  MockSubmission,
  RecordedResponse,
} from "./types.js";

const DEFAULT_TOKEN_TTL_SECONDS = 300;
const DEFAULT_PROCESSING_DELAY_MS = 50;
const DEFAULT_ACCEPTANCE_DELAY_MS = 250;
const DEFAULT_RATE_LIMIT = 30;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_CALLBACK_RETRIES = 3;
const DEFAULT_CALLBACK_BACKOFF_MS = 100;
const MAX_BODY_BYTES = 1024 * 1024;

const CLAVE_PATTERN = /^506\d{6}[A-Za-z0-9]{12}\d{29}$/;

interface DocumentState {
  readonly clave: string;
  /** Terminal status the document converges to. */
  readonly status: MockOutcome;
  readonly submittedAt: number;
  readonly processingAt: number;
  readonly terminalAt: number;
  readonly callbackUrl?: string;
  /** Rejection code carried by the recorded response, when the outcome rejects. */
  readonly codigo?: string;
  callbackSent: boolean;
  callbackTimer?: NodeJS.Timeout;
}

interface TokenState {
  readonly expiresAt: number;
}

interface RateWindow {
  readonly timestamps: number[];
}

type ReadBodyResult =
  | { readonly ok: true; readonly body: string }
  | { readonly ok: false; readonly reason: "too-large" }
  | { readonly ok: false; readonly reason: "aborted" };

function defaultOutcome(): MockOutcome {
  return "aceptado";
}

function nowMs(): number {
  return Date.now();
}

/**
 * Creates and starts a mock server of the Hacienda reception API.
 *
 * @param options - Configuration (ports, delays, rate limit, outcome, mode).
 * @returns A handle over the running server.
 *
 * @example
 * ```ts
 * const mock = await createMockServer({ processingDelayMs: 0, acceptanceDelayMs: 0 });
 * console.log(mock.apiBaseUrl);
 * await mock.close();
 * ```
 */
export async function createMockServer(options: MockServerOptions = {}): Promise<MockServer> {
  const host = options.host ?? "127.0.0.1";
  if (!["127.0.0.1", "::1"].includes(host)) throw new Error("Mock only binds loopback interfaces");
  const shutdown = new AbortController();
  const tokenTtlSeconds = options.tokenTtlSeconds ?? DEFAULT_TOKEN_TTL_SECONDS;
  const processingDelayMs = options.processingDelayMs ?? DEFAULT_PROCESSING_DELAY_MS;
  const acceptanceDelayMs = options.acceptanceDelayMs ?? DEFAULT_ACCEPTANCE_DELAY_MS;
  const rateLimit = options.rateLimit ?? {
    limit: DEFAULT_RATE_LIMIT,
    windowMs: DEFAULT_RATE_LIMIT_WINDOW_MS,
  };
  const callbackRetries = options.callbackRetries ?? DEFAULT_CALLBACK_RETRIES;
  const callbackBackoffMs = options.callbackBackoffMs ?? DEFAULT_CALLBACK_BACKOFF_MS;
  const mode = options.mode ?? "replay";
  const logger = options.logger;
  const linkDown = options.linkDown ?? false;

  const documents = new Map<string, DocumentState>();
  const tokens = new Map<string, TokenState>();
  const windows = new Map<string, RateWindow>();
  const submissions: MockSubmission[] = [];
  const callbackAttempts: MockCallbackAttempt[] = [];
  const recorded: RecordedResponse[] = [];

  function log(line: string): void {
    logger?.(line);
  }

  function pruneWindow(key: string, timestamp: number): RateWindow {
    const window = windows.get(key) ?? { timestamps: [] };
    const cutoff = timestamp - rateLimit.windowMs;
    while (window.timestamps.length > 0 && (window.timestamps[0] ?? 0) <= cutoff) {
      window.timestamps.shift();
    }
    windows.set(key, window);
    return window;
  }

  function rateLimitHeaders(key: string): Record<string, string> {
    const timestamp = nowMs();
    const window = pruneWindow(key, timestamp);
    const remaining = Math.max(0, rateLimit.limit - window.timestamps.length);
    const resetSeconds = Math.ceil(
      (window.timestamps[0] ?? timestamp) / 1000 + rateLimit.windowMs / 1000 - timestamp / 1000,
    );
    return {
      "X-Ratelimit-Limit": String(rateLimit.limit),
      "X-Ratelimit-Remaining": String(remaining),
      "X-Ratelimit-Reset": String(Math.max(0, resetSeconds)),
    };
  }

  function consumeBudget(key: string): boolean {
    const timestamp = nowMs();
    const window = pruneWindow(key, timestamp);
    if (window.timestamps.length >= rateLimit.limit) return false;
    window.timestamps.push(timestamp);
    return true;
  }

  function clientKey(req: IncomingMessage): string {
    const auth = req.headers.authorization;
    if (auth) return `token:${auth}`;
    return `ip:${req.socket.remoteAddress ?? "unknown"}`;
  }

  function sendJson(
    res: ServerResponse,
    status: number,
    body: unknown,
    headers: Record<string, string> = {},
  ): void {
    if (res.writableEnded || res.destroyed || res.headersSent) return;
    const payload = JSON.stringify(body);
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Length": Buffer.byteLength(payload),
      ...headers,
    });
    res.end(payload);
  }

  function sendError(
    res: ServerResponse,
    status: number,
    errorCause: string,
    headers: Record<string, string> = {},
  ): void {
    sendJson(res, status, { error: errorCause }, { "X-Error-Cause": errorCause, ...headers });
  }

  function isTokenValid(token: string): boolean {
    const state = tokens.get(token);
    if (!state) return false;
    if (state.expiresAt <= nowMs()) {
      tokens.delete(token);
      return false;
    }
    return true;
  }

  function currentStatus(doc: DocumentState): MockStatus {
    const timestamp = nowMs();
    if (timestamp >= doc.terminalAt) return doc.status;
    if (timestamp >= doc.processingAt) return "procesando";
    return "recibido";
  }

  function responseFor(doc: DocumentState, outcome: MockOutcome): RecordedResponse {
    return recordedResponse(doc.clave, outcome, doc.codigo);
  }

  async function deliverCallback(doc: DocumentState, response: RecordedResponse): Promise<void> {
    if (!doc.callbackUrl || doc.callbackSent) return;
    doc.callbackSent = true;
    const body = JSON.stringify({
      clave: response.clave,
      "ind-estado": response.indEstado,
      fecha: response.fecha,
      ...(response.respuestaXml !== undefined ? { "respuesta-xml": response.respuestaXml } : {}),
    });

    for (let attempt = 1; attempt <= callbackRetries; attempt++) {
      let ok = false;
      let status: number | undefined;
      let error: string | undefined;
      try {
        const res = await fetch(doc.callbackUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          signal: AbortSignal.any([shutdown.signal, AbortSignal.timeout(5000)]),
          redirect: "error",
        });
        status = res.status;
        ok = res.ok;
        await res.body?.cancel();
      } catch (cause) {
        error = cause instanceof Error ? cause.message : String(cause);
      }
      callbackAttempts.push({
        clave: doc.clave,
        url: doc.callbackUrl,
        attempt,
        ok,
        ...(status !== undefined ? { status } : {}),
        ...(error !== undefined ? { error } : {}),
      });
      if (ok) return;
      if (attempt < callbackRetries) {
        await new Promise((resolve) => setTimeout(resolve, callbackBackoffMs * attempt));
      }
    }
    log(`callback gave up after ${String(callbackRetries)} attempts for ${doc.clave}`);
  }

  function scheduleCallback(doc: DocumentState): void {
    if (!doc.callbackUrl) return;
    const delay = Math.max(0, doc.terminalAt - nowMs());
    doc.callbackTimer = setTimeout(() => {
      void deliverCallback(doc, responseFor(doc, doc.status));
    }, delay);
    doc.callbackTimer.unref?.();
  }

  function readBody(req: IncomingMessage): Promise<ReadBodyResult> {
    return new Promise((resolve) => {
      const chunks: Buffer[] = [];
      let size = 0;
      let tooLarge = false;
      let settled = false;
      const finish = (result: ReadBodyResult): void => {
        if (settled) return;
        settled = true;
        resolve(result);
      };
      req.on("data", (chunk: Buffer) => {
        if (settled) return;
        if (tooLarge) return;
        size += chunk.length;
        if (size > MAX_BODY_BYTES) {
          tooLarge = true;
          finish({ ok: false, reason: "too-large" });
          return;
        }
        chunks.push(chunk);
      });
      req.on("end", () => {
        if (settled) return;
        finish({ ok: true, body: Buffer.concat(chunks).toString("utf8") });
      });
      req.on("error", () => {
        finish({ ok: false, reason: "aborted" });
      });
      req.on("close", () => {
        if (settled) return;
        finish({ ok: false, reason: "aborted" });
      });
    });
  }

  async function handleToken(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const key = clientKey(req);
    const headers = rateLimitHeaders(key);
    if (!consumeBudget(key)) {
      sendError(res, 429, "Rate limit exceeded for the current window.", headers);
      return;
    }
    const result = await readBody(req);
    if (!result.ok) {
      if (result.reason === "too-large") {
        sendError(res, 400, "The request body is too large.", { ...headers, Connection: "close" });
        res.on("finish", () => {
          try {
            req.destroy();
          } catch {
            /* ignore */
          }
        });
      }
      return;
    }
    const params = new URLSearchParams(result.body);
    const grantType = params.get("grant_type");
    if (grantType !== "password" && grantType !== "refresh_token") {
      sendError(res, 400, "Unsupported grant_type for the mock identity provider.", headers);
      return;
    }
    const accessToken = `mock-access-${randomUUID()}`;
    const refreshToken = `mock-refresh-${randomUUID()}`;
    tokens.set(accessToken, { expiresAt: nowMs() + tokenTtlSeconds * 1000 });
    tokens.set(refreshToken, { expiresAt: nowMs() + tokenTtlSeconds * 1000 });
    sendJson(
      res,
      200,
      {
        access_token: accessToken,
        token_type: "bearer",
        expires_in: tokenTtlSeconds,
        refresh_token: refreshToken,
        refresh_expires_in: tokenTtlSeconds,
        session_state: "mock-session",
      },
      headers,
    );
  }

  async function handleSubmit(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const key = clientKey(req);
    const headers = rateLimitHeaders(key);
    if (!consumeBudget(key)) {
      sendError(res, 429, "Rate limit exceeded for the current window.", headers);
      return;
    }
    const auth = req.headers.authorization ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token || !isTokenValid(token)) {
      sendError(res, 401, "The access token is invalid or has expired.", headers);
      return;
    }

    const result = await readBody(req);
    if (!result.ok) {
      if (result.reason === "too-large") {
        sendError(res, 400, "The request body is too large.", { ...headers, Connection: "close" });
        res.on("finish", () => {
          try {
            req.destroy();
          } catch {
            /* ignore */
          }
        });
      }
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(result.body);
    } catch {
      sendError(res, 400, "The request body is not valid JSON.", headers);
      return;
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      sendError(res, 400, "The request body must be a JSON object.", headers);
      return;
    }
    const payload = parsed as Record<string, unknown>;

    const clave = typeof payload["clave"] === "string" ? payload["clave"] : "";
    if (!CLAVE_PATTERN.test(clave)) {
      sendError(res, 400, "The clave numerica must be exactly 50 digits.", headers);
      return;
    }
    if (typeof payload["fecha"] !== "string" || payload["fecha"] === "") {
      sendError(res, 400, "The submission is missing the fecha de emision.", headers);
      return;
    }
    const emisor = payload["emisor"] as Record<string, unknown> | undefined;
    if (
      !emisor ||
      typeof emisor["tipoIdentificacion"] !== "string" ||
      typeof emisor["numeroIdentificacion"] !== "string"
    ) {
      sendError(res, 400, "The submission is missing the emisor identification.", headers);
      return;
    }
    const comprobanteXml = payload["comprobanteXml"];
    if (typeof comprobanteXml !== "string" || comprobanteXml === "") {
      sendError(res, 400, "The submission is missing the comprobanteXml document.", headers);
      return;
    }
    if (documents.has(clave)) {
      sendError(res, 409, `Duplicate clave numerica: ${clave} was already submitted.`, headers);
      return;
    }

    // Simular enlace caído: devolver 503 sin almacenar el documento
    if (linkDown) {
      sendError(res, 503, "El enlace con Hacienda no está disponible. Intente más tarde.", headers);
      return;
    }

    if (payload["callbackUrl"] !== undefined) {
      try {
        const url = new URL(String(payload["callbackUrl"]));
        if (
          url.protocol !== "http:" ||
          !["127.0.0.1", "[::1]"].includes(url.hostname) ||
          url.username ||
          url.password
        )
          throw new Error("Callback must use a literal loopback address");
      } catch {
        sendError(res, 400, "Mock callbacks require HTTP loopback URLs", headers);
        return;
      }
    }
    const rawOutcome =
      typeof options.outcome === "function"
        ? options.outcome(clave)
        : (options.outcome ?? defaultOutcome());
    const spec: MockOutcomeSpec =
      typeof rawOutcome === "string" ? { status: rawOutcome } : rawOutcome;
    const outcome = spec.status;

    const timestamp = nowMs();
    const doc: DocumentState = {
      clave,
      status: outcome,
      submittedAt: timestamp,
      processingAt: timestamp + processingDelayMs,
      terminalAt: timestamp + processingDelayMs + acceptanceDelayMs,
      ...(typeof payload["callbackUrl"] === "string"
        ? { callbackUrl: payload["callbackUrl"] }
        : {}),
      ...(spec.codigo !== undefined ? { codigo: spec.codigo } : {}),
      callbackSent: false,
    };
    documents.set(clave, doc);
    submissions.push({
      clave,
      emisorTipo: String(emisor["tipoIdentificacion"]),
      emisorNumero: String(emisor["numeroIdentificacion"]),
      ...(typeof payload["callbackUrl"] === "string"
        ? { callbackUrl: payload["callbackUrl"] }
        : {}),
      receivedAt: new Date(timestamp).toISOString(),
    });

    const response = responseFor(doc, outcome);
    if (mode === "record") {
      const sanitized = sanitizeResponseXml(
        Buffer.from(response.respuestaXml, "base64").toString("utf8"),
      );
      const entry: RecordedResponse = {
        ...response,
        clave: "0".repeat(50),
        respuestaXml: toBase64Xml(sanitized),
      };
      recorded.push(entry);
      options.recordSink?.(entry);
    }
    scheduleCallback(doc);

    sendJson(
      res,
      201,
      { status: 201, location: `/recepcion/${clave}` },
      { ...headers, Location: `/recepcion/${clave}` },
    );
  }

  async function handleStatus(
    req: IncomingMessage,
    res: ServerResponse,
    clave: string,
  ): Promise<void> {
    const key = clientKey(req);
    const headers = rateLimitHeaders(key);
    if (!consumeBudget(key)) {
      sendError(res, 429, "Rate limit exceeded for the current window.", headers);
      return;
    }
    const auth = req.headers.authorization ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token || !isTokenValid(token)) {
      sendError(res, 401, "The access token is invalid or has expired.", headers);
      return;
    }
    const doc = documents.get(clave);
    if (!doc) {
      sendError(res, 404, `Unknown clave numerica: ${clave}.`, headers);
      return;
    }
    const status = currentStatus(doc);
    const response = responseFor(doc, doc.status);
    sendJson(
      res,
      200,
      {
        clave: doc.clave,
        "ind-estado": status,
        fecha: response.fecha,
        "respuesta-xml": response.respuestaXml,
      },
      headers,
    );
  }

  function dispatch(
    req: IncomingMessage,
    res: ServerResponse,
    handler: (r: IncomingMessage, s: ServerResponse) => Promise<void>,
  ): void {
    res.on("error", () => {
      /* absorb late write errors on dead sockets */
    });
    void (async () => {
      try {
        await handler(req, res);
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : String(cause);
        log(`request handler failed: ${message}`);
        if (res.headersSent) {
          res.destroy();
          return;
        }
        sendError(res, 500, "Internal server error.");
      }
    })();
  }

  const server: Server = createServer((req, res) => {
    let url: URL;
    try {
      url = new URL(req.url ?? "/", "http://mock.invalid");
    } catch {
      sendError(res, 400, "Invalid request URL.");
      return;
    }
    const path = url.pathname;
    const method = req.method ?? "GET";

    if (method === "POST" && path.endsWith("/token")) {
      dispatch(req, res, handleToken);
      return;
    }
    if (method === "POST" && path.endsWith("/recepcion")) {
      dispatch(req, res, handleSubmit);
      return;
    }
    if (method === "GET") {
      const match = /\/recepcion\/(\d{50})$/.exec(path);
      if (match?.[1]) {
        const clave = match[1];
        dispatch(req, res, (r, s) => handleStatus(r, s, clave));
        return;
      }
    }
    sendError(res, 404, `Unknown endpoint: ${method} ${path}.`);
  });

  await new Promise<void>((resolve) => {
    server.listen(options.port ?? 0, host, () => {
      resolve();
    });
  });

  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("The mock server did not bind to a TCP port.");
  }
  const url = `http://${host === "::1" ? "[::1]" : host}:${String(address.port)}`;

  return {
    url,
    apiBaseUrl: `${url}/recepcion-sandbox/v1`,
    idpTokenUrl: `${url}/auth/realms/rut-stag/protocol/openid-connect/token`,
    submissions: () => submissions,
    callbackAttempts: () => callbackAttempts,
    recorded: () => recorded,
    reset: () => {
      for (const doc of documents.values()) {
        if (doc.callbackTimer) clearTimeout(doc.callbackTimer);
      }
      documents.clear();
      tokens.clear();
      windows.clear();
      submissions.length = 0;
      callbackAttempts.length = 0;
      recorded.length = 0;
    },
    close: async () => {
      shutdown.abort();
      for (const doc of documents.values()) {
        if (doc.callbackTimer) clearTimeout(doc.callbackTimer);
      }
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    },
  };
}
