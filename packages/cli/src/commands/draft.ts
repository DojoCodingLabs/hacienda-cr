/**
 * `hacienda draft` command.
 *
 * Interactive invoice builder that guides users through creating
 * a Factura Electronica step by step. Outputs a JSON file that
 * can be submitted via `hacienda submit`.
 *
 * @module commands/draft
 */

import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { defineCommand } from "citty";
import {
  IdentificationType,
  IDENTIFICATION_TYPE_NAMES,
  SaleCondition,
  SALE_CONDITION_NAMES,
  PaymentMethod,
  PAYMENT_METHOD_NAMES,
  IvaRateCode,
  IVA_RATE_NAMES,
  IVA_RATE_PERCENTAGES,
  UnitOfMeasure,
} from "@dojocoding/hacienda-shared";
import { success, error, detail, info, outputJson, bold, cyan, dim } from "../utils/format.js";

// ---------------------------------------------------------------------------
// Constants for interactive prompts
// ---------------------------------------------------------------------------

/** Curated shortlist of the domestic registry types (05/06 are handled separately). */
const IDENTIFICATION_TYPES = [
  IdentificationType.CEDULA_FISICA,
  IdentificationType.CEDULA_JURIDICA,
  IdentificationType.DIMEX,
  IdentificationType.NITE,
].map((code) => ({ code, name: IDENTIFICATION_TYPE_NAMES[code] }));

/** Curated shortlist of the most common sale conditions for the interactive picker. */
const SALE_CONDITIONS = [SaleCondition.CONTADO, SaleCondition.CREDITO, SaleCondition.OTROS].map(
  (code) => ({ code, name: SALE_CONDITION_NAMES[code] }),
);

const PAYMENT_METHODS = Object.values(PaymentMethod).map((code) => ({
  code,
  name: PAYMENT_METHOD_NAMES[code],
}));

/** Expired Ley 9635 transitional rates — kept out of the interactive picker. */
const TRANSITIONAL_IVA_RATES: readonly IvaRateCode[] = [
  IvaRateCode.TRANSITORIO_0,
  IvaRateCode.TRANSITORIO_4,
  IvaRateCode.TRANSITORIO_8,
];

const IVA_RATES = Object.values(IvaRateCode)
  .filter((code) => !TRANSITIONAL_IVA_RATES.includes(code))
  .map((code) => ({
    code,
    name: IVA_RATE_NAMES[code],
    rate: IVA_RATE_PERCENTAGES[code],
  }));

/** Curated shortlist of the most common units for the interactive picker. */
const COMMON_UNITS = [
  { code: UnitOfMeasure.UNIDAD, name: "Unidad" },
  { code: UnitOfMeasure.SERVICIOS_PROFESIONALES, name: "Servicios profesionales" },
  { code: UnitOfMeasure.HORAS, name: "Horas" },
  { code: UnitOfMeasure.KILOGRAMOS, name: "Kilogramos" },
  { code: UnitOfMeasure.METROS, name: "Metros" },
  { code: UnitOfMeasure.LITROS, name: "Litros" },
  { code: UnitOfMeasure.OTROS_SERVICIOS, name: "Otros servicios" },
] as const;

// ---------------------------------------------------------------------------
// Readline prompt helper
// ---------------------------------------------------------------------------

/**
 * Prompts the user for input via stdin/stdout.
 *
 * @param question - The prompt message to display.
 * @param defaultValue - Optional default value shown in brackets.
 * @returns The user's input, or the default value if empty.
 */
async function prompt(question: string, defaultValue?: string): Promise<string> {
  const { createInterface } = await import("node:readline");
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  const defaultHint = defaultValue !== undefined ? ` ${dim(`[${defaultValue}]`)}` : "";

  return new Promise((resolve) => {
    rl.question(`${cyan("?")} ${question}${defaultHint}: `, (answer) => {
      rl.close();
      const trimmed = answer.trim();
      resolve(trimmed || defaultValue || "");
    });
  });
}

/**
 * Prompts the user to select from a list of options.
 */
async function promptSelect(
  question: string,
  options: readonly { code: string; name: string }[],
  defaultCode?: string,
): Promise<string> {
  console.log(`\n${cyan("?")} ${question}`);
  for (const opt of options) {
    const marker = opt.code === defaultCode ? bold(" (default)") : "";
    console.log(`  ${dim(opt.code)} - ${opt.name}${marker}`);
  }
  const answer = await prompt("Enter code", defaultCode);
  const valid = options.find((o) => o.code === answer);
  if (!valid) {
    console.log(`  Using default: ${defaultCode ?? options[0]?.code ?? ""}`);
    return defaultCode ?? options[0]?.code ?? "";
  }
  return valid.code;
}

/**
 * Prompts for yes/no confirmation.
 */
async function promptConfirm(question: string, defaultValue = true): Promise<boolean> {
  const hint = defaultValue ? "Y/n" : "y/N";
  const answer = await prompt(`${question} (${hint})`, defaultValue ? "y" : "n");
  return answer.toLowerCase().startsWith("y");
}

// ---------------------------------------------------------------------------
// Draft builders
// ---------------------------------------------------------------------------

interface DraftEmisor {
  nombre: string;
  identificacion: { tipo: string; numero: string };
  ubicacion: {
    provincia: string;
    canton: string;
    distrito: string;
    otrasSenas: string;
  };
  correoElectronico: string;
  nombreComercial?: string;
}

interface DraftReceptor {
  nombre: string;
  identificacion?: { tipo: string; numero: string };
  correoElectronico?: string;
}

interface DraftLineItem {
  numeroLinea: number;
  codigoCabys: string;
  cantidad: number;
  unidadMedida: string;
  detalle: string;
  precioUnitario: number;
  montoTotal: number;
  subTotal: number;
  impuesto?: {
    codigo: string;
    codigoTarifaIVA: string;
    tarifa: number;
    monto: number;
  }[];
  impuestoNeto?: number;
  montoTotalLinea: number;
}

async function collectEmisor(): Promise<DraftEmisor> {
  console.log(`\n${bold("--- Emisor (Issuer) ---")}`);

  const nombre = await prompt("Business name (Nombre o Razon Social)");
  const tipoId = await promptSelect("Identification type", IDENTIFICATION_TYPES, "02");
  const numero = await prompt("Identification number (digits only)");
  const provincia = await prompt("Province code (1-7)", "1");
  const canton = await prompt("Canton code (2 digits)", "01");
  const distrito = await prompt("District code (2 digits)", "01");
  const otrasSenas = await prompt("Address details (min 5 chars)", "Sin otras senas");
  const correo = await prompt("Email address");
  const nombreComercial = await prompt("Commercial name (optional, press Enter to skip)");

  const emisor: DraftEmisor = {
    nombre,
    identificacion: { tipo: tipoId, numero },
    ubicacion: { provincia, canton, distrito, otrasSenas },
    correoElectronico: correo,
  };

  if (nombreComercial) {
    emisor.nombreComercial = nombreComercial;
  }

  return emisor;
}

async function collectReceptor(): Promise<DraftReceptor> {
  console.log(`\n${bold("--- Receptor (Receiver) ---")}`);

  const nombre = await prompt("Receiver name");
  const hasId = await promptConfirm("Does the receiver have a CR identification?", true);

  const receptor: DraftReceptor = { nombre };

  if (hasId) {
    const tipoId = await promptSelect("Identification type", IDENTIFICATION_TYPES, "02");
    const numero = await prompt("Identification number (digits only)");
    receptor.identificacion = { tipo: tipoId, numero };
  } else {
    // Facturas require a receptor identification in v4.4; foreign receivers
    // use type 05 (Extranjero No Domiciliado) with a free-form number.
    const numero = await prompt("Foreign identification number (max 20 chars)");
    receptor.identificacion = { tipo: "05", numero };
  }

  const correo = await prompt("Receiver email (optional, press Enter to skip)");
  if (correo) {
    receptor.correoElectronico = correo;
  }

  return receptor;
}

async function collectLineItem(lineNumber: number): Promise<DraftLineItem> {
  console.log(`\n${bold(`--- Line Item #${String(lineNumber)} ---`)}`);

  const detalle = await prompt("Description");
  const codigoCabys = await prompt("CABYS code (13 digits)", "0000000000000");
  const unidadMedida = await promptSelect("Unit of measure", COMMON_UNITS, "Unid");
  const cantidadStr = await prompt("Quantity", "1");
  const cantidad = parseFloat(cantidadStr) || 1;
  const precioStr = await prompt("Unit price");
  const precioUnitario = parseFloat(precioStr) || 0;

  const montoTotal = round5(cantidad * precioUnitario);
  const subTotal = montoTotal; // No discounts in basic draft

  // Tax. v4.4 requires at least one Impuesto per line, so a tax-free line
  // still carries an exempt IVA entry (codigo 01, tarifa 0).
  const hasTax = await promptConfirm("Apply IVA tax?", true);
  let impuesto: DraftLineItem["impuesto"];
  let impuestoNeto = 0;

  if (hasTax) {
    const ivaCode = await promptSelect("IVA rate", IVA_RATES, "08");
    const rateEntry = IVA_RATES.find((r) => r.code === ivaCode);
    const tarifa = rateEntry?.rate ?? 13;
    const monto = round5(subTotal * (tarifa / 100));
    impuestoNeto = monto;

    impuesto = [
      {
        codigo: "01", // IVA
        codigoTarifaIVA: ivaCode,
        tarifa,
        monto,
      },
    ];
  } else {
    impuesto = [
      {
        codigo: "01",
        codigoTarifaIVA: "01", // Exento
        tarifa: 0,
        monto: 0,
      },
    ];
  }

  return {
    numeroLinea: lineNumber,
    codigoCabys,
    cantidad,
    unidadMedida,
    detalle,
    precioUnitario,
    montoTotal,
    subTotal,
    impuesto,
    impuestoNeto,
    montoTotalLinea: round5(subTotal + impuestoNeto),
  };
}

function round5(value: number): number {
  return Math.round(value * 100000) / 100000;
}

function buildResumenFactura(
  lineItems: DraftLineItem[],
  medioPago: string,
): Record<string, unknown> {
  let totalGravado = 0;
  let totalExento = 0;
  let totalImpuesto = 0;
  const totalDescuentos = 0;

  for (const item of lineItems) {
    if (item.impuestoNeto && item.impuestoNeto > 0) {
      totalGravado = round5(totalGravado + item.subTotal);
      totalImpuesto = round5(totalImpuesto + item.impuestoNeto);
    } else {
      totalExento = round5(totalExento + item.subTotal);
    }
  }

  const totalVenta = round5(totalGravado + totalExento);
  const totalVentaNeta = round5(totalVenta - totalDescuentos);
  const totalComprobante = round5(totalVentaNeta + totalImpuesto);

  return {
    totalServGravados: 0,
    totalServExentos: 0,
    totalMercanciasGravadas: totalGravado,
    totalMercanciasExentas: totalExento,
    totalGravado,
    totalExento,
    totalVenta,
    totalDescuentos,
    totalVentaNeta,
    totalImpuesto,
    medioPago: [{ tipoMedioPago: medioPago, totalMedioPago: totalComprobante }],
    totalComprobante,
  };
}

// ---------------------------------------------------------------------------
// Command definition
// ---------------------------------------------------------------------------

export const draftCommand = defineCommand({
  meta: {
    name: "draft",
    description: "Interactively create an invoice JSON draft for submission",
  },
  args: {
    output: {
      type: "string",
      description: "Output file path for the draft JSON (default: draft-factura.json)",
      required: false,
    },
    template: {
      type: "string",
      description: "Template type: factura, nota-credito, nota-debito, tiquete",
      default: "factura",
    },
    json: {
      type: "boolean",
      description: "Output as JSON to stdout instead of writing a file",
      default: false,
    },
    interactive: {
      type: "boolean",
      description: "Run in interactive mode with step-by-step prompts (default: true)",
      default: true,
    },
  },
  async run({ args }) {
    // Non-interactive mode: generate a blank template
    if (!args.interactive || !process.stdin.isTTY) {
      const template = generateBlankTemplate(args.template);

      if (args.json) {
        outputJson(template);
        return;
      }

      const outputPath = resolve(args.output ?? `draft-${args.template}.json`);
      await writeFile(outputPath, JSON.stringify(template, null, 2) + "\n", "utf-8");
      success(`Blank ${args.template} template written to ${outputPath}`);
      info("Edit the file and then submit with: hacienda submit " + outputPath);
      return;
    }

    // Interactive mode
    try {
      console.log(bold("\nHacienda CR - Interactive Invoice Draft Builder\n"));
      console.log(dim("This wizard will guide you through creating a Factura Electronica."));
      console.log(dim("The output JSON can be submitted via `hacienda submit <file>`.\n"));

      // Activity code
      const codigoActividadEmisor = await prompt("Economic activity code (CIIU)", "620100");

      // Sale condition
      const condicionVenta = await promptSelect("Sale condition", SALE_CONDITIONS, "01");

      // Payment method
      const medioPago = await promptSelect("Payment method", PAYMENT_METHODS, "01");

      // Emisor
      const emisor = await collectEmisor();

      // Receptor
      const receptor = await collectReceptor();

      // Line items
      const lineItems: DraftLineItem[] = [];
      let addMore = true;
      let lineNumber = 1;

      while (addMore) {
        const item = await collectLineItem(lineNumber);
        lineItems.push(item);
        lineNumber++;

        if (lineNumber > 1) {
          addMore = await promptConfirm("Add another line item?", false);
        }
      }

      // Build the summary (v4.4: payment methods live inside the summary)
      const resumenFactura = buildResumenFactura(lineItems, medioPago);

      // Assemble the draft document
      const now = new Date();
      const draft = {
        clave: "<<GENERATE_ON_SUBMIT>>",
        proveedorSistemas: emisor.identificacion.numero,
        codigoActividadEmisor,
        numeroConsecutivo: "<<GENERATE_ON_SUBMIT>>",
        fechaEmision: now.toISOString(),
        emisor,
        receptor,
        condicionVenta,
        detalleServicio: lineItems,
        resumenFactura,
      };

      // Output
      if (args.json) {
        outputJson({ success: true, draft });
        return;
      }

      const outputPath = resolve(args.output ?? `draft-${args.template}.json`);
      await writeFile(outputPath, JSON.stringify(draft, null, 2) + "\n", "utf-8");

      console.log("");
      success(`Invoice draft written to ${outputPath}`);
      detail("Line items", String(lineItems.length));
      detail("Total", String(resumenFactura["totalComprobante"]));
      detail("Tax", String(resumenFactura["totalImpuesto"]));
      console.log("");
      info(
        "Note: clave and numeroConsecutivo are placeholders. They will be generated on submission.",
      );
      info("Submit with: hacienda submit " + outputPath);
    } catch (err) {
      // Handle Ctrl+C or readline close gracefully
      if (
        err instanceof Error &&
        (err.message.includes("readline was closed") || err.message.includes("ERR_USE_AFTER_CLOSE"))
      ) {
        console.log("\n");
        info("Draft creation cancelled.");
        return;
      }
      const message = err instanceof Error ? err.message : "Unknown error";
      error(`Draft creation failed: ${message}`);
      process.exitCode = 1;
    }
  },
});

// ---------------------------------------------------------------------------
// Template generator
// ---------------------------------------------------------------------------

/**
 * Generates a blank template JSON for a given document type.
 * This serves as a starting point that users can edit manually.
 */
function generateBlankTemplate(templateType: string): Record<string, unknown> {
  const base = {
    clave: "<<GENERATE_ON_SUBMIT>>",
    proveedorSistemas: "<<YOUR_CEDULA>>",
    codigoActividadEmisor: "620100",
    numeroConsecutivo: "<<GENERATE_ON_SUBMIT>>",
    fechaEmision: new Date().toISOString(),
    emisor: {
      nombre: "<<YOUR_BUSINESS_NAME>>",
      identificacion: {
        tipo: "02",
        numero: "<<YOUR_CEDULA>>",
      },
      ubicacion: {
        provincia: "1",
        canton: "01",
        distrito: "01",
        otrasSenas: "<<YOUR_ADDRESS>>",
      },
      correoElectronico: "<<YOUR_EMAIL>>",
    },
    condicionVenta: "01",
    detalleServicio: [
      {
        numeroLinea: 1,
        codigoCabys: "0000000000000",
        cantidad: 1,
        unidadMedida: "Unid",
        detalle: "<<PRODUCT_OR_SERVICE_DESCRIPTION>>",
        precioUnitario: 0,
        montoTotal: 0,
        subTotal: 0,
        impuesto: [
          {
            codigo: "01",
            codigoTarifaIVA: "08",
            tarifa: 13,
            monto: 0,
          },
        ],
        impuestoNeto: 0,
        montoTotalLinea: 0,
      },
    ],
    resumenFactura: {
      totalServGravados: 0,
      totalServExentos: 0,
      totalMercanciasGravadas: 0,
      totalMercanciasExentas: 0,
      totalGravado: 0,
      totalExento: 0,
      totalVenta: 0,
      totalDescuentos: 0,
      totalVentaNeta: 0,
      totalImpuesto: 0,
      medioPago: [{ tipoMedioPago: "01", totalMedioPago: 0 }],
      totalComprobante: 0,
    },
  };

  switch (templateType) {
    case "tiquete":
      return { ...base, _templateType: "TiqueteElectronico" };

    case "nota-credito":
      return {
        ...base,
        receptor: {
          nombre: "<<RECEIVER_NAME>>",
          identificacion: { tipo: "02", numero: "<<RECEIVER_CEDULA>>" },
        },
        informacionReferencia: [
          {
            tipoDoc: "01",
            numero: "<<ORIGINAL_DOCUMENT_CLAVE>>",
            fechaEmision: new Date().toISOString(),
            codigo: "01",
            razon: "<<REASON_FOR_CREDIT_NOTE>>",
          },
        ],
        _templateType: "NotaCreditoElectronica",
      };

    case "nota-debito":
      return {
        ...base,
        receptor: {
          nombre: "<<RECEIVER_NAME>>",
          identificacion: { tipo: "02", numero: "<<RECEIVER_CEDULA>>" },
        },
        informacionReferencia: [
          {
            tipoDoc: "01",
            numero: "<<ORIGINAL_DOCUMENT_CLAVE>>",
            fechaEmision: new Date().toISOString(),
            codigo: "01",
            razon: "<<REASON_FOR_DEBIT_NOTE>>",
          },
        ],
        _templateType: "NotaDebitoElectronica",
      };

    case "factura":
    default:
      return {
        ...base,
        receptor: {
          nombre: "<<RECEIVER_NAME>>",
          identificacion: { tipo: "02", numero: "<<RECEIVER_CEDULA>>" },
          correoElectronico: "<<RECEIVER_EMAIL>>",
        },
        _templateType: "FacturaElectronica",
      };
  }
}
