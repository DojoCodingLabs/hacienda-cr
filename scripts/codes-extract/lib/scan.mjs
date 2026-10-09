const ENTITY_RE = /&(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);/g;
const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decodeEntities(text) {
  return text.replace(ENTITY_RE, (match, name) => {
    if (name.startsWith("#x") || name.startsWith("#X")) {
      return String.fromCodePoint(Number.parseInt(name.slice(2), 16));
    }
    if (name.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(name.slice(1), 10));
    }
    return ENTITIES[name];
  });
}

function normalizeDescription(text) {
  return decodeEntities(text).trim().replace(/\s+/g, " ");
}

function fail(message) {
  const error = new Error(message);
  error.codesExtractFatal = true;
  throw error;
}

function localName(tag) {
  const colon = tag.indexOf(":");
  return colon === -1 ? tag : tag.slice(colon + 1);
}

function parseAttrs(raw) {
  const attrs = new Map();
  const re = /([^\s=]+)\s*=\s*"([^"]*)"/g;
  let match;
  while ((match = re.exec(raw)) !== null) {
    attrs.set(match[1], match[2]);
  }
  return attrs;
}

/** Yield { kind, name?, attrs?, selfClose?, close? } for each markup construct. */
function* tokenize(content) {
  let i = 0;
  const n = content.length;
  while (i < n) {
    const lt = content.indexOf("<", i);
    if (lt === -1) {
      if (i < n) yield { kind: "text", start: i, end: n };
      return;
    }
    if (lt > i) yield { kind: "text", start: i, end: lt };
    if (content.startsWith("<!--", lt)) {
      const end = content.indexOf("-->", lt + 4);
      if (end === -1) fail("comentario XML sin cerrar");
      i = end + 3;
      continue;
    }
    if (content.startsWith("<?", lt)) {
      const end = content.indexOf("?>", lt + 2);
      if (end === -1) fail("PI XML sin cerrar");
      i = end + 2;
      continue;
    }
    if (content.startsWith("<![", lt)) {
      const end = content.indexOf("]]>", lt + 3);
      if (end === -1) fail("CDATA sin cerrar");
      i = end + 3;
      continue;
    }
    // real tag: scan to unquoted >
    let j = lt + 1;
    let quote = null;
    while (j < n) {
      const ch = content[j];
      if (quote) {
        if (ch === quote) quote = null;
      } else if (ch === '"' || ch === "'") {
        quote = ch;
      } else if (ch === ">") {
        break;
      }
      j += 1;
    }
    if (j >= n) fail("etiqueta XML sin cerrar");
    const inner = content.slice(lt + 1, j);
    const selfClose = inner.endsWith("/");
    const body = selfClose ? inner.slice(0, -1) : inner;
    const isClose = body.startsWith("/");
    const trimmed = isClose ? body.slice(1) : body;
    const nameMatch = trimmed.match(/^\s*([^\s]+)/);
    if (!nameMatch) fail(`etiqueta inválida en posición ${lt}`);
    const name = nameMatch[1];
    const rawAttrs = trimmed.slice(nameMatch[0].length);
    yield {
      kind: isClose ? "close" : "open",
      name,
      attrs: parseAttrs(rawAttrs),
      selfClose,
      start: lt,
      end: j + 1,
    };
    i = j + 1;
  }
}

/**
 * Scan one XSD document. Returns { tables, warnings }.
 * tables: [{ key, kind, name, description?, sources: [relPath], values: [{code, description?}] }]
 * Attribute `value` is kept raw (no entity decode); descriptions are
 * entity-decoded, trimmed, and whitespace-collapsed.
 */
export function scanXsd(content, relPath) {
  const tables = [];
  const warnings = [];
  const stack = [];
  /** Named ancestors that give an anonymous simpleType its identity:
   *  xs:element and xs:complexType with a name. */
  const pathStack = [];
  const elementDocs = new Map();
  let rootElementCount = 0;
  let docTarget = null;
  let docStart = -1;
  let sawUnion = false;

  const flushDocumentation = (rawText) => {
    if (!docTarget) return;
    const description = normalizeDescription(rawText);
    if (!description) return;
    if (docTarget.kind === "enumeration") {
      if (docTarget.enumeration.description === undefined) {
        docTarget.enumeration.description = description;
      }
    } else if (docTarget.kind === "table") {
      if (docTarget.table.description === undefined) {
        docTarget.table.description = description;
      }
    } else if (docTarget.kind === "element") {
      const key = docTarget.pathKey;
      if (!elementDocs.has(key)) {
        elementDocs.set(key, description);
      }
    }
  };

  for (const token of tokenize(content)) {
    if (token.kind === "text") continue;

    const local = localName(token.name);

    if (token.kind === "close" && local === "documentation" && docTarget) {
      flushDocumentation(content.slice(docStart, token.start));
      docTarget = null;
      docStart = -1;
      const open = stack.pop();
      if (!open || open.local !== "documentation") {
        fail(`${relPath}: etiqueta de cierre </${token.name}> sin apertura correspondiente`);
      }
      continue;
    }

    if (token.kind === "close") {
      const open = stack.pop();
      if (!open || open.local !== local) {
        fail(`${relPath}: etiqueta de cierre </${token.name}> sin apertura correspondiente`);
      }
      if (local === "element" || local === "complexType") {
        if (open.pathPushed) pathStack.pop();
      }
      continue;
    }

    if (local === "union") sawUnion = true;

    if (local === "documentation") {
      let parent = null;
      for (let i = stack.length - 1; i >= 0; i -= 1) {
        const frame = stack[i];
        if (frame.local === "annotation") continue;
        parent = frame;
        break;
      }
      if (parent?.local === "element" && parent.name) {
        docTarget = { kind: "element", name: parent.name, pathKey: pathStack.join("/") };
      } else if (parent?.local === "enumeration" && parent.enumeration) {
        docTarget = { kind: "enumeration", enumeration: parent.enumeration };
      } else if (parent?.local === "simpleType" && parent.table) {
        docTarget = { kind: "table", table: parent.table };
      } else {
        docTarget = { kind: "text" };
      }
      if (token.selfClose) {
        flushDocumentation("");
        docTarget = null;
        docStart = -1;
      } else {
        stack.push({ local });
        docStart = token.end;
      }
      continue;
    }

    if (local === "element") {
      const name = token.attrs.get("name") ?? null;
      if (name !== null && pathStack.length === 0) rootElementCount += 1;
      let pathPushed = false;
      if (name !== null) {
        pathStack.push(name);
        pathPushed = true;
      } else if (token.attrs.get("ref") === null) {
        fail(`${relPath}: xs:element sin name ni ref`);
      }
      if (token.selfClose) {
        if (pathPushed) pathStack.pop();
      } else {
        stack.push({ local, name, pathPushed });
      }
      continue;
    }

    if (local === "complexType") {
      const name = token.attrs.get("name") ?? null;
      let pathPushed = false;
      if (name !== null) {
        pathStack.push(name);
        pathPushed = true;
      }
      if (!token.selfClose) stack.push({ local, pathPushed });
      continue;
    }

    if (local === "simpleType") {
      const name = token.attrs.get("name") ?? null;
      let table = null;
      if (name !== null) {
        // named simpleType nested inside an element is not one of the two forms
        const insideElement = stack.some((f) => f.local === "element");
        if (insideElement) {
          fail(`${relPath}: forma no soportada (xs:simpleType con name dentro de xs:element)`);
        }
        table = {
          key: name,
          kind: "named-simple-type",
          name,
          description: undefined,
          sources: [relPath],
          values: [],
        };
        tables.push(table);
      } else if (pathStack.length > 0) {
        table = {
          key: pathStack.join("/"),
          kind: "element-anonymous",
          name: pathStack[pathStack.length - 1],
          description: elementDocs.get(pathStack.join("/")),
          sources: [relPath],
          values: [],
        };
        tables.push(table);
      } else {
        fail(`${relPath}: xs:simpleType anónimo fuera de xs:element`);
      }
      if (!token.selfClose) stack.push({ local, table });
      continue;
    }

    if (local === "enumeration") {
      const code = token.attrs.get("value") ?? null;
      if (code === null) fail(`${relPath}: xs:enumeration sin atributo value`);
      let table = null;
      for (let i = stack.length - 1; i >= 0; i -= 1) {
        if (stack[i].local === "simpleType" && stack[i].table) {
          table = stack[i].table;
          break;
        }
      }
      if (!table) fail(`${relPath}: xs:enumeration fuera de xs:simpleType`);
      const enumeration = { code, description: undefined };
      table.values.push(enumeration);
      if (!token.selfClose) stack.push({ local, enumeration });
      continue;
    }

    if (!token.selfClose) stack.push({ local });
  }

  if (sawUnion) fail(`${relPath}: forma no soportada (xs:union)`);
  if (rootElementCount === 0) {
    fail(`${relPath}: sin ningún xs:element de primer nivel`);
  }

  // keep only tables that actually declare enumerations
  const withValues = [];
  for (const table of tables) {
    if (table.description === undefined) delete table.description;
    for (const value of table.values) {
      if (value.description === undefined) delete value.description;
    }
    if (table.values.length > 0) withValues.push(table);
  }

  return { tables: withValues, warnings };
}
