/**
 * Types for the Hacienda REST API request and response payloads.
 */

import type { Identificacion } from "./documents.js";

// ---------------------------------------------------------------------------
// Submission (POST /recepcion)
// ---------------------------------------------------------------------------

/** Request payload for submitting a document to Hacienda. */
export interface SubmissionRequest {
  /** 50-digit clave numerica. */
  clave: string;

  /** Emission date (ISO 8601 with timezone, e.g., "2025-07-27T10:30:00-06:00"). */
  fecha: string;

  /** Issuer identification. */
  emisor: {
    tipoIdentificacion: Identificacion["tipo"];
    numeroIdentificacion: Identificacion["numero"];
  };

  /** Receiver identification. Optional for some document types. */
  receptor?: {
    tipoIdentificacion: Identificacion["tipo"];
    numeroIdentificacion: Identificacion["numero"];
  };

  /** Base64-encoded signed XML document. */
  comprobanteXml: string;

  /** Optional callback URL for async status notifications. */
  callbackUrl?: string;
}

/** Response from a successful document submission (HTTP 201/202). */
export interface SubmissionResponse {
  /** Status message. */
  status: number;

  /** Location header — URL to poll for status. */
  location?: string;
}

// ---------------------------------------------------------------------------
// Status polling (GET /recepcion/{clave})
// ---------------------------------------------------------------------------

/** Hacienda processing status values. */
export const HaciendaStatus = {
  /** Received, queued for processing. */
  RECIBIDO: "recibido",
  /** Currently being validated. */
  PROCESANDO: "procesando",
  /** Accepted by Hacienda. */
  ACEPTADO: "aceptado",
  /** Rejected with reason. */
  RECHAZADO: "rechazado",
  /** System error. */
  ERROR: "error",
} as const;

export type HaciendaStatus = (typeof HaciendaStatus)[keyof typeof HaciendaStatus];

/** Response from polling document status. */
export interface StatusResponse {
  /** 50-digit clave. */
  clave: string;

  /** Current processing status. */
  "ind-estado": HaciendaStatus;

  /** Hacienda's response date (ISO 8601). */
  fecha?: string;

  /** Base64-encoded response XML from Hacienda (MensajeHacienda). */
  "respuesta-xml"?: string;
}

// ---------------------------------------------------------------------------
// Comprobantes query (GET /comprobantes)
// ---------------------------------------------------------------------------

/** Explicitly requested, bounded page. Unsupported/date/legacy ID filters fail before I/O. */
export interface ComprobantesQueryParams {
  offset?: number;
  limit?: number;
  /** Combined domestic type + number; preserve any supplied leading zeros. */
  emisor?: string;
  receptor?: string;
}
export interface ComprobanteMetadataIdentity {
  tipoIdentificacion: string;
  numeroIdentificacion: string;
  nombre: string;
}
export interface ComprobanteReference {
  clave: string;
  fecha: string;
}
/** Observed history metadata, never original XML or acceptance evidence. */
export interface ComprobanteListItem {
  clave: string;
  fecha: string;
  emisor: ComprobanteMetadataIdentity;
  receptor: ComprobanteMetadataIdentity;
  notasCredito?: ComprobanteReference[];
  notasDebito?: ComprobanteReference[];
}
export interface ComprobantesListResponse {
  comprobantes: ComprobanteListItem[];
  /** Requested values sent by this wrapper, not provider-effective range. */
  offset: number;
  limit: number;
  pagination: {
    httpStatus: 200 | 206;
    /** Raw observed headers. No inferred total, next offset or coverage claim. */
    acceptRange: string | null;
    contentRange: string | null;
  };
}
/** GET /comprobantes/{clave} is metadata; use /recepcion for status/response. */
export type ComprobanteDetail = ComprobanteListItem;

// ---------------------------------------------------------------------------
// Economic Activity Lookup
// ---------------------------------------------------------------------------

/** Economic activity information. */
export interface ActividadEconomica {
  /** Activity code. */
  codigo: string;

  /** Activity description. */
  descripcion: string;

  /** Whether this activity is currently active. */
  estado: string;
}

/** Response from the economic activity lookup endpoint. */
export interface ActividadEconomicaResponse {
  /** Taxpayer name. */
  nombre: string;

  /** Taxpayer identification. */
  tipoIdentificacion: string;

  /** Economic activities registered. */
  actividades: ActividadEconomica[];
}

// ---------------------------------------------------------------------------
// OAuth2 Token
// ---------------------------------------------------------------------------

/** OAuth2 token response from the IDP. */
export interface TokenResponse {
  /** JWT access token. */
  access_token: string;

  /** Token type (usually "bearer"). */
  token_type: string;

  /** Access token validity in seconds (~300s / 5min). */
  expires_in: number;

  /** Refresh token for silent re-authentication. */
  refresh_token: string;

  /** Refresh token validity in seconds (~36000s / 10hrs). */
  refresh_expires_in: number;

  /** Session state identifier. */
  session_state?: string;

  /** OAuth2 scope. */
  scope?: string;
}
