#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const BASE_URL = "https://www.mtss.go.cr/temas-laborales/feriados";
export const SOURCE_HOSTS = new Set(["mtss.go.cr", "www.mtss.go.cr"]);
const MONTHS = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  setiembre: 9,
  septiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

const USAGE = `Usage: pnpm holidays:watch [--year <year>] [--control-year <year>] [--timeout-ms <ms>]

Probes the official MTSS holiday letter for <year> and a known-published
control year. It never edits feriados.json, the manifest or the README.

Exit codes:
  0  not published yet, or the downloaded bytes match the local PDF
  1  a new or changed PDF needs human review
  2  the control probe failed (the URL pattern changed or the network failed)`;

export function holidayUrl(year) {
  return `${BASE_URL}/feriados_calendario_${year}.pdf`;
}

export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function parseArgs(argv) {
  const args = { year: null, controlYear: null, timeoutMs: 15000, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const [flag, inlineValue] = argv[index].split("=");
    const takeValue = () => {
      if (inlineValue !== undefined) return inlineValue;
      index += 1;
      return argv[index];
    };
    switch (flag) {
      case "--year":
        args.year = Number(takeValue());
        break;
      case "--control-year":
        args.controlYear = Number(takeValue());
        break;
      case "--timeout-ms":
        args.timeoutMs = Number(takeValue());
        break;
      case "--help":
      case "-h":
        args.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${argv[index]}`);
    }
  }
  for (const [name, value] of [
    ["year", args.year],
    ["control-year", args.controlYear],
  ]) {
    if (value !== null && (!Number.isInteger(value) || value < 2000 || value > 2200))
      throw new Error(`Invalid --${name}: ${value}`);
  }
  if (!Number.isInteger(args.timeoutMs) || args.timeoutMs < 1)
    throw new Error(`Invalid --timeout-ms: ${args.timeoutMs}`);
  return args;
}

async function fetchOfficialPdf(year, { fetchImpl, timeoutMs }) {
  let current = holidayUrl(year);
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    const response = await fetchImpl(current, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        accept: "application/pdf",
        "user-agent": "hacienda-cr-holidays-watch/1.0",
      },
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error(`HTTP ${response.status} without Location for ${current}`);
      const next = new URL(location, current);
      if (next.protocol !== "https:" || !SOURCE_HOSTS.has(next.hostname))
        throw new Error(`redirect to a non-official host: ${next.href}`);
      current = next.href;
      continue;
    }
    return { status: response.status, url: current, response };
  }
  throw new Error("too many redirects");
}

/**
 * Extracts ISO dates from the MTSS table. It only reads the table slice between
 * the header and the first paragraph, so the letter date is not mistaken for a
 * holiday.
 */
export function extractFeriadoDates(text, year) {
  const start = text.indexOf("FECHA");
  const end = text.indexOf("Ningún trabajador");
  const table = start >= 0 && end > start ? text.slice(start, end) : text;
  const pattern =
    /(\d{1,2})(?:\s+y\s+(\d{1,2}))?\s*°?\s*de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|setiembre|septiembre|octubre|noviembre|diciembre)/gi;
  const dates = new Set();
  for (const line of table.split(/\r?\n/)) {
    for (const match of line.matchAll(pattern)) {
      const month = MONTHS[match[3].toLowerCase()];
      for (const day of [match[1], match[2]]) {
        if (!day) continue;
        dates.add(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
      }
    }
  }
  return [...dates].sort();
}

export function extractDatesFromPdf(bytes, year) {
  const dir = mkdtempSync(join(tmpdir(), "hacienda-holidays-"));
  try {
    const file = join(dir, `feriados_calendario_${year}.pdf`);
    writeFileSync(file, bytes);
    try {
      const text = execFileSync("pdftotext", ["-layout", file, "-"], { encoding: "utf8" });
      return { dates: extractFeriadoDates(text, year), warning: null };
    } catch (error) {
      return {
        dates: [],
        warning: `pdftotext no disponible (${error.code ?? error.message})`,
      };
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export function readCalendarDates(repoRoot, year) {
  const file = join(repoRoot, "packages", "sdk", "schemas", "feriados", "feriados.json");
  if (!existsSync(file)) return [];
  const data = JSON.parse(readFileSync(file, "utf8"));
  return (data.holidays ?? [])
    .map((holiday) => holiday?.dates?.[String(year)])
    .filter((date) => typeof date === "string")
    .sort();
}

export async function runHolidaysWatch(options = {}) {
  const {
    fetchImpl = globalThis.fetch,
    timeoutMs = 15000,
    repoRoot = resolve(import.meta.dirname, ".."),
    now = new Date(),
    extractDates = extractDatesFromPdf,
    log = (message) => process.stdout.write(`${message}\n`),
  } = options;
  const year = options.year ?? now.getUTCFullYear() + 1;
  const controlYear = options.controlYear ?? year - 1;
  const messages = [];
  const emit = (message) => {
    messages.push(message);
    log(message);
  };

  if (typeof fetchImpl !== "function") throw new Error("fetch is not available");

  emit(`holidays:watch: control ${controlYear}: consultando ${holidayUrl(controlYear)}`);
  let control;
  try {
    control = await fetchOfficialPdf(controlYear, { fetchImpl, timeoutMs });
  } catch (error) {
    emit(`holidays:watch: control ${controlYear}: error de red: ${error.message}`);
    return { code: 2, status: "error", messages };
  }
  if (control.status !== 200) {
    emit(
      `holidays:watch: control ${controlYear}: HTTP ${control.status} — la ruta de la fuente cambió`,
    );
    emit(
      "holidays:watch: ACCIÓN: localizar la nueva URL oficial y actualizar el job y el runbook; no asumir 'no publicado'.",
    );
    return { code: 2, status: "route-changed", messages };
  }
  emit(`holidays:watch: control ${controlYear}: HTTP 200 (patrón vigente)`);

  let next;
  try {
    next = await fetchOfficialPdf(year, { fetchImpl, timeoutMs });
  } catch (error) {
    emit(`holidays:watch: ${year}: error de red: ${error.message}`);
    return { code: 2, status: "error", messages };
  }
  if (next.status === 404) {
    emit(`holidays:watch: ${year}: HTTP 404 — aún no publicado`);
    return { code: 0, status: "not-published", messages };
  }
  if (next.status !== 200) {
    emit(`holidays:watch: ${year}: HTTP ${next.status} — respuesta inesperada`);
    return { code: 2, status: "error", messages };
  }

  const bytes = Buffer.from(await next.response.arrayBuffer());
  const hash = sha256(bytes);
  const localPdf = join(
    repoRoot,
    "packages",
    "sdk",
    "schemas",
    "feriados",
    `feriados-calendario-${year}.pdf`,
  );
  if (existsSync(localPdf)) {
    const localHash = sha256(readFileSync(localPdf));
    if (localHash === hash) {
      emit(`holidays:watch: ${year}: HTTP 200, sha256=${hash} — sin cambios`);
      return { code: 0, status: "unchanged", hash, messages };
    }
    emit(`holidays:watch: ${year}: el PDF local cambió (local=${localHash}, remoto=${hash})`);
  } else {
    emit(`holidays:watch: ${year}: PDF nuevo, sha256=${hash}`);
  }

  const tempDir = join(tmpdir(), "hacienda-holidays");
  mkdirSync(tempDir, { recursive: true });
  const tempFile = join(tempDir, `feriados_calendario_${year}.pdf`);
  writeFileSync(tempFile, bytes);
  emit(`holidays:watch: PDF descargado en ${tempFile} (no se copió al repo)`);

  const { dates, warning } = extractDates(bytes, year);
  if (warning) emit(`holidays:watch: aviso: ${warning}`);
  if (dates.length > 0) {
    emit(`holidays:watch: fechas extraídas (${dates.length}): ${dates.join(", ")}`);
    const previous = readCalendarDates(repoRoot, year - 1);
    if (previous.length > 0) {
      const previousMonthDays = new Set(previous.map((date) => date.slice(5)));
      const currentMonthDays = new Set(dates.map((date) => date.slice(5)));
      const added = dates.filter((date) => !previousMonthDays.has(date.slice(5)));
      const missing = previous.filter((date) => !currentMonthDays.has(date.slice(5)));
      emit(
        `holidays:watch: diff contra ${year - 1}: +[${added.join(", ")}] -[${missing.join(", ")}]`,
      );
    } else {
      emit(`holidays:watch: no hay tabla local para ${year - 1}; revisar manualmente`);
    }
  }

  emit(
    "holidays:watch: ACCIÓN: revisar la carta, transcribir y actualizar feriados.json, manifest, README y pruebas; el job no aplica cambios.",
  );
  return { code: 1, status: "review", hash, tempFile, dates, messages };
}

export async function main(argv = process.argv.slice(2)) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    process.stderr.write(`holidays:watch: ${error.message}\n`);
    return 2;
  }
  if (args.help) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  const result = await runHolidaysWatch({
    year: args.year ?? undefined,
    controlYear: args.controlYear ?? undefined,
    timeoutMs: args.timeoutMs,
  });
  return result.code;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .then((code) => process.exit(code))
    .catch((error) => {
      process.stderr.write(`holidays:watch: ${error.message}\n`);
      process.exit(2);
    });
}
