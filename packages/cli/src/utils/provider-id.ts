/**
 * Resolution of `ProveedorSistemas` for CLI-built drafts.
 *
 * Anexos y Estructuras v4.4, Encabezado, field `ProveedorSistemas`
 * ("Proveedor de sistemas para emisión de Comprobantes", String 20):
 *
 * > Se debe indicar la identificación del proveedor de sistemas que esté
 * > utilizando para la emisión de comprobantes electrónicos. En caso de ser un
 * > desarrollo propio o comprado a la medida, se deberá indicar la
 * > identificación del mismo obligado tributario.
 *
 * The value is therefore the software provider's identification, and only
 * equals the issuer's own identification for a self-developed or custom-built
 * system. The profile's `provider_id` wins; without it the CLI keeps its
 * historical default (the issuer's identification) and returns a warning.
 *
 * @module utils/provider-id
 */

import { listProfiles, loadConfig } from "@dojocoding/hacienda-sdk";

export interface ProveedorSistemasResolution {
  /** Value to emit as `proveedorSistemas`. */
  value: string;
  /** Where the value came from. */
  source: "profile" | "issuer";
  /** Present when the value fell back to the issuer's identification. */
  warning?: string;
}

export interface ProviderIdDeps {
  listProfiles: () => Promise<string[]>;
  loadConfig: (profileName: string) => Promise<{ profile: { provider_id?: string } }>;
}

const defaultDeps: ProviderIdDeps = {
  listProfiles: () => listProfiles(),
  loadConfig: (profileName) => loadConfig(profileName),
};

/** Builds the fallback warning for a profile without `provider_id`. */
export function providerIdFallbackWarning(profileName: string, reason: string): string {
  return (
    `proveedorSistemas defaulted to the issuer's identification (${reason}). ` +
    "Anexos y Estructuras v4.4 asks for the identification of the invoicing-system " +
    "provider; the issuer's own identification is correct only for a self-developed " +
    "or custom-built system. Set provider_id in profile " +
    `"${profileName}" (hacienda auth login --provider-id <id>, or provider_id in config.toml).`
  );
}

/**
 * Resolves `proveedorSistemas` from the profile's `provider_id`, falling back
 * to the issuer's identification with a warning.
 *
 * A missing config file or profile falls back. An unreadable or invalid
 * config file is an error: silently ignoring it would hide a misconfigured
 * `provider_id`.
 */
export async function resolveProveedorSistemas(
  issuerId: string,
  profileName: string,
  deps: ProviderIdDeps = defaultDeps,
): Promise<ProveedorSistemasResolution> {
  const profiles = await deps.listProfiles();
  if (!profiles.includes(profileName)) {
    return {
      value: issuerId,
      source: "issuer",
      warning: providerIdFallbackWarning(profileName, `profile "${profileName}" not found`),
    };
  }
  const { profile } = await deps.loadConfig(profileName);
  if (profile.provider_id !== undefined) {
    return { value: profile.provider_id, source: "profile" };
  }
  return {
    value: issuerId,
    source: "issuer",
    warning: providerIdFallbackWarning(profileName, `profile "${profileName}" has no provider_id`),
  };
}
