/** Source-only recipient confirmation; no issuance, tax entitlement or transport authority. */
import { z } from "zod";
import { ExactFeInputSchema, ExactMoneySchema } from "./exact-fe.js";
import { compareNcInstants } from "./exact-nc-instant.js";

const reason = z
  .string()
  .max(320)
  .refine((value) => {
    const length = [...value].length;
    return length >= 5 && length <= 160 && value.trim().length > 0;
  }, "An actual nonblank confirmation reason of 5–160 Unicode characters is required");
export const ExactRecipientIvaDecisionSchema = z
  .object({
    condicionImpuesto: z.enum(["01", "02", "03", "04", "05"]),
    codigoActividad: z
      .string()
      .regex(/^\d{6}$/)
      .optional(),
    montoTotalImpuestoAcreditar: ExactMoneySchema.optional(),
    montoTotalDeGastoAplicable: ExactMoneySchema.optional(),
  })
  .strict()
  .superRefine((decision, ctx) => {
    if (
      decision.condicionImpuesto !== "05" &&
      decision.montoTotalImpuestoAcreditar !== undefined &&
      /[1-9]/.test(decision.montoTotalImpuestoAcreditar) &&
      decision.codigoActividad === undefined
    )
      ctx.addIssue({
        code: "custom",
        path: ["codigoActividad"],
        message: "An actual activity is required for an explicit positive credit (annex p. 62)",
      });
    if (decision.condicionImpuesto === "05" && decision.codigoActividad !== undefined)
      ctx.addIssue({
        code: "custom",
        path: ["codigoActividad"],
        message: "Proportionality does not use an activity code (annex p. 62)",
      });
  });
export const ExactRecipientMessageInputSchema = z
  .object({
    caseCode: z.literal("MR-domestic-ordinary-fe-iva13-v1"),
    original: ExactFeInputSchema,
    fechaEmisionDoc: z.iso.datetime({ offset: true }),
    numeroConsecutivoReceptor: z.string().regex(/^\d{20}$/),
    mensaje: z.enum(["1", "2", "3"]),
    detalleMensaje: reason.optional(),
    iva: ExactRecipientIvaDecisionSchema.optional(),
  })
  .strict()
  .superRefine((input, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: "custom", path, message });
    for (const party of ["emisor", "receptor"] as const)
      if (!["01", "02", "03", "04"].includes(input.original[party].identificacion.tipo))
        issue(
          ["original", party, "identificacion"],
          "This named source requires domestic parties 01–04",
        );
    // The current recipient XSD is narrower than the general party identifier.
    // Never strip letters or manufacture a numeric buyer to make it conform.
    if (!/^\d{9,12}$/.test(input.original.receptor.identificacion.numero))
      issue(
        ["original", "receptor", "identificacion"],
        "Recipient message buyer must satisfy its native numeric identity restriction",
      );
    const consecutive = input.numeroConsecutivoReceptor;
    if (
      consecutive.slice(8, 10) !== { "1": "05", "2": "06", "3": "07" }[input.mensaje] ||
      /^0+$/.test(consecutive.slice(0, 3)) ||
      /^0+$/.test(consecutive.slice(3, 8)) ||
      /^0+$/.test(consecutive.slice(10))
    )
      issue(
        ["numeroConsecutivoReceptor"],
        "Recipient consecutive requires positive branch/terminal/sequence and matching 05/06/07 kind",
      );
    if (input.mensaje !== "1" && input.detalleMensaje === undefined)
      issue(["detalleMensaje"], "Partial acceptance and rejection require the actual reason");
    // This first named rejection contains source facts/reason, not a tax allocation.
    if (input.mensaje === "3" && input.iva !== undefined)
      issue(["iva"], "This rejected-message case does not apply tax-credit or expense decisions");
    const chronology = compareNcInstants(input.original.fechaEmision, input.fechaEmisionDoc);
    if (chronology === null || chronology > 0)
      issue(
        ["fechaEmisionDoc"],
        "Confirmation must not precede the valid original emission instant",
      );
  });
export type ExactRecipientMessageInput = z.infer<typeof ExactRecipientMessageInputSchema>;
