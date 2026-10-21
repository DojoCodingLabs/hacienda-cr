/**
 * CLI entry point — starts the mock server and prints how to point the SDK
 * at it.
 *
 * @module mock/cli
 */
import { createMockServer } from "./server.js";

function flag(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index < 0) return undefined;
  const value = process.argv[index + 1];
  return value !== undefined && !value.startsWith("--") ? value : undefined;
}

const port = Number(flag("port") ?? process.env["HACIENDA_MOCK_PORT"] ?? 8080);
const host = flag("host") ?? process.env["HACIENDA_MOCK_HOST"] ?? "127.0.0.1";
const outcome = flag("outcome");
const recordPath = flag("record");

const server = await createMockServer({
  host,
  port,
  ...(outcome !== undefined ? { outcome: outcome as "aceptado" } : {}),
  ...(recordPath !== undefined ? { mode: "record" as const } : {}),
});

process.stdout.write(
  [
    `Hacienda mock listening on ${server.url}`,
    `  apiBaseUrl  ${server.apiBaseUrl}`,
    `  idpTokenUrl ${server.idpTokenUrl}`,
    "",
  ].join("\n"),
);

if (recordPath !== undefined) {
  const { appendFileSync } = await import("node:fs");
  process.on("SIGINT", () => {
    appendFileSync(
      recordPath,
      server
        .recorded()
        .map((entry) => JSON.stringify(entry))
        .join("\n") + "\n",
    );
  });
}

const shutdown = (): void => {
  void server.close().finally(() => {
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
