import { spawnSync } from "node:child_process";
import { basename } from "node:path";

function fatal(message) {
  const error = new Error(message);
  error.codesExtractFatal = true;
  return error;
}

/** Seam: extract the text of a PDF with `pdftotext -layout` (D3). */
export function runPdftotext(pdfPath) {
  const result = spawnSync("pdftotext", ["-layout", "-enc", "UTF-8", pdfPath, "-"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) {
    throw new Error(`${basename(pdfPath)}: pdftotext no disponible: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const detail = (result.stderr ?? "").trim();
    throw new Error(
      `${basename(pdfPath)}: pdftotext termino con codigo ${result.status}` +
        (detail ? `: ${detail}` : ""),
    );
  }
  return result.stdout;
}

const NOTE_LINE_RE = /^\s*Nota\s+(\d+(?:\.\d+)?)\s*\//;
const FOOTNOTE_GLUED_RE = /^\d{1,3}(?=[A-Za-zÁÉÍÓÚÑáéíóúñ])/;
const TABLE_ROW_K1_RE = /^(.*\S)[ \t]{3,}(\d{2})[ \t]*$/;
const TABLE_ROW_K2_RE = /^ {2,}(\d{2})\s*$/;
const SIT_ROW_RE = /^ {3,}(\d) {2,}(\S.*)$/;
const FOOTNOTE_START_RE = /^\d{1,3}(?=\s)/;
const PAGE_RE = /Página \d+ de \d+/;
const PROSE_LIST_RE = /^[a-h]\)/;

function clean(text) {
  return text.trim().replace(FOOTNOTE_GLUED_RE, "").replace(/\s+/g, " ").trim();
}

function noteExtent(lines, noteId) {
  const anchor = lines.findIndex(
    (line, index) => NOTE_LINE_RE.test(line) && NOTE_LINE_RE.exec(line)[1] === noteId,
  );
  if (anchor === -1) {
    throw fatal(`no se encontro la seccion Nota ${noteId}/`);
  }
  let end = lines.length;
  for (let index = anchor + 1; index < lines.length; index += 1) {
    if (NOTE_LINE_RE.test(lines[index])) {
      end = index;
      break;
    }
  }
  return { anchor, end };
}

function findTableHeader(lines, { anchor, end }, matcher, noteId) {
  for (let index = anchor; index < end; index += 1) {
    if (matcher(lines[index])) return index;
  }
  throw fatal(`nota ${noteId}: sin encabezado de tabla`);
}

function tableBodyEnd(line) {
  if (PAGE_RE.test(line)) return "page";
  if (FOOTNOTE_START_RE.test(line)) return "footnote";
  if (PROSE_LIST_RE.test(line)) return "prose";
  return null;
}

function parseCodeTable(lines, { header, end }, noteId) {
  const rows = [];
  let pending = [];
  let openRow = null;
  let openFromK2 = false;

  for (let index = header + 1; index < end; index += 1) {
    const raw = lines[index];
    if (raw.trim() === "") continue;
    const boundary = tableBodyEnd(raw);
    if (boundary !== null) break;

    const k1 = TABLE_ROW_K1_RE.exec(raw);
    if (k1) {
      const parts = [...pending.map(clean), clean(k1[1])].filter((part) => part !== "");
      pending = [];
      openRow = { code: k1[2], parts };
      openFromK2 = false;
      rows.push(openRow);
      continue;
    }

    const k2 = TABLE_ROW_K2_RE.exec(raw);
    if (k2) {
      if (pending.length === 0) {
        throw fatal(`nota ${noteId}: codigo ${k2[1]} sin descripcion`);
      }
      openRow = { code: k2[1], parts: pending.map(clean) };
      pending = [];
      openFromK2 = true;
      rows.push(openRow);
      continue;
    }

    const trimmed = raw.trim();
    const text = clean(raw);
    if (text === "") continue;
    const gluedFootnote = FOOTNOTE_GLUED_RE.test(trimmed);
    if (openRow !== null && !gluedFootnote && (openFromK2 || /^[a-záéíóúñ]/.test(text))) {
      openRow.parts.push(text);
    } else {
      pending.push(text);
    }
  }

  if (pending.length > 0) {
    throw fatal(`nota ${noteId}: renglon de tabla sin codigo: "${pending.join(" ")}"`);
  }
  if (rows.length === 0) {
    throw fatal(`nota ${noteId}: 0 filas extraidas`);
  }

  const values = [];
  const seen = new Set();
  for (const row of rows) {
    if (seen.has(row.code)) continue;
    seen.add(row.code);
    const description = row.parts.join(" ").replace(/\s+/g, " ").trim();
    if (description === "") {
      throw fatal(`nota ${noteId}: fila ${row.code} sin descripcion`);
    }
    values.push({ code: row.code, description });
  }
  return values;
}

function parseSitTable(lines, extent, noteId) {
  const header = findTableHeader(
    lines,
    extent,
    (line) => line.trimEnd().endsWith("Descripción") && line.includes("Código"),
    noteId,
  );
  const rows = [];
  for (let index = header + 1; index < extent.end; index += 1) {
    const raw = lines[index];
    if (raw.trim() === "") continue;
    const boundary = tableBodyEnd(raw);
    if (boundary !== null) break;
    const match = SIT_ROW_RE.exec(raw);
    if (!match) continue;
    const description = match[2].split(/ {2,}/)[0].replace(/\s+/g, " ").trim();
    if (description === "") {
      throw fatal(`nota ${noteId}: fila ${match[1]} sin nombre`);
    }
    rows.push({ code: match[1], description });
  }
  if (rows.length === 0) {
    throw fatal(`nota ${noteId}: 0 filas extraidas de la tabla de situacion`);
  }
  return rows;
}

const ANEXOS_TABLES = [
  {
    note: "3",
    kind: "code",
    tableKey: "Nota3/TipoComprobanteDocumentoAsociado",
    name: "Tipo de comprobante o documento asociado",
    expectedCodes: ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10"],
  },
  {
    note: "3",
    kind: "sit",
    tableKey: "Nota3/SituacionComprobante",
    name: "Situación del comprobante electrónico",
    expectedCodes: ["1", "2", "3"],
  },
  { note: "5", kind: "code", segments: ["CondicionVenta"] },
  { note: "6", kind: "code", segments: ["TipoMedioPago"] },
  { note: "8", kind: "code", segments: ["CodigoImpuestoType"] },
  { note: "8.1", kind: "code", segments: ["CodigoTarifaIVAType"] },
  { note: "9", kind: "code", segments: ["CodigoReferenciaType"] },
  { note: "10", kind: "code", segments: ["TipoDocReferenciaType"] },
  { note: "10.1", kind: "code", segments: ["TipoExoneracionType"] },
  { note: "16", kind: "code", segments: ["TipoDocOtrosCargosType"] },
  { note: "18", kind: "code", segments: ["CondicionImpuesto"] },
  { note: "20", kind: "code", segments: ["CodigoDescuentoType"] },
  {
    note: "21",
    kind: "code",
    segments: ["IVACobradoFabrica", "IVACobradoFabricaSurtido"],
  },
  { note: "22", kind: "code", segments: ["TipoTransaccionType"] },
  { note: "23", kind: "code", segments: ["NombreInstitucion"] },
];

/**
 * Parse the code tables of the listed ANEXOS notes from `pdftotext -layout`
 * text. Returns one entry per published table: `{note, tableKey?, segments?,
 * values}`. Structural mismatches throw a fatal error naming the source.
 */
export function parseAnexos(rawText, fileLabel) {
  const text = rawText.replace(/\f/g, "");
  const lines = text.split("\n");
  const results = [];

  for (const config of ANEXOS_TABLES) {
    const extent = noteExtent(lines, config.note);
    let values;
    if (config.kind === "sit") {
      values = parseSitTable(lines, extent, config.note);
    } else {
      const header = findTableHeader(
        lines,
        extent,
        (line) => line.trimEnd().endsWith("Código"),
        config.note,
      );
      values = parseCodeTable(lines, { header, end: extent.end }, config.note);
    }

    if (config.expectedCodes) {
      const actual = values.map((value) => value.code).join(",");
      const expected = config.expectedCodes.join(",");
      if (actual !== expected) {
        throw fatal(
          `${fileLabel}: nota ${config.note}: codigos inesperados [${actual}] (se esperaba [${expected}])`,
        );
      }
    }

    const table = { note: config.note, values };
    if (config.tableKey) table.tableKey = config.tableKey;
    if (config.segments) table.segments = config.segments;
    if (config.name) table.name = config.name;
    results.push(table);
  }

  return { tables: results };
}

function tokenize(line) {
  const tokens = [];
  const re = /\S(?:.*?\S)?(?=\s{2,}|\s*$)/g;
  let match;
  while ((match = re.exec(line)) !== null) {
    tokens.push({ text: match[0], start: match.index });
  }
  return tokens;
}

/**
 * Parse the currency table of `Codigodemoneda_V4.4.pdf` (note 13.1) from
 * `pdftotext -layout` text. The country column is detected only to keep it
 * out of the moneda column and is never published (design D6, Open
 * Question: description = moneda column only). Returns `{values, warnings}`:
 * first description per code wins; rows without a code and differing
 * descriptions become warnings.
 */
export function parseMoneda(rawText, fileLabel) {
  const text = rawText.replace(/\f/g, "");
  const lines = text.split("\n");

  const titleIndex = lines.findIndex((line) => line.includes("CÓDIGOMONEDA"));
  if (titleIndex === -1) {
    throw fatal(`${fileLabel}: no se encontro el titulo CÓDIGOMONEDA`);
  }
  const header = lines[titleIndex + 1] ?? "";
  if (!header.includes("NOMBRE DEL PAÍS") || !header.includes("NOMBRE DE LA MODENA")) {
    throw fatal(`${fileLabel}: encabezado de tabla de moneda inesperado: "${header.trim()}"`);
  }

  const rows = [];
  const codeless = [];
  const warnings = [];
  let pending = [];
  let pendingStart = null;
  let lastMonedaOpen = false;

  for (let index = titleIndex + 2; index < lines.length; index += 1) {
    const raw = lines[index];
    const lineNo = index + 1;
    if (raw.trim() === "") {
      pending = [];
      pendingStart = null;
      lastMonedaOpen = false;
      continue;
    }

    const tokens = tokenize(raw);
    const last = tokens[tokens.length - 1];
    const code =
      last !== undefined && /^[A-Z]{3}$/.test(last.text) && last.start >= 40 ? last.text : null;

    if (code !== null) {
      const moneda = tokens
        .filter((token) => token.start > 0 && token !== last)
        .map((token) => token.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      let hadPending = pending.length > 0;
      if (hadPending && moneda !== "") {
        codeless.push({ line: pendingStart, moneda: pending.join(" ") });
        warnings.push(
          `codes:extract: CodigoMonedaType/CodigoMoneda: fila sin codigo en la linea ` +
            `${pendingStart} de ${fileLabel} descartada: "${pending.join(" ")}"`,
        );
        pending = [];
        pendingStart = null;
        hadPending = false;
      }

      const merged = [...pending, moneda].join(" ").replace(/\s+/g, " ").trim();
      pending = [];
      pendingStart = null;
      if (merged === "") {
        throw fatal(`${fileLabel}: linea ${lineNo}: fila sin moneda para el codigo ${code}`);
      }
      rows.push({ code, moneda: merged, line: lineNo });
      lastMonedaOpen = hadPending || moneda === "";
      continue;
    }

    const moneda = tokens
      .filter((token) => token.start > 0)
      .map((token) => token.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (moneda === "") continue;

    if (rows.length > 0 && lastMonedaOpen) {
      const open = rows[rows.length - 1];
      open.moneda = `${open.moneda} ${moneda}`.replace(/\s+/g, " ").trim();
    } else {
      if (pending.length === 0) pendingStart = lineNo;
      pending.push(moneda);
    }
  }

  if (pending.length > 0) {
    throw fatal(
      `${fileLabel}: fragmentos de moneda sin codigo desde la linea ${pendingStart}: ` +
        `"${pending.join(" ")}"`,
    );
  }
  if (rows.length === 0) {
    throw fatal(`${fileLabel}: 0 filas extraidas de la tabla de moneda`);
  }

  const values = [];
  const firstByCode = new Map();
  const distinctByCode = new Map();
  for (const row of rows) {
    const seen = firstByCode.get(row.code);
    if (seen === undefined) {
      firstByCode.set(row.code, row.moneda);
      distinctByCode.set(row.code, [row.moneda]);
      values.push({ code: row.code, description: row.moneda });
      continue;
    }
    const distinct = distinctByCode.get(row.code);
    if (!distinct.includes(row.moneda)) distinct.push(row.moneda);
  }
  for (const [code, distinct] of distinctByCode) {
    if (distinct.length > 1) {
      warnings.push(
        `codes:extract: codigo "${code}" descripcion distinta en ${fileLabel}: ` +
          `se conserva "${distinct[0]}"; tambien: ` +
          distinct
            .slice(1)
            .map((value) => `"${value}"`)
            .join(" | "),
      );
    }
  }

  return { values, warnings };
}
