/**
 * Additive `MensajeReceptor` contract with bounded decimal-text amounts.
 *
 * This is a representation and serialization contract. It does not calculate
 * taxes, infer acceptance, reconcile a payment, or grant fiscal authority.
 */

import { z } from "zod";
import { MensajeReceptorCode } from "../generated/index.js";
import { DecimalMoneySchema } from "./decimal-fields.js";
import { parseMonetaryText } from "../monetary/index.js";

export const DecimalMensajeReceptorSchema = z
  .object({
    clave: z
      .string()
      .length(50)
      .regex(/^\d{9}[A-Za-z0-9]{12}\d{29}$/, "clave must follow the 50-character layout"),
    numeroCedulaEmisor: z.string().min(1).max(20),
    fechaEmisionDoc: z.string().min(1),
    mensaje: z.enum(MensajeReceptorCode),
    detalleMensaje: z.string().max(300).optional(),
    montoTotalImpuesto: DecimalMoneySchema.optional(),
    codigoActividad: z
      .string()
      .regex(/^\d{6}$/)
      .optional(),
    condicionImpuesto: z.string().min(1).max(2).optional(),
    montoTotalImpuestoAcreditar: DecimalMoneySchema.optional(),
    montoTotalDeGastoAplicable: DecimalMoneySchema.optional(),
    totalFactura: DecimalMoneySchema,
    numeroCedulaReceptor: z.string().min(1).max(20),
    numeroConsecutivoReceptor: z
      .string()
      .length(20)
      .regex(/^\d{20}$/),
  })
  .strict()
  .superRefine((value, ctx) => {
    const issue = (path: string[], message: string) =>
      ctx.addIssue({ code: "custom", path, message });
    const tax = value.montoTotalImpuesto ? parseMonetaryText(value.montoTotalImpuesto) : undefined;
    const credited = value.montoTotalImpuestoAcreditar
      ? parseMonetaryText(value.montoTotalImpuestoAcreditar)
      : undefined;
    const expense = value.montoTotalDeGastoAplicable
      ? parseMonetaryText(value.montoTotalDeGastoAplicable)
      : undefined;
    const total = parseMonetaryText(value.totalFactura);
    if (tax !== undefined && tax > total)
      issue(["montoTotalImpuesto"], "montoTotalImpuesto must not exceed the supplied totalFactura");
    if (credited !== undefined && tax !== undefined && credited > tax)
      issue(
        ["montoTotalImpuestoAcreditar"],
        "montoTotalImpuestoAcreditar must not exceed montoTotalImpuesto",
      );
    if (expense !== undefined && expense > total)
      issue(
        ["montoTotalDeGastoAplicable"],
        "montoTotalDeGastoAplicable must not exceed the supplied totalFactura",
      );
  });

export type DecimalMensajeReceptor = z.infer<typeof DecimalMensajeReceptorSchema>;
