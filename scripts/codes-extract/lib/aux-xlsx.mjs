import ExcelJS from "exceljs";

function fatal(message) {
  const error = new Error(message);
  error.codesExtractFatal = true;
  return error;
}

const HEADER_ROW = 1;
const FIRST_DATA_ROW = 2;
const LEVELS = [
  {
    key: "CodificacionUbicacion/Provincia",
    name: "Provincia",
    codeCols: [2],
    nameCol: 3,
    composite: false,
  },
  {
    key: "CodificacionUbicacion/Canton",
    name: "Cantón",
    codeCols: [2, 4],
    nameCol: 5,
    composite: false,
  },
  {
    key: "CodificacionUbicacion/Distrito",
    name: "Distrito",
    codeCols: [2, 4, 6],
    nameCol: 7,
    composite: false,
  },
  {
    key: "CodificacionUbicacion/Barrio",
    name: "Barrio o Poblado",
    codeCols: [2, 4, 6, 8],
    nameCol: 9,
    composite: true,
  },
];

function component(value, sheetName, row, label) {
  if (typeof value === "number") {
    if (!Number.isInteger(value)) {
      throw fatal(`${sheetName}: fila ${row}: código ${label} no entero: ${JSON.stringify(value)}`);
    }
    return String(value);
  }
  if (typeof value === "string") {
    if (value === "") {
      throw fatal(`${sheetName}: fila ${row}: código ${label} vacío`);
    }
    return value;
  }
  throw fatal(
    `${sheetName}: fila ${row}: código ${label} con tipo inesperado: ${JSON.stringify(value)}`,
  );
}

function description(value, sheetName, row, label) {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  throw fatal(
    `${sheetName}: fila ${row}: nombre ${label} con tipo inesperado: ${JSON.stringify(value)}`,
  );
}

function collapse(value) {
  return value.trim().replace(/\s+/g, " ");
}

/**
 * Reads the extracted .xlsx (single denormalized sheet: one row per barrio,
 * hierarchy code+name pairs in columns B..I, header labels in row 1) and
 * returns the four location tables as { key, name, values } with the flat
 * composite codes of D5b. Strict: unexpected structure is fatal.
 * Descriptions pass trim + internal whitespace collapse; dedupe keeps the
 * first non-empty description in row order (design D8).
 */
export async function readXlsx(xlsxPath) {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.readFile(xlsxPath);
  } catch (error) {
    throw fatal(`xlsx ilegible: ${error.message}`);
  }

  const sheets = workbook.worksheets;
  if (sheets.length !== 1) {
    throw fatal(
      `se esperaba una sola hoja y se encontraron ${sheets.length}: ` +
        sheets.map((w) => w.name).join(", "),
    );
  }
  const sheet = sheets[0];
  const sheetName = sheet.name;
  if (sheet.rowCount < FIRST_DATA_ROW) {
    throw fatal(`${sheetName}: sin filas de datos (rowCount=${sheet.rowCount})`);
  }

  for (const level of LEVELS) {
    const headerCol = level.codeCols.at(-1);
    const headerCell = sheet.getRow(HEADER_ROW).getCell(headerCol).value;
    if (headerCell !== level.name) {
      throw fatal(
        `${sheetName}: cabecera inesperada en columna ${headerCol}: ` +
          `${JSON.stringify(headerCell)} (esperado ${JSON.stringify(level.name)})`,
      );
    }
  }

  const tableValues = new Map(LEVELS.map((level) => [level.key, []]));
  const firstRowByKey = new Map();

  for (let row = FIRST_DATA_ROW; row <= sheet.rowCount; row++) {
    const cells = sheet.getRow(row);
    const components = LEVELS.map((level) =>
      level.codeCols.map((col, i) =>
        component(cells.getCell(col).value, sheetName, row, `${level.name}[col ${col}]`),
      ),
    );

    LEVELS.forEach((level, index) => {
      const code = components[index].join(".");
      const values = tableValues.get(level.key);
      const mapKey = `${level.key} ${code}`;

      if (level.composite && firstRowByKey.has(mapKey)) {
        throw fatal(
          `${sheetName}: código compuesto duplicado en ${level.key}: ${code} ` +
            `(filas ${firstRowByKey.get(mapKey)} y ${row})`,
        );
      }

      const raw = description(cells.getCell(level.nameCol).value, sheetName, row, level.name);
      const text = raw === undefined ? undefined : collapse(raw);
      const filled = text !== undefined && text !== "";

      const existing = values.find((v) => v.code === code);
      if (existing === undefined) {
        values.push(filled ? { code, description: text } : { code });
        firstRowByKey.set(mapKey, row);
      } else if (filled && existing.description === undefined) {
        existing.description = text;
      }
    });
  }

  return LEVELS.map((level) => ({
    key: level.key,
    name: level.name,
    values: tableValues.get(level.key),
  }));
}
