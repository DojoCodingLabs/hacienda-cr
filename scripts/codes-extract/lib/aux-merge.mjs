/**
 * Auxiliary authority merge (design D5): resolve raw auxiliary reader
 * output to destination keys, then merge against the XSD tables. The XSD
 * set fixes the code list of shared keys; the auxiliary only supplies
 * descriptions. Divergences are warnings on stderr (exit 0), never
 * failures: only structural problems throw with `codesExtractFatal`.
 */

function fatal(message) {
  const error = new Error(message);
  error.codesExtractFatal = true;
  return error;
}

function collapse(text) {
  return text.trim().replace(/\s+/g, " ");
}

const MONEDA_SEGMENT = "CodigoMoneda";

/**
 * Normalize raw reader output into merge-ready auxiliary tables.
 *
 * - ANEXOS tables with an explicit `tableKey` (note 3) are auxiliary-only.
 * - ANEXOS tables with `segments` fan out to every XSD table whose last
 *   key segment equals a segment exactly (design D6). A segment without
 *   any XSD destination is fatal (the note no longer matches the set).
 * - The moneda values fan out to the `CodigoMoneda` segment.
 * - The ubicacion tables are auxiliary-only with their xlsx names.
 *
 * Returns `{ key, source, name?, values }[]` in fixed auxiliary order:
 * ANEXOS → Codigodemoneda → Codificacionubicacion (design D7).
 */
export function buildAuxTables({ xsTables, anexos, moneda, ubicacion, paths }) {
  const bySegment = new Map();
  for (const table of xsTables) {
    const segment = table.key.split("/").at(-1);
    const keys = bySegment.get(segment);
    if (keys) keys.push(table.key);
    else bySegment.set(segment, [table.key]);
  }

  const targetsFor = (note, segments) => {
    const keys = [];
    for (const segment of segments) {
      const found = bySegment.get(segment);
      if (!found || found.length === 0) {
        throw fatal(`nota ${note}: sin claves XSD destino para el segmento "${segment}"`);
      }
      for (const key of found) if (!keys.includes(key)) keys.push(key);
    }
    return keys;
  };

  const auxTables = [];

  for (const table of anexos.tables) {
    if (table.tableKey) {
      if (!table.name) {
        throw fatal(`nota ${table.note}: tabla ${table.tableKey} sin nombre`);
      }
      auxTables.push({
        key: table.tableKey,
        source: paths.anexos,
        name: table.name,
        values: table.values,
      });
      continue;
    }
    for (const key of targetsFor(table.note, table.segments)) {
      auxTables.push({ key, source: paths.anexos, values: table.values });
    }
  }

  const monedaKeys = targetsFor("13.1", [MONEDA_SEGMENT]);
  for (const key of monedaKeys) {
    auxTables.push({ key, source: paths.moneda, values: moneda.values });
  }

  for (const table of ubicacion) {
    auxTables.push({
      key: table.key,
      source: paths.ubicacion,
      name: table.name,
      values: table.values,
    });
  }

  return auxTables;
}

/**
 * Merge auxiliary tables into the XSD tables (design D5, spec "Reglas de
 * autoridad"): shared keys keep the XSD code set; an auxiliary code absent
 * from the XSD is discarded with a warning; an XSD code absent from the
 * auxiliary is fine; an auxiliary description fills an undocumented XSD
 * value; a differing description keeps the XSD one with a warning.
 *
 * Auxiliary-only keys become `kind: "aux-table"` with a single table
 * source and no per-value `sources[]`. Shared ("fused") tables keep
 * per-value `sources[]`: every XSD file of the table, plus each auxiliary
 * file that contributed the description of that code.
 *
 * Returns `{ tables, warnings }` with tables sorted by key.
 */
export function mergeAuxiliary({ xsTables, auxTables }) {
  const warnings = [];
  const entries = new Map();

  for (const table of xsTables) {
    entries.set(table.key, {
      table: {
        key: table.key,
        kind: table.kind,
        name: table.name,
        ...(table.description !== undefined ? { description: table.description } : {}),
        sources: [...table.sources],
        values: table.values.map((value) => ({ ...value })),
      },
      xsSources: [...table.sources],
      valueAux: new Map(),
      fused: false,
    });
  }

  for (const aux of auxTables) {
    const entry = entries.get(aux.key);
    if (!entry) {
      if (!aux.name) throw fatal(`tabla auxiliar ${aux.key}: sin nombre`);
      entries.set(aux.key, {
        table: {
          key: aux.key,
          kind: "aux-table",
          name: aux.name,
          sources: [aux.source],
          values: aux.values.map((value) => ({ ...value })),
        },
        xsSources: null,
        valueAux: null,
        fused: false,
      });
      continue;
    }
    if (entry.xsSources === null) {
      throw fatal(`tabla auxiliar ${aux.key}: mas de una fuente auxiliar`);
    }

    entry.fused = true;
    const index = new Map(entry.table.values.map((value, i) => [value.code, i]));
    for (const value of aux.values) {
      const at = index.get(value.code);
      if (at === undefined) {
        warnings.push(
          `codes:extract: clave ${aux.key}: codigo "${value.code}" solo en ${aux.source} descartado`,
        );
        continue;
      }
      const target = entry.table.values[at];
      const xsDescription = target.description ? collapse(target.description) : "";
      const auxDescription = value.description ? collapse(value.description) : "";
      if (xsDescription === "") {
        if (auxDescription !== "") {
          target.description = auxDescription;
          const contributed = entry.valueAux.get(value.code);
          if (contributed) contributed.push(aux.source);
          else entry.valueAux.set(value.code, [aux.source]);
        }
      } else if (auxDescription !== "") {
        if (xsDescription !== auxDescription) {
          warnings.push(
            `codes:extract: codigo "${value.code}" descripcion distinta entre ` +
              `${entry.xsSources[0]} y ${aux.source}: se conserva ` +
              `"${target.description}"; auxiliar: "${value.description}"`,
          );
        } else {
          const contributed = entry.valueAux.get(value.code);
          if (contributed) contributed.push(aux.source);
          else entry.valueAux.set(value.code, [aux.source]);
        }
      }
    }
    entry.table.sources.push(aux.source);
  }

  for (const entry of entries.values()) {
    if (!entry.fused) continue;
    for (const value of entry.table.values) {
      const contributed = entry.valueAux.get(value.code);
      value.sources = [...entry.xsSources, ...(contributed ?? [])];
    }
  }

  const tables = [...entries.values()]
    .map((entry) => entry.table)
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

  return { tables, warnings };
}
