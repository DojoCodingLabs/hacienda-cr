/**
 * Tests de `coherent-reference-rehearsal.mjs` (change add-coherent-reference-rehearsal).
 * Todo offline: sin red, sin firma, sin credenciales; archivos únicamente en
 * directorios temporales bajo /tmp/opencode.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  generateScenario,
  validateScenario,
  buildConsecutivo,
  ACCEPTED_STATE,
  MR_TYPE,
  REFERENCE_PAIRS,
  codigosEfectivos,
} from "./coherent-reference-rehearsal.mjs";
import { buildClave } from "../packages/sdk/dist/index.js";

// ---------------------------------------------------------------------------
// Fixtures sintéticos (sin datos reales; identidad de prueba del repo)
// ---------------------------------------------------------------------------

const FE_FECHA = "2026-01-15T10:00:00-06:00";
const FE_CLAVE = buildClave({
  date: new Date(FE_FECHA),
  taxpayerId: "3101234567",
  branch: "1",
  pos: "1",
  documentType: "01",
  sequence: 1,
  situation: "1",
});

function feInput(condicionVenta = "01") {
  return {
    caseCode: "FE-domestic-ordinary-iva13-v1",
    clave: FE_CLAVE,
    numeroConsecutivo: buildConsecutivo({ branch: "1", pos: "1", tipo: "01", sequence: 1 }),
    fechaEmision: FE_FECHA,
    proveedorSistemas: "3101234567",
    codigoActividadEmisor: "620100",
    emisor: {
      nombre: "Empresa Test S.A.",
      identificacion: { tipo: "02", numero: "3101234567" },
      nombreComercial: "TestCorp",
      ubicacion: {
        provincia: "1",
        canton: "01",
        distrito: "01",
        barrio: "Barrio El Carmen",
        otrasSenas: "100m norte del parque central",
      },
      telefono: { codigoPais: "506", numTelefono: "22223333" },
      correoElectronico: "facturacion@testcorp.cr",
    },
    receptor: {
      nombre: "Cliente Ejemplo S.R.L.",
      identificacion: { tipo: "02", numero: "3109876543" },
      correoElectronico: "compras@clienteejemplo.cr",
    },
    condicionVenta,
    ...(condicionVenta === "02" || condicionVenta === "10" ? { plazoCredito: "5" } : {}),
    detalleServicio: [
      {
        numeroLinea: 1,
        codigoCabys: "8310100000000",
        cantidad: "1",
        unidadMedida: "Sp",
        detalle: "Servicio sintetico & anulacion",
        precioUnitario: "100",
        esServicio: true,
        impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: "13" }],
      },
    ],
    codigoTipoMoneda: { codigoMoneda: "CRC", tipoCambio: "1" },
    medioPago: [{ tipoMedioPago: "01", totalMedioPago: "113" }],
  };
}

function dependientesCompletos() {
  return {
    nc: {
      fechaEmision: "2026-01-16T09:00:00-06:00",
      sequence: 2,
      razon: "Anulacion total solicitada",
    },
    nd: {
      fechaEmision: "2026-01-16T10:00:00-06:00",
      sequence: 3,
      razon: "Incremento de monto solicitado",
      adjustments: [
        {
          originalLineNumber: 1,
          line: { ...feInput().detalleServicio[0], precioUnitario: "10.00001" },
        },
      ],
      medioPago: [{ tipoMedioPago: "01", totalMedioPago: "11.30001" }],
    },
    fec: {
      fechaEmision: "2026-01-16T11:00:00-06:00",
      sequence: 4,
      razon: "Respaldo real de la compra sintetica",
      proveedorSistemas: "3109876543",
      codigoActividadReceptor: "620100",
      comprador: {
        nombre: "Cliente Ejemplo S.R.L.",
        identificacion: { tipo: "02", numero: "3109876543" },
        ubicacion: {
          provincia: "1",
          canton: "01",
          distrito: "01",
          otrasSenas: "Direccion sintetica de la compradora",
        },
        correoElectronico: "compras@clienteejemplo.cr",
      },
    },
    mr: {
      mensaje: "1",
      numeroConsecutivoReceptor: buildConsecutivo({
        branch: "1",
        pos: "1",
        tipo: "05",
        sequence: 1,
      }),
      fechaEmisionDoc: "2026-02-10T09:00:00-06:00",
    },
  };
}

async function tempDir() {
  const preferred = "/tmp/opencode";
  let base = preferred;
  try {
    await mkdir(preferred, { recursive: true });
  } catch {
    base = tmpdir();
  }
  return mkdtemp(join(base, "hacienda-rehearsal-"));
}

/** Registro válido del grafo (FE + NC), para mutar por caso. */
function registrosBase({ rehearsal = true, estado } = {}) {
  const fechaNc = "2026-01-16T09:00:00-06:00";
  const ncClave = buildClave({
    date: new Date(fechaNc),
    taxpayerId: "3101234567",
    branch: "1",
    pos: "1",
    documentType: "03",
    sequence: 2,
    situation: "1",
  });
  const fe = {
    clave: FE_CLAVE,
    tipoDoc: "01",
    fechaEmision: FE_FECHA,
    emisor: "3101234567",
    receptor: "3109876543",
    rehearsal,
    ...(estado !== undefined ? { estado } : {}),
  };
  const nc = {
    clave: ncClave,
    tipoDoc: "03",
    fechaEmision: fechaNc,
    emisor: "3101234567",
    receptor: "3109876543",
    rehearsal,
    referencias: [
      {
        tipoDoc: "01",
        numero: FE_CLAVE,
        fechaEmision: FE_FECHA,
        codigo: "01",
        razon: "Anulacion total solicitada",
      },
    ],
  };
  return [fe, nc];
}

// ---------------------------------------------------------------------------

test("5.1 genera el escenario de ensayo completo (FE+NC+ND+FEC+MR) sin violaciones", async () => {
  const outDir = await tempDir();
  const scenarioDir = join(outDir, "full");
  const result = await generateScenario({
    rehearsal: true,
    fe: feInput(),
    outDir: scenarioDir,
    dependientes: dependientesCompletos(),
  });
  assert.deepEqual(result.violaciones, []);
  assert.equal(result.rehearsal, true);

  // El MR usa su propio nombre de directorio; los demás, su clave.
  const mrDir = `MensajeReceptor-${buildConsecutivo({ branch: "1", pos: "1", tipo: "05", sequence: 1 })}`;
  for (const dir of [
    FE_CLAVE,
    ...result.documentos.filter((d) => d.tipoDoc !== MR_TYPE).map((d) => d.dir),
    mrDir,
  ]) {
    assert.ok(existsSync(join(scenarioDir, dir, "documento.exact.json")), `exact: ${dir}`);
    assert.ok(existsSync(join(scenarioDir, dir, "unsigned.xml")), `xml: ${dir}`);
    assert.ok(existsSync(join(scenarioDir, dir, "rehearsal.json")), `rehearsal: ${dir}`);
    const exact = JSON.parse(
      await readFile(join(scenarioDir, dir, "documento.exact.json"), "utf8"),
    );
    assert.equal(exact.clave, dir);
  }
  const tipos = result.documentos.map((d) => d.tipoDoc).sort();
  assert.deepEqual(tipos, ["01", "02", "03", "08", MR_TYPE]);
});

test("5.1 contenido XML: referencias coherentes por construcción", async () => {
  const scenarioDir = join(await tempDir(), "xml");
  const result = await generateScenario({
    rehearsal: true,
    fe: feInput(),
    outDir: scenarioDir,
    dependientes: dependientesCompletos(),
  });
  const leerXml = async (tipoDoc) => {
    const dir = result.documentos.find((d) => d.tipoDoc === tipoDoc).dir;
    return readFile(join(scenarioDir, dir, "unsigned.xml"), "utf8");
  };

  // FEC: referencia la FE con TipoDocIR 01 / Numero = clave FE / Codigo 04.
  const fec = await leerXml("08");
  assert.ok(fec.includes("<TipoDocIR>01</TipoDocIR>"));
  assert.ok(fec.includes(`<Numero>${FE_CLAVE}</Numero>`));
  assert.ok(fec.includes("<Codigo>04</Codigo>"));
  // La clave del FEC lleva el segmento contribuyente del comprador (Receptor);
  // los 8 dígitos de seguridad son aleatorios, se comprueba por patrón.
  assert.ok(/<Clave>506160126003109876543001000010800000000041\d{8}<\/Clave>/.test(fec));

  // NC: referencia la FE con Codigo 01 (anulación); ND: Codigo 02 (monto).
  const nc = await leerXml("03");
  assert.ok(nc.includes("<TipoDocIR>01</TipoDocIR>"));
  assert.ok(nc.includes(`<Numero>${FE_CLAVE}</Numero>`));
  assert.ok(nc.includes("<Codigo>01</Codigo>"));
  const nd = await leerXml("02");
  assert.ok(nd.includes("<Codigo>02</Codigo>"));
  assert.ok(nd.includes(`<Numero>${FE_CLAVE}</Numero>`));

  // MR: Clave = clave del original, cédulas derivadas del original.
  const mr = await leerXml(MR_TYPE);
  assert.ok(mr.includes(`<Clave>${FE_CLAVE}</Clave>`));
  assert.ok(mr.includes("<NumeroCedulaEmisor>3101234567</NumeroCedulaEmisor>"));
  assert.ok(mr.includes("<NumeroCedulaReceptor>3109876543</NumeroCedulaReceptor>"));
  assert.ok(
    mr.includes(
      `<NumeroConsecutivoReceptor>${buildConsecutivo({ branch: "1", pos: "1", tipo: "05", sequence: 1 })}</NumeroConsecutivoReceptor>`,
    ),
  );
});

// ---------------------------------------------------------------------------

test("5.2 tablas D7: whitelist cerrada y conjunto efectivo con 99", () => {
  assert.deepEqual([...REFERENCE_PAIRS.keys()].sort(), [
    "02|01",
    "02|03",
    "03|01",
    "03|03",
    "08|01",
  ]);
  assert.deepEqual(codigosEfectivos("03|01"), ["01", "02", "13", "14", "15", "16", "99"]);
  assert.deepEqual(codigosEfectivos("08|01"), ["04", "99"]);
  assert.equal(codigosEfectivos("09|01"), null);
});

test("5.2 valida grafo coherente sin violaciones", () => {
  const { violaciones } = validateScenario({ documentos: registrosBase() });
  assert.deepEqual(violaciones, []);
});

test("5.2 rechaza numero de referencia inexistente en el escenario", () => {
  const registros = registrosBase();
  // Usar una clave sintética que garantiza no existir en el escenario,
  // independiente del código de seguridad aleatorio de FE_CLAVE (que podría
  // terminar en "9" y hacer la mutación un no-op).
  registros[1].referencias[0].numero = "9".repeat(50);
  const { violaciones } = validateScenario({ documentos: registros });
  assert.ok(violaciones.some((v) => /no existe en el escenario/.test(v.mensaje)));
});

test("5.2 rechaza fechaEmisionIR incoherente con el referenciado", () => {
  const registros = registrosBase();
  registros[1].referencias[0].fechaEmision = "2026-01-16T09:00:00-06:00";
  const { violaciones } = validateScenario({ documentos: registros });
  assert.ok(violaciones.some((v) => /fechaEmisionIR difiere/.test(v.mensaje)));
});

test("5.2 rechaza codigo fuera del conjunto del par D7", () => {
  const registros = registrosBase();
  registros[1].referencias[0].codigo = "05";
  const { violaciones } = validateScenario({ documentos: registros });
  assert.ok(violaciones.some((v) => /fuera del conjunto/.test(v.mensaje)));
});

test("5.2 fail-closed: codigo ausente, autorreferencia, par no cubierto", () => {
  const sinCodigo = registrosBase();
  delete sinCodigo[1].referencias[0].codigo;
  assert.ok(
    validateScenario({ documentos: sinCodigo }).violaciones.some((v) =>
      /codigo de referencia ausente/.test(v.mensaje),
    ),
  );

  const egocentrico = registrosBase();
  egocentrico[1].referencias[0].numero = egocentrico[1].clave;
  assert.ok(
    validateScenario({ documentos: egocentrico }).violaciones.some((v) =>
      /autorreferenciarse/.test(v.mensaje),
    ),
  );

  const parRaro = registrosBase();
  parRaro[1].referencias[0].tipoDoc = "04";
  assert.ok(
    validateScenario({ documentos: parRaro }).violaciones.some((v) =>
      /no cubierto por la tabla D7/.test(v.mensaje),
    ),
  );
});

test("5.2 fail-closed: rehearsal obligatorio y sin mezcla (D3)", () => {
  const puros = registrosBase({ rehearsal: true });
  delete puros[1].rehearsal;
  const { violaciones } = validateScenario({ documentos: puros });
  assert.ok(violaciones.some((v) => v.campo === "rehearsal"));

  const mezclados = registrosBase({ rehearsal: true });
  mezclados[0].rehearsal = false; // mezcla true/false en el mismo escenario
  assert.ok(
    validateScenario({ documentos: mezclados }).violaciones.some((v) =>
      /mezcla rehearsal/.test(v.mensaje),
    ),
  );
});

test("5.2 Resolución art. 9: NC fiscal exige estado ACCEPTED del original", () => {
  const sinEstado = registrosBase({ rehearsal: false });
  const sinEstadoResultado = validateScenario({ documentos: sinEstado });
  assert.ok(
    sinEstadoResultado.violaciones.some(
      (v) => /Resolución art\. 9/.test(v.mensaje) && v.campo === "referencia.estado",
    ),
  );

  const rechazado = registrosBase({ rehearsal: false, estado: "REJECTED" });
  assert.ok(
    validateScenario({ documentos: rechazado }).violaciones.some((v) =>
      /Resolución art\. 9/.test(v.mensaje),
    ),
  );

  const aceptado = registrosBase({ rehearsal: false, estado: ACCEPTED_STATE });
  assert.deepEqual(validateScenario({ documentos: aceptado }).violaciones, []);
});

// ---------------------------------------------------------------------------

test("5.3 generador fail-closed: estado REJECTED viola Resolución art. 9 y no escribe nada", async () => {
  const outDir = await tempDir();
  const scenarioDir = join(outDir, "no-debe-existir");
  await assert.rejects(
    generateScenario({
      rehearsal: false,
      fe: feInput(),
      outDir: scenarioDir,
      estado: "REJECTED",
      dependientes: { nc: dependientesCompletos().nc },
    }),
    /Resolución art\. 9/,
  );
  assert.equal(existsSync(scenarioDir), false);
});

test("5.3 generador fail-closed: sin fuente de estado declarada (D5)", async () => {
  await assert.rejects(
    generateScenario({
      rehearsal: false,
      fe: feInput(),
      outDir: join(await tempDir(), "x"),
      dependientes: { nc: dependientesCompletos().nc },
    }),
    /Fuente del estado/,
  );
});

test("5.3 generador fail-closed: manifest de la FE no ACCEPTED (change 1)", async () => {
  const feRunDir = await tempDir();
  await writeFile(
    join(feRunDir, "manifest.json"),
    JSON.stringify({ outcome: { class: "REJECTED" } }),
  );
  await assert.rejects(
    generateScenario({
      rehearsal: false,
      fe: feInput(),
      outDir: join(await tempDir(), "x"),
      feRunDir,
      dependientes: { nc: dependientesCompletos().nc },
    }),
    /Resolución art\. 9/,
  );
});

test("5.3 escenario fiscal (rehearsal false) con estado ACCEPTED: ok y sin rehearsal.json", async () => {
  const scenarioDir = join(await tempDir(), "fiscal");
  const feRunDir = await tempDir();
  await writeFile(
    join(feRunDir, "manifest.json"),
    JSON.stringify({ outcome: { class: ACCEPTED_STATE } }),
  );
  const result = await generateScenario({
    rehearsal: false,
    fe: feInput(),
    outDir: scenarioDir,
    feRunDir,
    dependientes: { nc: dependientesCompletos().nc },
  });
  assert.deepEqual(result.violaciones, []);
  assert.equal(result.estado, ACCEPTED_STATE);
  const dirFiscal = result.documentos[0].dir;
  assert.ok(existsSync(join(scenarioDir, dirFiscal, "unsigned.xml")));
  assert.equal(existsSync(join(scenarioDir, dirFiscal, "rehearsal.json")), false);
});

test("5.3 REP fuera del change: fail-closed", async () => {
  await assert.rejects(
    generateScenario({
      rehearsal: true,
      fe: feInput(),
      outDir: join(await tempDir(), "x"),
      dependientes: { rep: {} },
    }),
    /REP fuera de este change/,
  );
});

test("5.3 FEC con condicionVenta de crédito (10) heredada falla; propia 01 pasa", async () => {
  const feCredito = feInput("10");
  const seg = dependientesCompletos().fec;
  await assert.rejects(
    generateScenario({
      rehearsal: true,
      fe: feCredito,
      outDir: join(await tempDir(), "x"),
      dependientes: { fec: seg },
    }),
    /la pata FEC solo genera condicionVenta 01\/02/,
  );

  const scenarioDir = join(await tempDir(), "fec-01");
  const result = await generateScenario({
    rehearsal: true,
    fe: feCredito,
    outDir: scenarioDir,
    dependientes: { fec: { ...seg, condicionVenta: "01" } },
  });
  assert.deepEqual(result.violaciones, []);
});

// ---------------------------------------------------------------------------

function registrosMr(fechaMr, extras = {}) {
  const [fe] = registrosBase();
  const mr = {
    clave: FE_CLAVE,
    tipoDoc: MR_TYPE,
    fechaEmision: fechaMr,
    rehearsal: true,
    emisor: "3101234567",
    receptor: "3109876543",
    mensaje: "1",
    numeroConsecutivoReceptor: buildConsecutivo({ branch: "1", pos: "1", tipo: "05", sequence: 1 }),
    ...extras,
  };
  return [fe, mr];
}

test("5.3 MR plazo art. 10: 8 días hábiles desde el primer día del mes siguiente", () => {
  const tardio = validateScenario({ documentos: registrosMr("2026-03-25T09:00:00-06:00") });
  assert.ok(tardio.violaciones.some((v) => /Resolución art\. 10/.test(v.mensaje)));

  const puntual = validateScenario({ documentos: registrosMr("2026-02-10T09:00:00-06:00") });
  assert.deepEqual(puntual.violaciones, []);

  const antes = validateScenario({ documentos: registrosMr("2026-01-14T09:00:00-06:00") });
  assert.ok(
    antes.violaciones.some((v) => /anterior a la emisión de la FE original/.test(v.mensaje)),
  );
});

test("5.3 regla propia del MR: consecutivo y detalle", () => {
  const tipoIncorrecto = registrosMr("2026-02-10T09:00:00-06:00", {
    mensaje: "2",
    detalleMensaje: "acepto parcial",
  });
  tipoIncorrecto[1].numeroConsecutivoReceptor = buildConsecutivo({
    branch: "1",
    pos: "1",
    tipo: "05",
    sequence: 1,
  });
  assert.ok(
    validateScenario({ documentos: tipoIncorrecto }).violaciones.some((v) =>
      /segmento tipo \(posición 9-10\) debe ser 06/.test(v.mensaje),
    ),
  );

  const consecutivoCero = registrosMr("2026-02-10T09:00:00-06:00");
  consecutivoCero[1].numeroConsecutivoReceptor = "00000000050000000001";
  assert.ok(
    validateScenario({ documentos: consecutivoCero }).violaciones.some((v) =>
      /no pueden ser todos cero/.test(v.mensaje),
    ),
  );

  const sinDetalle = registrosMr("2026-02-10T09:00:00-06:00", { mensaje: "2" });
  assert.ok(
    validateScenario({ documentos: sinDetalle }).violaciones.some((v) =>
      /exigen DetalleMensaje/.test(v.mensaje),
    ),
  );

  const claveAjena = registrosMr("2026-02-10T09:00:00-06:00");
  claveAjena[1].clave = buildClave({
    date: new Date(FE_FECHA),
    taxpayerId: "3109876543",
    branch: "1",
    pos: "1",
    documentType: "01",
    sequence: 9,
    situation: "1",
  });
  assert.ok(
    validateScenario({ documentos: claveAjena }).violaciones.some((v) =>
      /no corresponde a un documento del escenario/.test(v.mensaje),
    ),
  );
});

// ---------------------------------------------------------------------------

test("5.2 clave estructural: layout oficial exigido", () => {
  const registros = registrosBase();
  registros[1].clave = FE_CLAVE.slice(0, 49) + "x";
  const { violaciones } = validateScenario({ documentos: registros });
  assert.ok(violaciones.some((v) => v.campo === "clave"));
});
