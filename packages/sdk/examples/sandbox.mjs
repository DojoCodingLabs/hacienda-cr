// Run from the repository after pnpm build, or copy into an ESM project
// with @dojocoding/hacienda-sdk installed. Always targets sandbox.
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import {
  ApiError,
  buildClave,
  buildFacturaXml,
  calculateLineItemTotals,
  calculateInvoiceSummary,
  DocumentType,
  Environment,
  getEnvironmentConfig,
  getNextSequence,
  getStatus,
  HttpClient,
  loadCredentials,
  signXml,
  Situation,
  submitAndWait,
  TokenManager,
  validateDocumentXml,
  validateFacturaInput,
} from "@dojocoding/hacienda-sdk";

const [command, input, destination, ...extra] = process.argv.slice(2);
const usage =
  "Usage: node sandbox.mjs prepare <order.json> <new-directory> | submit <directory> | status <directory>";

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} before submitting or querying status.`);
  return value;
}

async function saveJson(directory, name, value) {
  await writeFile(join(directory, name), JSON.stringify(value, null, 2) + "\n", {
    mode: 0o600,
    flag: "wx",
  });
}

async function validateInvoice(invoice) {
  const validation = validateFacturaInput(invoice);
  if (!validation.valid) throw new Error(JSON.stringify(validation.errors));
  const xml = buildFacturaXml(invoice);
  const schema = await validateDocumentXml(xml);
  if (!schema.valid) throw new Error(schema.issues.join("; "));
  return xml;
}

async function authenticatedClient(issuer) {
  const envConfig = getEnvironmentConfig(Environment.Sandbox);
  const tokenManager = new TokenManager({ envConfig });
  await tokenManager.authenticate(
    loadCredentials({
      idType: issuer.tipo,
      idNumber: issuer.numero,
      password: requiredEnv("HACIENDA_PASSWORD"),
    }),
  );
  // SDK 0.4.0 never automatically retries POST. GET retains bounded retries.
  return new HttpClient({ envConfig, tokenManager });
}

async function readJson(directory, name) {
  return JSON.parse(await readFile(join(directory, name), "utf8"));
}

async function optionalJson(directory, name) {
  try {
    return await readJson(directory, name);
  } catch (error) {
    if (error.code === "ENOENT") return undefined;
    throw error;
  }
}

function checkFields(value, allowed, path) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${path} must be an object.`);
  }
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      throw new Error(
        `${path}.${key} is not supported by this simplified example. Adapt the SDK mapping explicitly before using this field.`,
      );
    }
  }
}

function checkOrder(order) {
  checkFields(
    order,
    [
      "proveedorSistemas",
      "codigoActividadEmisor",
      "codigoActividadReceptor",
      "emisor",
      "receptor",
      "condicionVenta",
      "condicionVentaOtros",
      "plazoCredito",
      "medioPago",
      "medioPagoOtros",
      "lineItems",
      "informacionReferencia",
      "otros",
    ],
    "order",
  );
  if (!Array.isArray(order.lineItems) || order.lineItems.length === 0) {
    throw new Error("order.lineItems must contain at least one item.");
  }
  order.lineItems.forEach((item, index) => {
    const path = `order.lineItems.${index}`;
    checkFields(
      item,
      [
        "codigoCabys",
        "codigoComercial",
        "cantidad",
        "unidadMedida",
        "detalle",
        "precioUnitario",
        "descuento",
        "impuesto",
        "esServicio",
      ],
      path,
    );
    if (item.esServicio !== undefined && typeof item.esServicio !== "boolean") {
      throw new Error(`${path}.esServicio must be a boolean.`);
    }
    if (item.impuesto !== undefined) {
      if (!Array.isArray(item.impuesto)) throw new Error(`${path}.impuesto must be an array.`);
      item.impuesto.forEach((tax, taxIndex) => {
        const taxPath = `${path}.impuesto.${taxIndex}`;
        checkFields(tax, ["codigo", "codigoTarifaIVA", "tarifa", "exoneracion"], taxPath);
        if (tax.codigo !== "01")
          throw new Error(`${taxPath}.codigo must be 01 (ordinary IVA) in this example.`);
        if (tax.exoneracion !== undefined) {
          checkFields(
            tax.exoneracion,
            [
              "tipoDocumento",
              "numeroDocumento",
              "nombreInstitucion",
              "fechaEmision",
              "tarifaExonerada",
            ],
            `${taxPath}.exoneracion`,
          );
        }
      });
    }
  });
}

async function hasFile(directory, name) {
  try {
    await stat(join(directory, name));
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

function checkStatusIdentity(status, clave) {
  if (status.clave !== clave) throw new Error("Status response does not match the saved clave.");
}

async function main() {
  if (!input || extra.length || !["prepare", "submit", "status"].includes(command)) {
    throw new Error(usage);
  }
  if ((command === "prepare") !== Boolean(destination)) throw new Error(usage);

  if (command === "prepare") {
    const order = JSON.parse(await readFile(resolve(input), "utf8"));
    // Reject unsupported fields before calculation can silently discard them.
    checkOrder(order);
    const items = order.lineItems.map((item, index) =>
      calculateLineItemTotals({ ...item, numeroLinea: index + 1 }),
    );
    const date = new Date();
    const branch = "001";
    const pos = "00001";
    const documentType = DocumentType.FACTURA_ELECTRONICA;
    const issuer = order.emisor?.identificacion;
    if (!issuer || !/^0[1-4]$/.test(issuer.tipo) || !/^\d{9,12}$/.test(issuer.numero)) {
      throw new Error("Provide a valid issuer identification (type 01–04, number 9–12 digits).");
    }
    const directory = resolve(destination);
    // Exclusive directory creation prevents replacing a previously prepared invoice.
    await mkdir(directory, { mode: 0o700 });
    const sequence = await getNextSequence(documentType, branch, pos, {
      configDir: resolve(".sandbox-sequences", `${issuer.tipo}-${issuer.numero}`),
    });
    const { lineItems: _lineItems, medioPago, medioPagoOtros, ...data } = order;
    const summary = calculateInvoiceSummary(items);
    const invoice = {
      ...data,
      clave: buildClave({
        date,
        taxpayerId: issuer.numero,
        branch,
        pos,
        documentType,
        sequence,
        situation: Situation.NORMAL,
      }),
      numeroConsecutivo: `${branch}${pos}${documentType}${String(sequence).padStart(10, "0")}`,
      fechaEmision: date.toISOString(),
      detalleServicio: items,
      resumenFactura: {
        ...summary,
        medioPago: [
          {
            tipoMedioPago: medioPago,
            ...(medioPagoOtros ? { medioPagoOtros } : {}),
            totalMedioPago: summary.totalComprobante,
          },
        ],
      },
    };
    const xml = await validateInvoice(invoice);
    await saveJson(directory, "invoice.json", invoice);
    await writeFile(join(directory, "unsigned.xml"), xml, { mode: 0o600, flag: "wx" });
    console.log(
      `Prepared ${invoice.clave} in ${directory}; total ${invoice.resumenFactura.totalComprobante} CRC. No network requests made.`,
    );
    return;
  }

  const directory = resolve(input);
  const savedRequest = await optionalJson(directory, "request.json");
  if (command === "status") {
    // Recover from the request snapshot even if the original draft was edited.
    const invoice = savedRequest ? undefined : await readJson(directory, "invoice.json");
    const clave = savedRequest?.clave ?? invoice.clave;
    const issuer = savedRequest
      ? {
          tipo: savedRequest.emisor.tipoIdentificacion,
          numero: savedRequest.emisor.numeroIdentificacion,
        }
      : invoice.emisor.identificacion;
    const httpClient = await authenticatedClient(issuer);
    const status = await getStatus(httpClient, clave);
    checkStatusIdentity(status, clave);
    // Refresh status without replacing the original submission result.
    await writeFile(join(directory, "status.json"), JSON.stringify(status, null, 2) + "\n", {
      mode: 0o600,
    });
    console.log(`${clave}: ${status.status}. Saved status.json.`);
    return;
  }
  if (
    savedRequest ||
    (await hasFile(directory, "attempt.json")) ||
    (await hasFile(directory, "signed.xml"))
  ) {
    throw new Error(
      "A submission snapshot already exists. Run status with the same directory; do not submit again.",
    );
  }
  const invoice = await readJson(directory, "invoice.json");
  const xml = await validateInvoice(invoice);
  if (xml !== (await readFile(join(directory, "unsigned.xml"), "utf8"))) {
    throw new Error(
      "The invoice changed after preparation. Preserve this run and prepare the corrected input in a new directory before sending.",
    );
  }
  const httpClient = await authenticatedClient(invoice.emisor.identificacion);

  const p12 = await readFile(requiredEnv("HACIENDA_P12_PATH"));
  const signedXml = await signXml(xml, p12, requiredEnv("HACIENDA_P12_PIN"));
  const schema = await validateDocumentXml(signedXml, { requireSignature: true });
  if (!schema.valid) throw new Error(schema.issues.join("; "));
  const request = {
    clave: invoice.clave,
    fecha: invoice.fechaEmision,
    emisor: {
      tipoIdentificacion: invoice.emisor.identificacion.tipo,
      numeroIdentificacion: invoice.emisor.identificacion.numero,
    },
    ...(invoice.receptor.identificacion
      ? {
          receptor: {
            tipoIdentificacion: invoice.receptor.identificacion.tipo,
            numeroIdentificacion: invoice.receptor.identificacion.numero,
          },
        }
      : {}),
    comprobanteXml: Buffer.from(signedXml).toString("base64"),
  };
  await writeFile(join(directory, "signed.xml"), signedXml, { mode: 0o600, flag: "wx" });
  await saveJson(directory, "request.json", request);
  // An attempt marker survives timeouts/crashes and blocks a second submit run.
  await saveJson(directory, "attempt.json", {
    clave: invoice.clave,
    startedAt: new Date().toISOString(),
  });
  try {
    const result = await submitAndWait(httpClient, request, {
      onPoll: (status) => {
        checkStatusIdentity(status, request.clave);
        console.log(`Processing: ${status.status}`);
      },
    });
    await saveJson(directory, "result.json", result);
    console.log(`${result.clave}: ${result.status}. ${result.rejectionReason ?? ""}`);
    if (!result.accepted) process.exitCode = 1;
  } catch (error) {
    console.error(
      `Submission outcome needs review for ${invoice.clave}. Run the status command with the same directory.`,
    );
    if (error instanceof ApiError && error.statusCode === 409) {
      console.error("The clave already exists; query its status before taking further action.");
    }
    throw error;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
