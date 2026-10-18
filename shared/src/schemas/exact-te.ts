/** Additive ordinary domestic TE; no fictitious receiver or FE producer input. */
import { z } from "zod";
import { exactPartyName } from "./exact-party-name.js";
import { FacturaElectronicaSchema } from "./factura.js";
import { EmisorSchema } from "./emisor.js";
import { ReceptorSchema } from "./receptor.js";
import { IdentificacionSchema } from "./identification.js";
import { TelefonoSchema, UbicacionSchema } from "./common.js";
import {
  ExactMoneySchema,
  ExactFeLineInputSchema,
  ExactFePaymentSchema,
  type ExactFeCalculated,
} from "./exact-fe.js";
const domesticIdentity = IdentificacionSchema.safeExtend({
  tipo: z.enum(["01", "02", "03", "04"]),
}).strict();
export const ExactTeInputSchema = FacturaElectronicaSchema.pick({
  clave: true,
  proveedorSistemas: true,
  codigoActividadEmisor: true,
  numeroConsecutivo: true,
  condicionVenta: true,
  condicionVentaOtros: true,
})
  .extend({
    caseCode: z.literal("TE-domestic-ordinary-iva13-v1"),
    fechaEmision: z.iso.datetime({ offset: true }),
    emisor: EmisorSchema.extend({
      nombre: exactPartyName(5, 100),
      nombreComercial: exactPartyName(3, 80).optional(),
      identificacion: domesticIdentity,
      ubicacion: UbicacionSchema.strict(),
      telefono: TelefonoSchema.strict().optional(),
    }).strict(),
    receptor: ReceptorSchema.omit({ otrasSenasExtranjero: true })
      .extend({
        nombre: exactPartyName(3, 100),
        nombreComercial: exactPartyName(3, 80).optional(),
        identificacion: domesticIdentity.optional(),
        ubicacion: UbicacionSchema.strict().optional(),
        telefono: TelefonoSchema.strict().optional(),
      })
      .strict()
      .optional(),
    plazoCredito: z
      .string()
      .regex(/^\d{1,5}$/)
      .optional(),
    detalleServicio: z.array(ExactFeLineInputSchema).min(1).max(1000),
    codigoTipoMoneda: z
      .object({
        codigoMoneda: z.enum(["CRC", "USD"]),
        tipoCambio: ExactMoneySchema.refine(
          (v) => /[1-9]/.test(v),
          "Exchange rate must be positive",
        ),
      })
      .strict(),
    medioPago: z.array(ExactFePaymentSchema).min(1).max(4),
  })
  .strict()
  .superRefine((input, ctx) => {
    if (["09", "11", "12", "13"].includes(input.condicionVenta))
      ctx.addIssue({
        code: "custom",
        path: ["condicionVenta"],
        message: "Sale condition belongs to another document family, not ordinary TE",
      });
    if (input.condicionVenta === "99" && !input.condicionVentaOtros)
      ctx.addIssue({
        code: "custom",
        path: ["condicionVentaOtros"],
        message: "Explicit other-sale text required",
      });
    if (["02", "10"].includes(input.condicionVenta) && input.plazoCredito === undefined)
      ctx.addIssue({
        code: "custom",
        path: ["plazoCredito"],
        message: "Explicit positive credit days required for 02/10",
      });
    if (input.plazoCredito !== undefined && !/[1-9]/.test(input.plazoCredito))
      ctx.addIssue({
        code: "custom",
        path: ["plazoCredito"],
        message: "Credit days must be positive",
      });
    if (
      input.codigoTipoMoneda.codigoMoneda === "CRC" &&
      !/^1(?:\.0{1,5})?$/.test(input.codigoTipoMoneda.tipoCambio)
    )
      ctx.addIssue({
        code: "custom",
        path: ["codigoTipoMoneda", "tipoCambio"],
        message: "CRC exchange rate must equal 1",
      });
    input.detalleServicio.forEach((line, index) => {
      if (line.numeroLinea !== index + 1)
        ctx.addIssue({
          code: "custom",
          path: ["detalleServicio", index, "numeroLinea"],
          message: "Line numbers must be sequential",
        });
    });
  });
export type ExactTeInput = z.infer<typeof ExactTeInputSchema>;
export type ExactTeCalculated = ExactFeCalculated;
