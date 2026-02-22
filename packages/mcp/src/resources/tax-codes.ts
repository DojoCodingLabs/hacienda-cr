/**
 * MCP resource: hacienda://reference/tax-codes
 *
 * Tax codes, IVA rate codes, exoneration types, and unit of measure codes
 * for AI assistant reference.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  TaxCode,
  IvaRateCode,
  IVA_RATE_PERCENTAGES,
  ExonerationType,
  UnitOfMeasure,
} from "@hacienda-cr/shared";

const TAX_REFERENCE = {
  taxCodes: [
    { code: TaxCode.IVA, name: "IVA", description: "Impuesto al Valor Agregado (Value Added Tax)" },
    {
      code: TaxCode.IMPUESTO_SELECTIVO_CONSUMO,
      name: "Impuesto Selectivo de Consumo",
      description: "Selective consumption tax",
    },
    {
      code: TaxCode.IMPUESTO_UNICO_COMBUSTIBLES,
      name: "Impuesto Unico a los Combustibles",
      description: "Fuel tax",
    },
    {
      code: TaxCode.IMPUESTO_BEBIDAS_ALCOHOLICAS,
      name: "Impuesto Bebidas Alcoholicas",
      description: "Alcoholic beverages tax",
    },
    {
      code: TaxCode.IMPUESTO_BEBIDAS_SIN_ALCOHOL,
      name: "Impuesto Bebidas sin Alcohol",
      description: "Non-alcoholic beverages and toiletries tax",
    },
    { code: TaxCode.IMPUESTO_TABACO, name: "Impuesto al Tabaco", description: "Tobacco tax" },
    {
      code: TaxCode.IVA_CALCULO_ESPECIAL,
      name: "IVA (calculo especial)",
      description: "IVA with special calculation",
    },
    {
      code: TaxCode.IVA_BIENES_USADOS,
      name: "IVA Bienes Usados",
      description: "IVA for used goods regime (factor method)",
    },
    {
      code: TaxCode.IMPUESTO_CEMENTO,
      name: "Impuesto al Cemento",
      description: "Cement tax",
    },
    { code: TaxCode.OTROS, name: "Otros", description: "Other taxes" },
  ],
  ivaRateCodes: Object.entries(IVA_RATE_PERCENTAGES).map(([code, rate]) => ({
    code,
    rate,
    name: getIvaRateName(code),
  })),
  exonerationTypes: [
    { code: ExonerationType.COMPRAS_AUTORIZADAS, name: "Compras autorizadas" },
    {
      code: ExonerationType.VENTAS_EXENTAS_DIPLOMATICOS,
      name: "Ventas exentas a diplomaticos",
    },
    {
      code: ExonerationType.AUTORIZADO_LEY_ESPECIAL,
      name: "Autorizado por ley especial",
    },
    {
      code: ExonerationType.EXENCIONES_DGH,
      name: "Exenciones de la Direccion General de Hacienda",
    },
    { code: ExonerationType.TRANSITORIO_V, name: "Transitorio V" },
    { code: ExonerationType.TRANSITORIO_IX, name: "Transitorio IX" },
    { code: ExonerationType.TRANSITORIO_XVII, name: "Transitorio XVII" },
    { code: ExonerationType.OTROS, name: "Otros" },
  ],
  commonUnitsOfMeasure: [
    { code: UnitOfMeasure.UNIDAD, name: "Unidad", description: "Unit (general merchandise)" },
    {
      code: UnitOfMeasure.SERVICIOS_PROFESIONALES,
      name: "Servicios Profesionales",
      description: "Professional services",
    },
    { code: UnitOfMeasure.HORAS, name: "Horas", description: "Hours" },
    { code: UnitOfMeasure.KILOGRAMOS, name: "Kilogramos", description: "Kilograms" },
    { code: UnitOfMeasure.LITROS, name: "Litros", description: "Liters" },
    { code: UnitOfMeasure.METROS, name: "Metros", description: "Meters" },
    {
      code: UnitOfMeasure.METROS_CUADRADOS,
      name: "Metros cuadrados",
      description: "Square meters",
    },
    { code: UnitOfMeasure.METROS_CUBICOS, name: "Metros cubicos", description: "Cubic meters" },
    { code: UnitOfMeasure.CAJAS, name: "Cajas", description: "Boxes" },
    { code: UnitOfMeasure.PAQUETES, name: "Paquetes", description: "Packages" },
    { code: UnitOfMeasure.GALONES, name: "Galones", description: "Gallons" },
    { code: UnitOfMeasure.OTROS, name: "Otros", description: "Other (specify)" },
  ],
  notes: {
    commonUsage:
      "For most services, use tax code '01' (IVA) with rate code '08' (13% general rate). " +
      "Unit of measure for services is typically 'Sp' (Servicios Profesionales). " +
      "For merchandise, use 'Unid' (Unidad).",
    ivaExempt:
      "Some goods and services are exempt from IVA (rate code '01', 0%). " +
      "The reduced rates (1%, 2%, 4%) apply to specific goods like basic foodstuffs.",
  },
};

function getIvaRateName(code: string): string {
  switch (code) {
    case IvaRateCode.EXENTO:
      return "Exento (0%)";
    case IvaRateCode.REDUCIDA_1:
      return "Tarifa reducida 1%";
    case IvaRateCode.REDUCIDA_2:
      return "Tarifa reducida 2%";
    case IvaRateCode.REDUCIDA_4:
      return "Tarifa reducida 4%";
    case IvaRateCode.TRANSITORIO_0:
      return "Transitorio 0%";
    case IvaRateCode.TRANSITORIO_4:
      return "Transitorio 4%";
    case IvaRateCode.TRANSITORIO_8:
      return "Transitorio 8%";
    case IvaRateCode.GENERAL_13:
      return "Tarifa general 13%";
    default:
      return `Code ${code}`;
  }
}

export function registerTaxCodesResource(server: McpServer): void {
  server.resource(
    "tax-codes",
    "hacienda://reference/tax-codes",
    {
      description:
        "Reference data for Costa Rica tax codes, IVA rates, exoneration types, " +
        "and units of measure used in electronic invoicing.",
      mimeType: "application/json",
    },
    async () => ({
      contents: [
        {
          uri: "hacienda://reference/tax-codes",
          mimeType: "application/json",
          text: JSON.stringify(TAX_REFERENCE, null, 2),
        },
      ],
    }),
  );
}
