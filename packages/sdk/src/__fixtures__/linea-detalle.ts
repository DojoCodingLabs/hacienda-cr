import {
  UNITS_OF_MEASURE,
  type LineaDetalle,
  type UnitOfMeasure,
} from "@dojocoding/hacienda-shared";
import type { CalculatedLineItem } from "../tax/calculator.js";

function isUnitOfMeasure(value: string): value is UnitOfMeasure {
  return (UNITS_OF_MEASURE as readonly string[]).includes(value);
}

/**
 * Turn calculator output into a document line for specs.
 *
 * `CalculatedLineItem.unidadMedida` is a plain string, while `LineaDetalle` requires
 * the catalog unit. This narrows the unit and throws on an unknown one, so a spec
 * can never feed a builder a unit that the types would have rejected.
 */
export function toLineaDetalle(line: Omit<CalculatedLineItem, "esServicio">): LineaDetalle {
  const { unidadMedida } = line;
  if (!isUnitOfMeasure(unidadMedida)) throw new Error(`Unknown unit of measure: ${unidadMedida}`);
  return { ...line, unidadMedida };
}
