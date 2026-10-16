/** Best-effort secret removal for diagnostic output; never mutates caller data. */
const REDACTED = "[REDACTED]";
const SECRET_KEYS = new Set([
  "password",
  "passwd",
  "passphrase",
  "pin",
  "p12pin",
  "certificatepin",
  "privatekey",
  "authorization",
  "proxyauthorization",
  "cookie",
  "setcookie",
  "token",
  "accesstoken",
  "refreshtoken",
  "idtoken",
  "clientsecret",
  "secret",
  "apikey",
  "haciendapassword",
  "haciendap12pin",
  "sessiontoken",
  "authtoken",
  "p12",
  "p12buffer",
  "p12data",
  "pfx",
]);

/** Removes configured secrets and common credential syntax from a public message. */
export function sanitizeLogString(value: string): string {
  return createRedactor().text(value);
}

/** Produces a JSON-safe redacted copy, including nested Error/cycle handling. */
export function redactSecrets(value: unknown): unknown {
  return createRedactor().value(value);
}

function environmentSecrets(): string[] {
  return Object.entries(process.env)
    .filter(
      ([key, value]) =>
        Boolean(value) &&
        (/(?:^|_)(?:PASSWORD|PASSWD|TOKEN|SECRET|PIN|PRIVATE_KEY|API_KEY)(?:$|_)/i.test(key) ||
          key === "HACIENDA_USERNAME"),
    )
    .map(([, value]) => value ?? "")
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
}

export function createRedactor(): {
  text: (value: string) => string;
  value: (value: unknown) => unknown;
} {
  const secrets = environmentSecrets();
  const text = (input: string): string => {
    let output = input;
    for (const secret of secrets) output = output.split(secret).join(REDACTED);
    return output
      .replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi, "$1 [REDACTED]")
      .replace(
        /(\b(?:password|passwd|passphrase|pin|p12[_-]?pin|access[_-]?token|refresh[_-]?token|client[_-]?secret|api[_-]?key)\b["']?\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi,
        "$1[REDACTED]",
      )
      .replace(
        /-----BEGIN (?:RSA |EC |ENCRYPTED )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |ENCRYPTED )?PRIVATE KEY-----/g,
        REDACTED,
      );
  };
  const seen = new WeakSet<object>();
  const visit = (input: unknown, depth: number): unknown => {
    if (typeof input === "string") return text(input);
    if (typeof input === "bigint") return input.toString();
    if (typeof input === "function" || typeof input === "symbol") return "[Unsupported]";
    if (!input || typeof input !== "object") return input;
    if (seen.has(input)) return "[Circular]";
    if (depth > 20) return "[MaxDepth]";
    seen.add(input);
    if (Array.isArray(input)) return input.slice(0, 1000).map((item) => visit(item, depth + 1));
    if (input instanceof Date)
      return Number.isNaN(input.getTime()) ? "Invalid Date" : input.toISOString();
    const output: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    const descriptors = Object.getOwnPropertyDescriptors(input);
    const keys = new Set(Object.keys(input));
    if (input instanceof Error)
      for (const key of ["name", "message", "stack", "cause"]) keys.add(key);
    for (const key of [...keys].slice(0, 1000)) {
      const safeKey = text(key);
      const normalizedKey = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
      const descriptor = descriptors[key];
      if (
        SECRET_KEYS.has(normalizedKey) ||
        /(?:password|passwd|passphrase|pin|token|authorization|cookie|privatekey|secret|apikey)$/.test(
          normalizedKey,
        )
      )
        output[safeKey] = REDACTED;
      else if (descriptor && "value" in descriptor)
        output[safeKey] = visit(descriptor.value, depth + 1);
      else if (descriptor) output[safeKey] = "[Accessor]";
    }
    return output;
  };
  return { text, value: (input) => visit(input, 0) };
}
