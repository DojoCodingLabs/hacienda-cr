/**
 * Coherent-reference rehearsal: generador de escenario FE → {NC, ND, FEC, MR}
 * con referencias coherentes por construcción y validador de grafo offline.
 *
 * Change OpenSpec `add-coherent-reference-rehearsal` (D1–D7 del design.md):
 * - El generador no inventa identidad: FE, secuencias, comprador del FEC,
 *   consecutivo del MR y razones de referencia son datos del caller (Task 1.1).
 * - NC/ND exigen evidencia ACCEPTED del original (Resolución art. 9) salvo
 *   `rehearsal: true` explícito (D5). El estado se declara con `estado` o se
 *   prueba con el `manifest.json` del runner de change 1 (`feRunDir`).
 * - MR se valida con regla propia (D1/D6/D7): `Clave` = clave del original,
 *   emisor/receptor del mensaje = los del original, plazo de 8 días hábiles
 *   (art. 10) y consecutivo 05/06/07 según Mensaje 1/2/3. Sin tabla de pares.
 * - REP queda fuera del change (sin binding `original`): el generador lo
 *   rechaza de forma fail-closed.
 * - Tabla D7 whitelist cerrada; par no listado ⇒ violación "par no cubierto".
 * - NC/ND/MR via builders exactos (binding `original`); el FEC exact
 *   (caseCode) solo admite TipoDocIR 06/07/14/99 y la compra respaldada por
 *   FE (par ("08","01")) va por el builder genérico `buildFacturaCompraXml`
 *   con referencia validada con `InformacionReferenciaSchema` (Task 0.6).
 *
 * Herramienta interna (`scripts/`, D4): sin API pública ni changeset. Sin red,
 * sin firma y sin credenciales: cada XML se valida contra el XSD vendido
 * 2026/v4.4 con `validateDocumentXml` (permite borradores sin firma). El
 * bundle firmado lo materializa el runner de `add-sandbox-evidence-bundle`.
 */
import {
  ExactFeInputSchema,
  ExactNcTotalInputSchema,
  ExactNdInputSchema,
  ExactRecipientMessageInputSchema,
  InformacionReferenciaSchema,
  DocumentTypeCode,
} from "../shared/dist/index.js";
import {
  DocumentType,
  Situation,
  buildClave,
  buildExactFacturaXml,
  buildExactNotaCreditoTotalXml,
  buildExactNotaDebitoXml,
  buildExactMensajeReceptorXml,
  buildFacturaCompraXml,
  calculateExactFe,
  checkBusinessDayDeadline,
  validateDocumentXml,
} from "../packages/sdk/dist/index.js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

/** Whitelist D7: pares `(tipoDocumento que referencia, TipoDocIR referenciado)`
 * → conjuntos de `Codigo` aceptados, sin `99`. NC usa 13–16 porque la
 * generación XSD activa es 2026 (Task 0.6). MR no aparece: regla propia. */
export const REFERENCE_PAIRS = new Map([
  ["03|01", ["01", "02", "13", "14", "15", "16"]],
  ["02|01", ["02"]],
  ["02|03", ["02"]],
  ["03|03", ["01", "02", "13", "14", "15", "16"]],
  ["08|01", ["04"]],
]);

/** Conjunto efectivo de códigos del par: whitelist ∪ {"99"} (D7). */
export function codigosEfectivos(par) {
  const base = REFERENCE_PAIRS.get(par);
  return base ? [...base, "99"] : null;
}

/** Único estado fiscal aceptable para NC/ND (Resolución art. 9). */
export const ACCEPTED_STATE = "ACCEPTED";

/** Marcador del MR en DocumentoInput: no tiene `tipoDocumento` propio en la
 * clave numérica; el validador lo identifica con `tipoDoc: "MR"` (no es un
 * código de comprobante; cualquier otro valor fuera de DocumentTypeCode
 * produce violación "tipo no real"). */
export const MR_TYPE = "MR";

/** Plazo del Mensaje Receptor (Resolución art. 10): 8 días hábiles desde el
 * primer día del mes siguiente a la emisión del original. Literal propio;
 * `DEFAULT_DEADLINE_BUSINESS_DAYS` del SDK es el plazo de presentación. */
export const MR_DEADLINE_BUSINESS_DAYS = 8;

const MR_KIND_BY_MESSAGE = { 1: "05", 2: "06", 3: "07" };

const DOCUMENT_TYPE_CODES = new Set(Object.values(DocumentTypeCode));

/** Consecutivo de 20 dígitos con los mismos segmentos que `buildClave` consume
 * (branch 3 + POS 5 + tipo 2 + secuencia 10). Sin inventar: reutiliza los
 * segmentos que el caller pasa (branch/pos ausentes usan el default `1` →
 * `00100001`, el mismo default determinista de `buildClave`). */
export function buildConsecutivo({ branch, pos, tipo, sequence }) {
  const branchPad = String(branch ?? "1").padStart(3, "0");
  const posPad = String(pos ?? "1").padStart(5, "0");
  const seqPad = String(sequence).padStart(10, "0");
  return branchPad + posPad + tipo + seqPad;
}

/** Clave 50 + consecutivo 20 de un dependiente, por construcción. */
function dependenterKeys(documentType, { fechaEmision, taxpayerId, sequence, branch, pos }) {
  const clave = buildClave({
    date: new Date(fechaEmision),
    taxpayerId: String(taxpayerId),
    branch: String(branch ?? "1"),
    pos: String(pos ?? "1"),
    documentType,
    sequence,
    situation: Situation.NORMAL,
  });
  const numeroConsecutivo = buildConsecutivo({ branch, pos, tipo: documentType, sequence });
  return { clave, numeroConsecutivo };
}

/** Primer día del mes siguiente al instante del original (art. 10). Se ancla
 * a mediodía UTC (aprox. ~06:00 Costa Rica) para no cruzar un borde de día
 * con el calendario hábil (rango fijo del SDK). */
function firstDayOfNextMonth(instant) {
  const base = new Date(instant);
  if (Number.isNaN(base.getTime())) return null;
  const shifted = new Date(base.getTime() + 6 * 3_600_000);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, 1, 12));
}

function instante(text) {
  const value = new Date(text);
  return Number.isNaN(value.getTime()) ? null : value.getTime();
}

/** Adaptador de issues Zod a violaciones (Task 2.1): documentoId = la clave
 * del documento que itera el validador; campo = issue.path.join(".")
 * || "(root)"; mensaje = issue.message. */
function zodViolaciones(documentoId, error) {
  return error.issues.map((issue) => ({
    documentoId,
    campo: issue.path.map(String).join(".") || "(root)",
    mensaje: issue.message,
  }));
}

function violacion(documentoId, campo, mensaje) {
  return { documentoId, campo, mensaje };
}

/** Emisor/receptor: acepta string o { numero } y extrae la cédula. */
function cedulaDe(party) {
  if (typeof party === "string") return party;
  if (party && typeof party === "object" && typeof party.numero === "string") return party.numero;
  return undefined;
}

/** Checks estructurales compartidos: `rehearsal` booleano obligatorio, sin
 * mezcla (D3), clave de 50 caracteres y tipo real. Devuelve violaciones
 * acumuladas (fail-closed: cualquier duda genera violación). */
function estructuralViolaciones(documentos) {
  const out = [];
  if (!Array.isArray(documentos) || documentos.length === 0) {
    out.push(violacion("(escenario)", "documentos", "se requiere un array de documentos no vacío"));
    return out;
  }
  for (const documento of documentos) {
    if (!documento || typeof documento !== "object") {
      out.push(violacion("(escenario)", "documentos", "cada documento debe ser un objeto"));
      continue;
    }
    const id = typeof documento.clave === "string" ? documento.clave : "(sin clave)";
    if (
      typeof documento.clave !== "string" ||
      documento.clave.length !== 50 ||
      !/^\d{9}[A-Za-z0-9]{12}\d{29}$/.test(documento.clave)
    ) {
      out.push(violacion(id, "clave", "clave de 50 caracteres con el layout oficial requerida"));
    }
    if (typeof documento.rehearsal !== "boolean") {
      out.push(
        violacion(
          id,
          "rehearsal",
          "`rehearsal` es booleano obligatorio (D3): true por documento en ensayo, false en escenario fiscal",
        ),
      );
    }
    if (
      documento.tipoDoc !== MR_TYPE &&
      (typeof documento.tipoDoc !== "string" || !DOCUMENT_TYPE_CODES.has(documento.tipoDoc))
    ) {
      out.push(
        violacion(
          id,
          "tipoDoc",
          `tipoDoc ${JSON.stringify(documento.tipoDoc)} no es un tipo de comprobante real del escenario (usar "MR" solo para Mensaje Receptor)`,
        ),
      );
    }
    if (documento.fechaEmision !== undefined && instante(documento.fechaEmision) === null) {
      out.push(violacion(id, "fechaEmision", "fechaEmision debe ser un instante ISO válido"));
    }
  }
  const banderas = new Set(
    documentos.filter((d) => d && typeof d.rehearsal === "boolean").map((d) => d.rehearsal),
  );
  if (banderas.size > 1) {
    out.push(
      violacion(
        "(escenario)",
        "rehearsal",
        "escenario mezcla rehearsal true/false (D3): el ensayo se propaga a todo el escenario",
      ),
    );
  }
  return out;
}

/** Regla propia del Mensaje Receptor (D1/D6/D7): sin tabla de pares. */
function mrViolaciones(documento, documentos) {
  const out = [];
  const id = documento.clave;
  for (const campo of ["mensaje", "numeroConsecutivoReceptor"]) {
    if (documento[campo] === undefined) {
      out.push(violacion(id, campo, "campo obligatorio de la regla propia del MR ausente"));
    }
  }
  const mensaje = documento.mensaje;
  if (typeof mensaje === "string" && !(mensaje in MR_KIND_BY_MESSAGE)) {
    out.push(violacion(id, "mensaje", `Mensaje debe ser 1/2/3, no ${JSON.stringify(mensaje)}`));
  }
  const consecutivo = documento.numeroConsecutivoReceptor;
  if (typeof consecutivo !== "string" || !/^\d{20}$/.test(consecutivo)) {
    out.push(
      violacion(
        id,
        "numeroConsecutivoReceptor",
        "NumeroConsecutivoReceptor debe ser un string de 20 dígitos",
      ),
    );
  } else if (
    typeof mensaje === "string" &&
    mensaje in MR_KIND_BY_MESSAGE &&
    consecutivo.slice(8, 10) !== MR_KIND_BY_MESSAGE[mensaje]
  ) {
    const kind = MR_KIND_BY_MESSAGE[mensaje];
    out.push(
      violacion(
        id,
        "numeroConsecutivoReceptor",
        `segmento tipo (posición 9-10) debe ser ${kind} para Mensaje ${mensaje} (05 aceptación total, 06 parcial, 07 rechazo)`,
      ),
    );
  }
  if (
    typeof consecutivo === "string" &&
    (/^0+$/.test(consecutivo.slice(0, 3)) ||
      /^0+$/.test(consecutivo.slice(3, 8)) ||
      /^0+$/.test(consecutivo.slice(10)))
  ) {
    out.push(
      violacion(
        id,
        "numeroConsecutivoReceptor",
        "branch / POS / secuencia del consecutivo del receptor no pueden ser todos cero",
      ),
    );
  }
  if ((mensaje === "2" || mensaje === "3") && documento.detalleMensaje === undefined) {
    out.push(
      violacion(
        id,
        "detalleMensaje",
        "Mensaje 2 (parcial) y 3 (rechazo) exigen DetalleMensaje (motivo real)",
      ),
    );
  }
  const original = documentos.find(
    (d) => d !== documento && d.clave === documento.clave && d.tipoDoc !== MR_TYPE,
  );
  if (!original) {
    out.push(violacion(id, "clave", "la Clave del MR no corresponde a un documento del escenario"));
    return out;
  }
  if (original.tipoDoc !== "01") {
    out.push(
      violacion(
        id,
        "clave",
        "el MR (caseCode MR-domestic-ordinary-fe-iva13-v1) solo referencia FE; el original del escenario es otro tipo",
      ),
    );
  }
  for (const [campoMensaje, campoOriginal, campoXml] of [
    ["emisor", "emisor", "NumeroCedulaEmisor"],
    ["receptor", "receptor", "NumeroCedulaReceptor"],
  ]) {
    const esperado = cedulaDe(original[campoOriginal]);
    const observado = cedulaDe(documento[campoMensaje]);
    if (esperado !== undefined && observado !== esperado) {
      out.push(
        violacion(
          id,
          campoMensaje,
          `${campoXml} del MR (${observado}) no coincide con el ${campoMensaje} del original (${esperado})`,
        ),
      );
    } else if (esperado === undefined) {
      out.push(violacion(id, campoMensaje, `${campoXml} del MR requerido (regla propia D7)`));
    }
  }
  const feInstante = instante(original.fechaEmision);
  const mrInstante = instante(documento.fechaEmision);
  if (feInstante === null || mrInstante === null) {
    out.push(
      violacion(
        id,
        "fechaEmision",
        "fechaEmision de la FE y del MR deben ser instantes ISO válidos para verificar el plazo",
      ),
    );
    return out;
  }
  if (mrInstante < feInstante) {
    out.push(
      violacion(
        id,
        "fechaEmision",
        "fechaEmisionDoc del MR es anterior a la emisión de la FE original",
      ),
    );
  }
  const inicioMes = firstDayOfNextMonth(original.fechaEmision);
  if (inicioMes) {
    const plazo = checkBusinessDayDeadline({
      businessDays: MR_DEADLINE_BUSINESS_DAYS,
      startDate: inicioMes,
      referenceDate: documento.fechaEmision,
    });
    if (plazo.expired) {
      out.push(
        violacion(
          id,
          "fechaEmision",
          `MR fuera del plazo de ${MR_DEADLINE_BUSINESS_DAYS} días hábiles desde el primer día del mes siguiente (Resolución art. 10)`,
        ),
      );
    }
  }
  return out;
}

/**
 * Validador de grafo (D2): dado un conjunto de documentos ya construidos
 * (claves y referencias) verifica la coherencia sin red ni firma.
 *
 * Entrada: `{ documentos: DocumentoInput[] }`, DocumentoInput =
 * `{ clave (50), tipoDoc (código real o "MR"), fechaEmision,
 * rehearsal (booleano OBLIGATORIO), emisor?, receptor?, estado?,
 * referencias?: InformacionReferencia-like[], mensaje?, numeroConsecutivoReceptor?,
 * detalleMensaje?, iva? }`. Pares fuera de la whitelist D7 ⇒ violación
 * "par no cubierto" (fail-closed; sin categoría "pendiente").
 *
 * Salida: `{ violaciones: Array<{ documentoId, campo, mensaje }> }`.
 */
export function validateScenario({ documentos } = {}) {
  const out = estructuralViolaciones(documentos);
  if (
    !Array.isArray(documentos) ||
    documentos.length === 0 ||
    documentos.some((d) => !d || typeof d !== "object")
  ) {
    return { violaciones: out };
  }
  const porClave = new Map();
  const mrRecords = [];
  for (const documento of documentos) {
    if (documento.tipoDoc === MR_TYPE) {
      mrRecords.push(documento);
    } else if (
      typeof documento.tipoDoc === "string" &&
      DOCUMENT_TYPE_CODES.has(documento.tipoDoc)
    ) {
      porClave.set(documento.clave, documento);
    }
    // tipos no reales: violación ya emitida por estructuralViolaciones
  }

  for (const documento of documentos) {
    if (documento.tipoDoc === MR_TYPE) continue;
    const refs = documento.referencias ?? [];
    if (
      ["02", "03", "08"].includes(documento.tipoDoc) &&
      (!Array.isArray(refs) || refs.length === 0)
    ) {
      out.push(
        violacion(
          documento.clave,
          "referencias",
          `un ${documento.tipoDoc} exige al menos una referencia coherente en el escenario`,
        ),
      );
      continue;
    }
    for (const referencia of Array.isArray(refs) ? refs : []) {
      const parsed = InformacionReferenciaSchema.safeParse(referencia);
      if (!parsed.success) {
        out.push(...zodViolaciones(documento.clave, parsed.error));
      }
      const referenciado = porClave.get(referencia?.numero);
      if (!referenciado) {
        out.push(
          violacion(
            documento.clave,
            "referencia.numero",
            `la clave ${JSON.stringify(referencia?.numero)} no existe en el escenario`,
          ),
        );
        continue;
      }
      if (referenciado === documento) {
        out.push(
          violacion(
            documento.clave,
            "referencia.numero",
            "un documento no puede autorreferenciarse",
          ),
        );
        continue;
      }
      const par = `${documento.tipoDoc}|${referencia.tipoDoc}`;
      const efectivo = codigosEfectivos(par);
      if (efectivo === null) {
        out.push(
          violacion(
            documento.clave,
            "referencia.tipoDoc",
            `par (${documento.tipoDoc}, ${referencia.tipoDoc}) no cubierto por la tabla D7`,
          ),
        );
        continue;
      }
      if (referencia.codigo === undefined) {
        out.push(
          violacion(
            documento.clave,
            "referencia.codigo",
            "codigo de referencia ausente: la tabla D7 exige código declarado",
          ),
        );
      } else if (!efectivo.includes(referencia.codigo)) {
        out.push(
          violacion(
            documento.clave,
            "referencia.codigo",
            `codigo ${JSON.stringify(referencia.codigo)} fuera del conjunto del par (${documento.tipoDoc}, ${referencia.tipoDoc}): {${efectivo.join(", ")}}`,
          ),
        );
      }
      if (referencia.fechaEmision !== referenciado.fechaEmision) {
        out.push(
          violacion(
            documento.clave,
            "referencia.fechaEmision",
            "fechaEmisionIR difiere de la fechaEmision del documento referenciado (coherencia por construcción)",
          ),
        );
      }
      const refInstante = instante(referenciado.fechaEmision);
      const docInstante = instante(documento.fechaEmision);
      if (refInstante !== null && docInstante !== null && refInstante > docInstante) {
        out.push(
          violacion(
            documento.clave,
            "fechaEmision",
            "la fechaEmision del documento que referencia es anterior a la del documento referenciado",
          ),
        );
      }
      // Resolución art. 9: NC/ND solo sobre comprobante válidamente emitido.
      if (
        (documento.tipoDoc === "02" || documento.tipoDoc === "03") &&
        documento.rehearsal === false
      ) {
        if (referenciado.estado === undefined) {
          out.push(
            violacion(
              documento.clave,
              "referencia.estado",
              "estado del original requerido (Resolución art. 9): NC/ND exige evidencia ACCEPTED; sin estado declarado es fail-closed",
            ),
          );
        } else if (referenciado.estado !== ACCEPTED_STATE) {
          out.push(
            violacion(
              documento.clave,
              "referencia.estado",
              `NC/ND exige comprobante original válidamente emitido (Resolución art. 9); estado declarado: ${JSON.stringify(referenciado.estado)}`,
            ),
          );
        }
      }
    }
  }
  for (const mr of mrRecords) out.push(...mrViolaciones(mr, documentos));
  return { violaciones: out };
}

// ---------------------------------------------------------------------------
// Generador
// ---------------------------------------------------------------------------

function requerido(campo) {
  if (campo === undefined) {
    throw new Error(
      "generateScenario: la identidad/narrativa del dependiente es dato del caller y no puede faltar (Task 1.1)",
    );
  }
  return campo;
}

/** Construye la entrada exact del NC y su registro de grafo. */
function construirNc(feParsed, seg) {
  requerido(seg);
  const fechaEmision = requerido(seg.fechaEmision);
  const sequence = requerido(seg.sequence);
  const razon = requerido(seg.razon);
  const keys = dependenterKeys(DocumentType.NOTA_CREDITO_ELECTRONICA, {
    fechaEmision,
    taxpayerId: feParsed.emisor.identificacion.numero,
    sequence,
    branch: seg.branch,
    pos: seg.pos,
  });
  const reference = {
    tipoDoc: "01",
    numero: feParsed.clave,
    fechaEmision: feParsed.fechaEmision,
    codigo: "01",
    razon,
  };
  const exactInput = {
    caseCode: "NC-domestic-ordinary-fe-total-iva13-v1",
    original: feParsed,
    clave: keys.clave,
    numeroConsecutivo: keys.numeroConsecutivo,
    fechaEmision,
    informacionReferencia: [reference],
  };
  ExactNcTotalInputSchema.parse(exactInput);
  return {
    dir: keys.clave,
    tipoDoc: "03",
    builder: buildExactNotaCreditoTotalXml,
    exactInput,
    registro: {
      clave: keys.clave,
      tipoDoc: "03",
      fechaEmision,
      emisor: feParsed.emisor.identificacion.numero,
      receptor: feParsed.receptor.identificacion.numero,
      referencias: [reference],
    },
  };
}

/** Construye la entrada exact del ND y su registro de grafo. */
function construirNd(feParsed, seg) {
  requerido(seg);
  const fechaEmision = requerido(seg.fechaEmision);
  const sequence = requerido(seg.sequence);
  const razon = requerido(seg.razon);
  const keys = dependenterKeys(DocumentType.NOTA_DEBITO_ELECTRONICA, {
    fechaEmision,
    taxpayerId: feParsed.emisor.identificacion.numero,
    sequence,
    branch: seg.branch,
    pos: seg.pos,
  });
  const adjustments =
    seg.adjustments ??
    feParsed.detalleServicio.map((line) => ({
      originalLineNumber: line.numeroLinea,
      line,
    }));
  const medioPago = seg.medioPago ?? feParsed.medioPago;
  const reference = {
    tipoDoc: "01",
    numero: feParsed.clave,
    fechaEmision: feParsed.fechaEmision,
    codigo: "02",
    razon,
  };
  const exactInput = {
    caseCode: "ND-domestic-ordinary-fe-increment-iva13-v1",
    original: feParsed,
    clave: keys.clave,
    numeroConsecutivo: keys.numeroConsecutivo,
    fechaEmision,
    adjustments,
    medioPago,
    informacionReferencia: [reference],
  };
  ExactNdInputSchema.parse(exactInput);
  return {
    dir: keys.clave,
    tipoDoc: "02",
    builder: buildExactNotaDebitoXml,
    exactInput,
    registro: {
      clave: keys.clave,
      tipoDoc: "02",
      fechaEmision,
      emisor: feParsed.emisor.identificacion.numero,
      receptor: feParsed.receptor.identificacion.numero,
      referencias: [reference],
    },
  };
}

/** Construye la entrada exact del MR y su registro de grafo. El builder exact
 * deriva `Clave`, `NumeroCedulaEmisor` y `NumeroCedulaReceptor` desde
 * `original` (coherencia por construcción). */
function construirMr(feParsed, seg) {
  requerido(seg);
  const fechaEmisionDoc = requerido(seg.fechaEmisionDoc);
  const mensaje = requerido(seg.mensaje);
  const consecutivo = requerido(seg.numeroConsecutivoReceptor);
  const exactInput = {
    caseCode: "MR-domestic-ordinary-fe-iva13-v1",
    original: feParsed,
    fechaEmisionDoc,
    mensaje,
    numeroConsecutivoReceptor: consecutivo,
    ...(seg.detalleMensaje !== undefined ? { detalleMensaje: seg.detalleMensaje } : {}),
    ...(seg.iva !== undefined ? { iva: seg.iva } : {}),
  };
  ExactRecipientMessageInputSchema.parse(exactInput);
  return {
    dir: `MensajeReceptor-${consecutivo}`,
    tipoDoc: MR_TYPE,
    builder: buildExactMensajeReceptorXml,
    exactInput,
    registro: {
      clave: feParsed.clave,
      tipoDoc: MR_TYPE,
      fechaEmision: fechaEmisionDoc,
      mensaje,
      numeroConsecutivoReceptor: consecutivo,
      ...(seg.detalleMensaje !== undefined ? { detalleMensaje: seg.detalleMensaje } : {}),
      emisor: feParsed.emisor.identificacion.numero,
      receptor: feParsed.receptor.identificacion.numero,
    },
  };
}

/** Construye el cuerpo genérico del FEC (compra respaldada por la FE del
 * proveedor) y su registro de grafo. Convención del repo (document-identity,
 * "08"): el comprador firma la FEC y aparece como XML Receptor y en la clave;
 * el proveedor de la FE queda como XML Emisor. Los montos se reutilizan del
 * cálculo exacto de la FE; el generador no inventa deducciones. */
function construirFec(feParsed, seg) {
  requerido(seg);
  const comprador = requerido(seg.comprador);
  if (
    !comprador.identificacion ||
    comprador.identificacion.tipo === undefined ||
    comprador.identificacion.numero === undefined
  ) {
    throw new Error(
      "fec.comprador.identificacion (tipo/numero) requerido: el generador no inventa identidad del comprador",
    );
  }
  if (comprador.ubicacion === undefined) {
    throw new Error(
      "fec.comprador.ubicacion requerida (el Receptor/comprador es quien emite la FEC y el XSD exige posición)",
    );
  }
  const fechaEmision = requerido(seg.fechaEmision);
  const sequence = requerido(seg.sequence);
  const razon = requerido(seg.razon);
  const proveedorSistemas = requerido(seg.proveedorSistemas);
  const keys = dependenterKeys(DocumentType.FACTURA_ELECTRONICA_COMPRA, {
    fechaEmision,
    taxpayerId: comprador.identificacion.numero,
    sequence,
    branch: seg.branch,
    pos: seg.pos,
  });
  if (seg.clave !== undefined || seg.numeroConsecutivo !== undefined) {
    throw new Error(
      "FEC: no proveer `clave`/`numeroConsecutivo` — el generador los construye con la identidad del comprador (coherencia por construcción, spec «FEC con emisor comprador»)",
    );
  }
  const reference = {
    tipoDoc: "01",
    numero: feParsed.clave,
    fechaEmision: feParsed.fechaEmision,
    codigo: "04",
    razon,
  };
  InformacionReferenciaSchema.parse(reference);
  const condicionVenta = seg.condicionVenta ?? feParsed.condicionVenta;
  if (!["01", "02"].includes(condicionVenta)) {
    throw new Error(
      `la pata FEC solo genera condicionVenta 01/02; la FE tiene ${JSON.stringify(condicionVenta)} y el caller no declaró un condicionVenta propio del FEC`,
    );
  }
  const plazoCredito = seg.plazoCredito ?? feParsed.plazoCredito;
  // Convención del repo (src/xml/document-identity.ts, "08"): quien genera y
  // firma la FEC es su COMPRADOR, portado en el XML Receptor y en el segmento
  // contribuyente de la clave; el Emisor del XML es el proveedor (la FE
  // original). Igual que el fixture exact-FEC (emisor = original.emisor).
  const codigoActividadEmisor = seg.codigoActividadEmisor ?? feParsed.codigoActividadEmisor;
  if (!codigoActividadEmisor) {
    throw new Error("fec.codigoActividadEmisor requerido (actividad del XML Emisor = proveedor)");
  }
  const codigoActividadReceptor = requerido(
    seg.codigoActividadReceptor ?? comprador.codigoActividad,
  );
  const calculated = calculateExactFe(feParsed);
  const detalleServicio = seg.detalleServicio ?? calculated.detalleServicio;
  const resumenFactura = seg.resumenFactura ?? calculated.resumenFactura;
  const mensaje = {
    clave: keys.clave,
    proveedorSistemas,
    codigoActividadEmisor,
    codigoActividadReceptor,
    numeroConsecutivo: keys.numeroConsecutivo,
    fechaEmision,
    emisor: {
      nombre: feParsed.emisor.nombre,
      ...(feParsed.emisor.nombreComercial !== undefined
        ? { nombreComercial: feParsed.emisor.nombreComercial }
        : {}),
      identificacion: { ...feParsed.emisor.identificacion },
      ubicacion: { ...feParsed.emisor.ubicacion },
      ...(feParsed.emisor.telefono !== undefined
        ? { telefono: { ...feParsed.emisor.telefono } }
        : {}),
      ...(typeof feParsed.emisor.correoElectronico === "string"
        ? { correoElectronico: feParsed.emisor.correoElectronico }
        : Array.isArray(feParsed.emisor.correoElectronico)
          ? { correoElectronico: feParsed.emisor.correoElectronico[0] }
          : {}),
    },
    receptor: {
      nombre: comprador.nombre,
      ...(comprador.nombreComercial !== undefined
        ? { nombreComercial: comprador.nombreComercial }
        : {}),
      identificacion: { ...comprador.identificacion },
      ubicacion: { ...comprador.ubicacion },
      ...(comprador.telefono !== undefined ? { telefono: { ...comprador.telefono } } : {}),
      ...(typeof comprador.correoElectronico === "string"
        ? { correoElectronico: comprador.correoElectronico }
        : Array.isArray(comprador.correoElectronico)
          ? { correoElectronico: comprador.correoElectronico[0] }
          : {}),
    },
    condicionVenta,
    ...(plazoCredito !== undefined ? { plazoCredito } : {}),
    detalleServicio,
    resumenFactura,
    informacionReferencia: [reference],
  };
  return {
    dir: keys.clave,
    tipoDoc: "08",
    builder: buildFacturaCompraXml,
    genericInput: mensaje,
    registro: {
      clave: keys.clave,
      tipoDoc: "08",
      fechaEmision,
      emisor: comprador.identificacion.numero,
      receptor: feParsed.emisor.identificacion.numero,
      referencias: [reference],
    },
  };
}

/**
 * Generador de escenario (Tasks 1.1–1.8). Sin red, sin firma; falla ANTES de
 * escribir cualquier archivo si hay violación (parse exacto, coherencia del
 * grafo o conformance XSD). Está esperando `await` por `validateDocumentXml`.
 *
 * Entrada:
 * {
 *   rehearsal: boolean,               // OBLIGATORIO (D3)
 *   fe: ExactFeInput,                 // FE con clave real (caller)
 *   outDir: string,                   // destino del escenario
 *   estado?: "ACCEPTED" | ...,        // fuente explícita del estado (D5)
 *   feRunDir?: string,                // dir con manifest.json de change 1
 *   dependientes?: {
 *     nc?:  { fechaEmision, sequence, razon, branch?, pos? },
 *     nd?:  { fechaEmision, sequence, razon, adjustments?, medioPago?, branch?, pos? },
 *     fec?: { fechaEmision, sequence, razon, comprador, proveedorSistemas,
 *             condicionVenta?, plazoCredito?, detalleServicio?, resumenFactura?,
 *             codigoActividadEmisor?, codigoActividadReceptor?, medioPago?, branch?, pos? },
 *     mr?:  { mensaje, numeroConsecutivoReceptor, fechaEmisionDoc, detalleMensaje?, iva? },
 *   }
 * }
 *
 * Cada documento queda en `<outDir>/<identidad-de-documento>/` con
 * `documento.exact.json`, `unsigned.xml` y `rehearsal.json` cuando el
 * escenario es de ensayo (D3). El MR usa `<outDir>/MensajeReceptor-<consecutivo>/`.
 */
export async function generateScenario(input) {
  if (!input || typeof input !== "object") {
    throw new Error("generateScenario: objeto de entrada requerido");
  }
  const { rehearsal, fe, dependientes = {}, estado, feRunDir, outDir } = input;
  if (typeof rehearsal !== "boolean") {
    throw new Error(
      "generateScenario: `rehearsal` es booleano obligatorio (D3): true ensaya toda la cadena, false es escenario fiscal",
    );
  }
  if (!outDir || typeof outDir !== "string") {
    throw new Error(
      "generateScenario: `outDir` es requerido (los archivos se escriben solo tras validar todo el escenario)",
    );
  }
  if (dependientes.rep !== undefined) {
    throw new Error(
      "REP fuera de este change: no existe binding `original` (add-coherent-reference-rehearsal Non-Goal)",
    );
  }
  if (!fe || typeof fe !== "object") {
    throw new Error(
      "generateScenario: `fe` (ExactFeInput con clave real) es requerido — identidad, actividad, proveedor de sistemas, receptor, CABYS, montos y condición de venta los provee el caller (Task 1.1)",
    );
  }
  let feParsed;
  try {
    feParsed = ExactFeInputSchema.parse(fe);
  } catch (error) {
    if (error?.issues?.length) {
      throw new Error(
        `generateScenario: FE inválida — ${JSON.stringify(zodViolaciones("[fe]", error))}`,
      );
    }
    throw error;
  }

  const requiereGate = dependientes.nc !== undefined || dependientes.nd !== undefined;
  let estadoResolved = estado;
  if (requiereGate && rehearsal === false) {
    // D5: la fuente del estado es explícita en la invocación (Resolución art. 9).
    if (estadoResolved === ACCEPTED_STATE) {
      estadoResolved = ACCEPTED_STATE;
    } else if (estadoResolved !== undefined) {
      throw new Error(
        `Resolución art. 9: NC/ND solo sobre comprobante válidamente emitido; estado declarado para la FE es ${JSON.stringify(estadoResolved)}`,
      );
    } else if (typeof feRunDir === "string" && feRunDir.length > 0) {
      let manifest;
      try {
        manifest = JSON.parse(await readFile(join(feRunDir, "manifest.json"), "utf8"));
      } catch {
        throw new Error(
          "FE pre-change-1 sin manifest: usar `estado` explícito para construcciones offline, o re-ejecutar la FE con el runner de add-sandbox-evidence-bundle para obtener manifest.json",
        );
      }
      if (manifest?.outcome?.class !== ACCEPTED_STATE) {
        throw new Error(
          `Resolución art. 9: NC/ND solo sobre comprobante válidamente emitido; el manifest de la FE declara outcome.class=${JSON.stringify(manifest?.outcome?.class ?? null)}`,
        );
      }
      estadoResolved = ACCEPTED_STATE;
    } else {
      throw new Error(
        "Fuente del estado de la FE no declarada (D5): pasar `estado` explícito o `feRunDir` con el manifest.json de add-sandbox-evidence-bundle",
      );
    }
  }

  const piezas = [];
  const escenario = [];
  const feRegistro = {
    clave: feParsed.clave,
    tipoDoc: "01",
    fechaEmision: feParsed.fechaEmision,
    emisor: feParsed.emisor.identificacion.numero,
    receptor: feParsed.receptor.identificacion.numero,
    rehearsal,
  };
  if (estadoResolved !== undefined) feRegistro.estado = estadoResolved;
  escenario.push(feRegistro);

  if (dependientes.nc) {
    const pieza = construirNc(feParsed, dependientes.nc);
    pieza.registro.rehearsal = rehearsal;
    if (estadoResolved !== undefined) pieza.registro.estado = estadoResolved;
    piezas.push(pieza);
    escenario.push(pieza.registro);
  }
  if (dependientes.nd) {
    const pieza = construirNd(feParsed, dependientes.nd);
    pieza.registro.rehearsal = rehearsal;
    if (estadoResolved !== undefined) pieza.registro.estado = estadoResolved;
    piezas.push(pieza);
    escenario.push(pieza.registro);
  }
  if (dependientes.fec) {
    const pieza = construirFec(feParsed, dependientes.fec);
    pieza.registro.rehearsal = rehearsal;
    piezas.push(pieza);
    escenario.push(pieza.registro);
  }
  if (dependientes.mr) {
    const pieza = construirMr(feParsed, dependientes.mr);
    pieza.registro.rehearsal = rehearsal;
    piezas.push(pieza);
    escenario.push(pieza.registro);
  }

  // Materialización de la FE raíz junto a sus dependientes: toda la cadena
  // coherente queda re-auditable offline (Task 1.2).
  const fePieza = {
    dir: feParsed.clave,
    tipoDoc: "01",
    builder: buildExactFacturaXml,
    exactInput: feParsed,
  };
  const documentos = [];
  const xmls = [];
  for (const pieza of [fePieza, ...piezas]) {
    const xml = pieza.builder(pieza.exactInput ?? pieza.genericInput);
    xmls.push(xml);
    documentos.push({ ...pieza, xml });
  }
  for (const documento of documentos) {
    const veredicto = await validateDocumentXml(documento.xml);
    if (!veredicto.valid) {
      throw new Error(
        `generateScenario: XML del ${documento.tipoDoc} (${documento.dir}) no conforma el XSD vendido 2026/v4.4: ${JSON.stringify(veredicto.issues)}`,
      );
    }
  }
  const veredictoEscenario = validateScenario({ documentos: escenario });
  if (veredictoEscenario.violaciones.length > 0) {
    throw new Error(
      `generateScenario: coherencia de grafo violada — ${JSON.stringify(veredictoEscenario.violaciones)}`,
    );
  }

  // Escritura recién aquí: nada queda en el disco si algo falló (fail antes
  // de escribir un archivo, sin bundles parciales).
  await mkdir(outDir, { recursive: true });
  const escrituras = [];
  for (const documento of documentos) {
    const dir = join(outDir, documento.dir);
    await mkdir(dir, { recursive: true });
    if (rehearsal) {
      escrituras.push(
        writeFile(join(dir, "rehearsal.json"), `${JSON.stringify({ rehearsal: true })}\n`, "utf8"),
      );
    }
    escrituras.push(
      writeFile(
        join(dir, "documento.exact.json"),
        `${JSON.stringify({ clave: documento.dir, tipoDoc: documento.tipoDoc, input: documento.exactInput ?? documento.genericInput }, null, 2)}\n`,
        "utf8",
      ),
    );
    escrituras.push(writeFile(join(dir, "unsigned.xml"), documento.xml, "utf8"));
  }
  await Promise.all(escrituras);

  return {
    outDir,
    rehearsal,
    ...(estadoResolved !== undefined ? { estado: estadoResolved } : {}),
    fe: { clave: feParsed.clave, tipoDoc: "01" },
    documentos: documentos.map(({ dir, tipoDoc, xml }) => ({
      dir,
      tipoDoc,
      xmlBytes: Buffer.byteLength(xml, "utf8"),
    })),
    violaciones: veredictoEscenario.violaciones,
  };
}
