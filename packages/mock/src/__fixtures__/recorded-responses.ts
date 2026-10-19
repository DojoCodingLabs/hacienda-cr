/**
 * Respuestas grabadas (sanitizadas) del sandbox de Hacienda.
 *
 * These are the `MensajeHacienda` payloads the mock replays. They are
 * sanitized: no real taxpayer data, no certificates, no signatures, no
 * personal data. The `<Codigo>` values are the rejection codes the SDK
 * already documents in `packages/sdk/src/api/error-codes.ts`.
 *
 * Fidelity note: the v4.4 `MensajeHacienda` XSD declares `DetalleMensaje`
 * as a simple string and has no `Codigo` element, while the SDK's
 * `extractRejectionReason` looks for `<Codigo>` in the response. The mock
 * therefore emits `Codigo` as a sibling of `DetalleMensaje` so the SDK's
 * documented rejection-reason contract is exercised end to end. Nothing in
 * the SDK validates the response against the XSD.
 *
 * @module mock/fixtures
 */
/** Emisor/receptor placeholders used by the recorded responses. */
const EMISOR = {
  nombre: "Empresa de Prueba S.A.",
  tipo: "02",
  numero: "3101234567",
};

const RECEPTOR = {
  nombre: "Cliente de Prueba S.R.L.",
  tipo: "02",
  numero: "3109876543",
};

const PLACEHOLDER_CLAVE = "0".repeat(50);

/**
 * Builds a `MensajeHacienda` XML document (sanitized) for the given outcome.
 *
 * The v4.4 `MensajeHacienda` XSD requires a `ds:Signature` element; the
 * recorded payloads carry a placeholder signature because the mock never
 * validates the response against the XSD.
 */
function mensaje(
  clave: string,
  mensaje: "1" | "3",
  estado: string,
  detalle: string,
  codigo?: string,
): string {
  const signature =
    '<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">' +
    '<ds:SignedInfo><ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>' +
    '<ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>' +
    '<ds:Reference URI=""><ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>' +
    "<ds:DigestValue>PLACEHOLDER</ds:DigestValue></ds:Reference></ds:SignedInfo>" +
    "<ds:SignatureValue>PLACEHOLDER</ds:SignatureValue></ds:Signature>";

  const codigoXml = codigo ? `<Codigo>${codigo}</Codigo>` : "";

  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<MensajeHacienda xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/mensajeHacienda">' +
    `<Clave>${clave}</Clave>` +
    `<NombreEmisor>${EMISOR.nombre}</NombreEmisor>` +
    `<TipoIdentificacionEmisor>${EMISOR.tipo}</TipoIdentificacionEmisor>` +
    `<NumeroCedulaEmisor>${EMISOR.numero}</NumeroCedulaEmisor>` +
    `<NombreReceptor>${RECEPTOR.nombre}</NombreReceptor>` +
    `<TipoIdentificacionReceptor>${RECEPTOR.tipo}</TipoIdentificacionReceptor>` +
    `<NumeroCedulaReceptor>${RECEPTOR.numero}</NumeroCedulaReceptor>` +
    `<Mensaje>${mensaje}</Mensaje>` +
    `<EstadoMensaje>${estado}</EstadoMensaje>` +
    codigoXml +
    `<DetalleMensaje>${detalle}</DetalleMensaje>` +
    "<MontoTotalImpuesto>13000</MontoTotalImpuesto>" +
    "<TotalFactura>113000</TotalFactura>" +
    signature +
    "</MensajeHacienda>"
  );
}

/** Raw (not yet Base64-encoded) accepted response. */
export const ACCEPTED_XML = mensaje(
  PLACEHOLDER_CLAVE,
  "1",
  "01",
  "El comprobante electronico fue aceptado correctamente",
);

/** Raw (not yet Base64-encoded) error response. */
export const ERROR_XML = mensaje(
  PLACEHOLDER_CLAVE,
  "3",
  "06",
  "Ocurrio un error en el proceso de validacion del comprobante",
);

/** Raw rejection responses keyed by the rejection code the SDK documents. */
export const REJECTION_XML: Readonly<Record<string, string>> = {
  "01": mensaje(
    PLACEHOLDER_CLAVE,
    "3",
    "02",
    "El comprobante electronico no cumple con el esquema de validacion",
    "01",
  ),
  "03": mensaje(
    PLACEHOLDER_CLAVE,
    "3",
    "03",
    "El contribuyente no esta registrado o se encuentra inactivo",
    "03",
  ),
  "05": mensaje(PLACEHOLDER_CLAVE, "3", "04", "La clave numerica ya fue enviada previamente", "05"),
  "09": mensaje(
    PLACEHOLDER_CLAVE,
    "3",
    "05",
    "Los totales del comprobante no coinciden con el detalle de las lineas",
    "09",
  ),
};

/** Rejection details keyed by the rejection code the SDK documents. */
export const REJECTION_DETAILS: Readonly<Record<string, string>> = {
  "01": "El comprobante electronico no cumple con el esquema de validacion",
  "03": "El contribuyente no esta registrado o se encuentra inactivo",
  "05": "La clave numerica ya fue enviada previamente",
  "09": "Los totales del comprobante no coinciden con el detalle de las lineas",
};

/** Rejection code used when the requested outcome has no recorded response. */
export const DEFAULT_REJECTION_CODE = "01";
