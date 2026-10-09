/** Merge per-file tables into the final codes.json document. */
export function mergeTables(fileResults) {
  const byKey = new Map();
  const warnings = [];

  for (const { relPath, tables } of fileResults) {
    for (const table of tables) {
      let target = byKey.get(table.key);
      if (!target) {
        target = {
          key: table.key,
          kind: table.kind,
          name: table.name,
          description: table.description,
          sources: [relPath],
          values: table.values.map((v) => ({ ...v })),
          _codeIndex: new Map(table.values.map((v, i) => [v.code, i])),
        };
        byKey.set(table.key, target);
        continue;
      }

      if (target.kind !== table.kind || target.name !== table.name) {
        const error = new Error(
          `colisión de claves: ${table.key} con identidad distinta entre ${target.sources[0]} y ${relPath}`,
        );
        error.codesExtractFatal = true;
        throw error;
      }

      const incomingCodes = new Set(table.values.map((v) => v.code));
      const existingCodes = new Set(target._codeIndex.keys());
      const missingInIncoming = [...existingCodes].filter((c) => !incomingCodes.has(c));
      const missingInExisting = [...incomingCodes].filter((c) => !existingCodes.has(c));
      if (missingInIncoming.length > 0 || missingInExisting.length > 0) {
        const error = new Error(
          `clave ${table.key}: conjuntos de códigos distintos entre ${target.sources[0]} y ${relPath}` +
            (missingInIncoming.length
              ? ` (solo en primero: ${missingInIncoming.join(", ")})`
              : "") +
            (missingInExisting.length ? ` (solo en segundo: ${missingInExisting.join(", ")})` : ""),
        );
        error.codesExtractFatal = true;
        throw error;
      }

      target.sources.push(relPath);

      for (const value of table.values) {
        const existing = target.values[target._codeIndex.get(value.code)];
        if (existing.description !== value.description) {
          warnings.push(
            `codes:extract: codigo "${value.code}" descripcion distinta entre ${target.sources[0]} y ${relPath}`,
          );
        }
      }
    }
  }

  const tables = [...byKey.values()]
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
    .map(({ key, kind, name, description, sources, values }) => {
      const table = { key, kind, name };
      if (description !== undefined) table.description = description;
      table.sources = sources;
      table.values = values;
      return table;
    });

  return { tables, warnings };
}

export function renderCodesJson({ currentSet, generatedFrom, tables }) {
  const doc = {
    schemaVersion: 1,
    currentSet,
    generatedFrom,
    tables,
  };
  return `${JSON.stringify(doc, null, 2)}\n`;
}
