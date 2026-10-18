import {
  ExactFecForeignServiceIva13InputSchema,
  type ExactFecForeignServiceIva13Input,
} from "@dojocoding/hacienda-shared";
import { calculateExactFecForeignServiceIva13 } from "../tax/exact-fec-foreign-service.js";
import { buildXml } from "../xml/builder.js";
import { buildReceptorXml } from "./shared-xml-helpers.js";
import { buildExactFecMonetaryFields } from "./exact-fec-builder.js";
/** Actual foreign supplier stays Emisor; actual buyer owns identity and signing.
 * No fabricated local address/activity or domestic-header bypass is used. */
export function buildExactFacturaCompraForeignServiceIva13Xml(
  source: ExactFecForeignServiceIva13Input,
): string {
  const input = ExactFecForeignServiceIva13InputSchema.parse(source),
    supplier = input.emisor,
    reference = input.informacionReferencia[0];
  return buildXml("FacturaElectronicaCompra", {
    Clave: input.clave,
    ProveedorSistemas: input.proveedorSistemas,
    CodigoActividadReceptor: input.codigoActividadReceptor,
    NumeroConsecutivo: input.numeroConsecutivo,
    FechaEmision: input.fechaEmision,
    Emisor: {
      Nombre: supplier.nombre,
      Identificacion: {
        Tipo: supplier.identificacion.tipo,
        Numero: supplier.identificacion.numero,
      },
      ...(supplier.nombreComercial ? { NombreComercial: supplier.nombreComercial } : {}),
      OtrasSenasExtranjero: supplier.otrasSenasExtranjero,
      ...(supplier.telefono
        ? {
            Telefono: {
              CodigoPais: supplier.telefono.codigoPais,
              NumTelefono: supplier.telefono.numTelefono,
            },
          }
        : {}),
      ...(supplier.correoElectronico ? { CorreoElectronico: supplier.correoElectronico } : {}),
    },
    Receptor: buildReceptorXml(input.receptor),
    CondicionVenta: input.condicionVenta,
    ...(input.plazoCredito ? { PlazoCredito: input.plazoCredito } : {}),
    ...buildExactFecMonetaryFields(calculateExactFecForeignServiceIva13(input)),
    InformacionReferencia: {
      TipoDocIR: reference.tipoDoc,
      Numero: reference.numero,
      FechaEmisionIR: reference.fechaEmision,
      Codigo: reference.codigo,
      Razon: reference.razon,
    },
  });
}
