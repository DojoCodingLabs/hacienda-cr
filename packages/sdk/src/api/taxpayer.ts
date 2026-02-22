/**
 * Supplementary API endpoints — taxpayer economic activity lookup.
 *
 * The Hacienda economic activity API is a separate public endpoint
 * (not part of the recepcion API). It provides taxpayer information
 * and registered economic activities by cedula.
 *
 * @module api/taxpayer
 */

import type { ActividadEconomicaResponse } from "@hacienda-cr/shared";
import { ECONOMIC_ACTIVITY_API_URL } from "@hacienda-cr/shared";

import { ApiError } from "../errors.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Parsed taxpayer information with activities. */
export interface TaxpayerInfo {
  /** Taxpayer name (as registered with Hacienda). */
  readonly nombre: string;
  /** Taxpayer identification type. */
  readonly tipoIdentificacion: string;
  /** List of registered economic activities. */
  readonly actividades: readonly {
    readonly codigo: string;
    readonly descripcion: string;
    readonly estado: string;
  }[];
}

/** Options for the taxpayer lookup. */
export interface LookupTaxpayerOptions {
  /** Custom fetch implementation (for testing). */
  readonly fetchFn?: typeof fetch;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Looks up a taxpayer's economic activities by identification number (cedula).
 *
 * Calls the public Hacienda economic activity API endpoint, which does
 * not require authentication.
 *
 * @param id - The taxpayer identification number (cedula).
 * @param options - Optional configuration (custom fetch, etc.).
 * @returns Taxpayer info with activities.
 * @throws {ApiError} If the lookup fails (e.g., 404 for unknown cedula).
 */
export async function lookupTaxpayer(
  id: string,
  options?: LookupTaxpayerOptions,
): Promise<TaxpayerInfo> {
  const fetchFn = options?.fetchFn ?? globalThis.fetch;
  const url = `${ECONOMIC_ACTIVITY_API_URL}?identificacion=${encodeURIComponent(id)}`;

  let response: Response;
  try {
    response = await fetchFn(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
  } catch (error) {
    throw new ApiError(
      `Network error looking up taxpayer ${id}: ${error instanceof Error ? error.message : String(error)}`,
      undefined,
      undefined,
      error,
    );
  }

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = await response.text().catch(() => undefined);
    }

    if (response.status === 404) {
      throw new ApiError(`Taxpayer not found for identification: ${id}`, 404, body);
    }

    throw new ApiError(
      `Taxpayer lookup failed (${String(response.status)}): ${id}`,
      response.status,
      body,
    );
  }

  let data: ActividadEconomicaResponse;
  try {
    data = (await response.json()) as ActividadEconomicaResponse;
  } catch (error) {
    throw new ApiError(
      `Invalid response from economic activity API for ${id}`,
      response.status,
      undefined,
      error,
    );
  }

  return {
    nombre: data.nombre,
    tipoIdentificacion: data.tipoIdentificacion,
    actividades: data.actividades.map((a) => ({
      codigo: a.codigo,
      descripcion: a.descripcion,
      estado: a.estado,
    })),
  };
}
