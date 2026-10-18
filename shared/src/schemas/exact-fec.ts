/** First named ordinary domestic purchase source; no supplier-eligibility oracle. */
import { z } from "zod";
import { FacturaElectronicaSchema } from "./factura.js";
import { EmisorSchema } from "./emisor.js";
import { ReceptorSchema } from "./receptor.js";
import { IdentificacionSchema } from "./identification.js";
import { TelefonoSchema, UbicacionSchema } from "./common.js";
import { exactPartyName } from "./exact-party-name.js";
import { compareNcInstants } from "./exact-nc-instant.js";
import {
  ExactMoneySchema,
  ExactFeLineInputSchema,
  ExactFePaymentSchema,
  type ExactFeCalculated,
} from "./exact-fe.js";
const identity = IdentificacionSchema.safeExtend({
  tipo: z.enum(["01", "02", "03", "04"]),
}).strict();
const actualText = (min: number, max: number) =>
  z
    .string()
    .min(min)
    .max(max)
    .refine((v) => v.trim().length > 0, "Actual nonblank evidence text required");
export const ExactFecReferenceSchema = z
  .object({
    tipoDoc: z.enum(["06", "07", "14", "99"]),
    tipoDocOtros: actualText(5, 100).optional(),
    numero: actualText(1, 50),
    fechaEmision: z.iso.datetime({ offset: true }),
    codigo: z.literal("04"),
    razon: actualText(3, 180),
  })
  .strict()
  .superRefine((r, ctx) => {
    if ((r.tipoDoc === "99") !== (r.tipoDocOtros !== undefined))
      ctx.addIssue({
        code: "custom",
        path: ["tipoDocOtros"],
        message: "Other-document description is required only for reference 99",
      });
  });
export const ExactFecInputSchema = FacturaElectronicaSchema.pick({
  clave: true,
  proveedorSistemas: true,
  numeroConsecutivo: true,
})
  .extend({
    caseCode: z.literal("FEC-domestic-ordinary-iva13-v1"),
    fechaEmision: z.iso.datetime({ offset: true }),
    codigoActividadEmisor: z
      .string()
      .regex(/^\d{6}$/)
      .optional(),
    codigoActividadReceptor: z.string().regex(/^\d{6}$/),
    emisor: EmisorSchema.extend({
      correoElectronico: EmisorSchema.shape.correoElectronico.optional(),
      nombre: exactPartyName(5, 100),
      nombreComercial: exactPartyName(3, 80).optional(),
      identificacion: identity,
      ubicacion: UbicacionSchema.strict(),
      telefono: TelefonoSchema.strict().optional(),
    }).strict(),
    receptor: ReceptorSchema.omit({ otrasSenasExtranjero: true })
      .extend({
        nombre: exactPartyName(3, 100),
        nombreComercial: exactPartyName(3, 80).optional(),
        identificacion: identity,
        ubicacion: UbicacionSchema.strict(),
        telefono: TelefonoSchema.strict().optional(),
      })
      .strict(),
    condicionVenta: z.enum(["01", "02"]),
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
    informacionReferencia: z.array(ExactFecReferenceSchema).min(1).max(10),
  })
  .strict()
  .superRefine((input, ctx) => {
    if (input.condicionVenta === "02" && input.plazoCredito === undefined)
      ctx.addIssue({
        code: "custom",
        path: ["plazoCredito"],
        message: "Credit purchase requires explicit positive days",
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
    input.detalleServicio.forEach((line, i) => {
      if (line.numeroLinea !== i + 1)
        ctx.addIssue({
          code: "custom",
          path: ["detalleServicio", i, "numeroLinea"],
          message: "Line numbers must be sequential",
        });
    });
    input.medioPago.forEach((payment, i) => {
      if (!/[1-9]/.test(payment.totalMedioPago))
        ctx.addIssue({
          code: "custom",
          path: ["medioPago", i, "totalMedioPago"],
          message: "Supplied payment allocation must be positive",
        });
    });
    const seen = new Set<string>();
    input.informacionReferencia.forEach((r, i) => {
      const order = compareNcInstants(r.fechaEmision, input.fechaEmision);
      if (order === null || order > 0)
        ctx.addIssue({
          code: "custom",
          path: ["informacionReferencia", i, "fechaEmision"],
          message: "Evidence must not postdate the declared purchase",
        });
      const key = JSON.stringify([r.tipoDoc, r.numero, r.fechaEmision]);
      if (seen.has(key))
        ctx.addIssue({
          code: "custom",
          path: ["informacionReferencia", i],
          message: "Supporting evidence tuple must be unique",
        });
      seen.add(key);
    });
  });
export type ExactFecInput = z.infer<typeof ExactFecInputSchema>;
export type ExactFecCalculated = ExactFeCalculated;
