import FacturaElectronica from "../../../schemas/2026/v4.4/FacturaElectronica_V4.4.xsd?raw";
import FacturaElectronicaCompra from "../../../schemas/2026/v4.4/FacturaElectronicaCompra_V4.4.xsd?raw";
import FacturaElectronicaExportacion from "../../../schemas/2026/v4.4/FacturaElectronicaExportacion_V4.4.xsd?raw";
import MensajeReceptor from "../../../schemas/2026/v4.4/MensajeReceptor_V4.4.xsd?raw";
import NotaCreditoElectronica from "../../../schemas/2026/v4.4/NotaCreditoElectronica_V4.4.xsd?raw";
import NotaDebitoElectronica from "../../../schemas/2026/v4.4/NotaDebitoElectronica_V4.4.xsd?raw";
import ReciboElectronicoPago from "../../../schemas/2026/v4.4/ReciboElectronicoPago_V4.4.xsd?raw";
import TiqueteElectronico from "../../../schemas/2026/v4.4/TiqueteElectronico_V4.4.xsd?raw";
import xmldsig from "../../../schemas/xmldsig-core-schema.xsd?raw";

export const DOCUMENT_SCHEMAS: Record<string, string> = {
  FacturaElectronica,
  FacturaElectronicaCompra,
  FacturaElectronicaExportacion,
  MensajeReceptor,
  NotaCreditoElectronica,
  NotaDebitoElectronica,
  ReciboElectronicoPago,
  TiqueteElectronico,
};
export { xmldsig };
