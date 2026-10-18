import { ExactTeInputSchema, type ExactTeInput } from "@dojocoding/hacienda-shared";
import { calculateExactTe } from "../tax/exact-te.js";
import { buildXml } from "../xml/builder.js";
import { buildExactOrdinaryFields } from "./exact-fe-builder.js";
/** Genuine TE field tree; an absent receiver stays absent, never a dummy FE. */
export function buildExactTiqueteXml(source: ExactTeInput): string {
  const input = ExactTeInputSchema.parse(source);
  return buildXml("TiqueteElectronico", buildExactOrdinaryFields(input, calculateExactTe(input)));
}
