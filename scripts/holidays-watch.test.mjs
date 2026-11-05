import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { extractFeriadoDates, parseArgs, runHolidaysWatch, sha256 } from "./holidays-watch.mjs";

const PDF = Buffer.from("synthetic pdf bytes");

function pdfResponse(bytes, url) {
  return {
    status: 200,
    url,
    headers: new Headers(),
    arrayBuffer: async () =>
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  };
}

function statusResponse(status, url) {
  return {
    status,
    url,
    headers: new Headers(),
    arrayBuffer: async () => new ArrayBuffer(0),
  };
}

function temporaryRepo() {
  const repo = mkdtempSync(join(tmpdir(), "holidays-watch-test-"));
  mkdirSync(join(repo, "packages", "sdk", "schemas", "feriados"), { recursive: true });
  return repo;
}

function writeCalendar(repo) {
  writeFileSync(
    join(repo, "packages", "sdk", "schemas", "feriados", "feriados.json"),
    JSON.stringify({
      yearRange: [2025, 2026],
      holidays: [
        { name: "Año Nuevo", dates: { 2026: "2026-01-01" } },
        { name: "Navidad", dates: { 2026: "2026-12-25" } },
      ],
    }),
  );
}

test("not published: control 200 and next year 404 exits 0", async () => {
  const methods = [];
  const result = await runHolidaysWatch({
    year: 2027,
    controlYear: 2026,
    repoRoot: temporaryRepo(),
    log: () => {},
    fetchImpl: async (url, init) => {
      methods.push(init.method);
      return url.endsWith("2027.pdf") ? statusResponse(404, url) : statusResponse(200, url);
    },
  });
  assert.equal(result.code, 0);
  assert.equal(result.status, "not-published");
  assert.deepEqual(methods, ["GET", "GET"]);
  assert.ok(result.messages.some((message) => message.includes("aún no publicado")));
});

test("route changed: control 404 exits 2", async () => {
  const result = await runHolidaysWatch({
    year: 2027,
    controlYear: 2026,
    repoRoot: temporaryRepo(),
    log: () => {},
    fetchImpl: async (url) => statusResponse(404, url),
  });
  assert.equal(result.code, 2);
  assert.equal(result.status, "route-changed");
  assert.ok(result.messages.some((message) => message.includes("la ruta de la fuente cambió")));
});

test("new PDF: downloads, hashes and asks for review without editing the repo", async () => {
  const repo = temporaryRepo();
  writeCalendar(repo);
  const result = await runHolidaysWatch({
    year: 2027,
    controlYear: 2026,
    repoRoot: repo,
    log: () => {},
    extractDates: () => ({ dates: ["2027-01-01", "2027-04-02"], warning: null }),
    fetchImpl: async (url) => pdfResponse(PDF, url),
  });
  assert.equal(result.code, 1);
  assert.equal(result.status, "review");
  assert.equal(result.hash, sha256(PDF));
  assert.ok(result.tempFile && existsSync(result.tempFile));
  assert.ok(result.messages.some((message) => message.includes("no se copió al repo")));
  assert.ok(result.messages.some((message) => message.includes("diff contra 2026")));
  const calendar = JSON.parse(
    readFileSync(join(repo, "packages", "sdk", "schemas", "feriados", "feriados.json"), "utf8"),
  );
  assert.deepEqual(calendar.yearRange, [2025, 2026]);
  rmSync(repo, { recursive: true, force: true });
});

test("unchanged PDF exits 0 without extracting dates", async () => {
  const repo = temporaryRepo();
  writeFileSync(
    join(repo, "packages", "sdk", "schemas", "feriados", "feriados-calendario-2027.pdf"),
    PDF,
  );
  const result = await runHolidaysWatch({
    year: 2027,
    controlYear: 2026,
    repoRoot: repo,
    log: () => {},
    extractDates: () => {
      throw new Error("extractDates must not run when the hash matches");
    },
    fetchImpl: async (url) => pdfResponse(PDF, url),
  });
  assert.equal(result.code, 0);
  assert.equal(result.status, "unchanged");
  rmSync(repo, { recursive: true, force: true });
});

test("rejects redirects to a non-official host", async () => {
  const result = await runHolidaysWatch({
    year: 2027,
    controlYear: 2026,
    repoRoot: temporaryRepo(),
    log: () => {},
    fetchImpl: async (url) => ({
      status: 302,
      url,
      headers: new Headers({ location: "https://evil.example/feriados_calendario_2026.pdf" }),
      arrayBuffer: async () => new ArrayBuffer(0),
    }),
  });
  assert.equal(result.code, 2);
  assert.equal(result.status, "error");
  assert.ok(result.messages.some((message) => message.includes("non-official host")));
});

test("extracts only the holiday table, including Semana Santa and 1° de diciembre", () => {
  const text = [
    "FECHA              DIA DE DISFRUTE       APLICACIÓN DE PAGO",
    "1 de enero         Miércoles             de pago obligatorio",
    "SEMANA SANTA       Jueves y Viernes      de pago obligatorio",
    "17 y 18 de abril",
    "1° de diciembre    Lunes                 de pago no obligatorio",
    "Ningún trabajador está obligado a laborar esos días feriados.",
    "22 de noviembre de 2024",
  ].join("\n");
  assert.deepEqual(extractFeriadoDates(text, 2027), [
    "2027-01-01",
    "2027-04-17",
    "2027-04-18",
    "2027-12-01",
  ]);
});

test("parses year, control year and inline values", () => {
  assert.deepEqual(parseArgs(["--year", "2028", "--control-year=2027"]), {
    year: 2028,
    controlYear: 2027,
    timeoutMs: 15000,
    help: false,
  });
  assert.throws(() => parseArgs(["--year", "not-a-year"]), /Invalid --year/);
  assert.throws(() => parseArgs(["--unknown"]), /Unknown argument/);
});
