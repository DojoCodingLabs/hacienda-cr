/**
 * Comparación entre las constantes publicadas de la política XAdES-EPES
 * (`shared/src/constants/xades-policy.ts`) y el bloque `policy` del manifiesto
 * (`packages/sdk/schemas/manifest.json`).
 *
 * Es la lógica del gate de política que `pnpm verify` ejecuta a través de
 * `manifest.spec.ts`. Se aísla aquí, en `__testing__/`, para poder ejercitarla
 * con valores divergentes sin tocar las constantes reales (regresión de la
 * tarea A2 5.2); `tsup` solo publica `src/index.ts`, así que este módulo no
 * forma parte del paquete publicado.
 */
import {
  XADES_POLICY_HASH,
  XADES_POLICY_HASH_ALGORITHM,
  XADES_POLICY_URI,
} from "@dojocoding/hacienda-shared";

export interface PolicyConstants {
  identifier: string;
  digestMethod: string;
  digestValue: string;
}

export interface PolicyManifestBlock {
  identifier: string;
  digestMethod: string;
  digestValue: string;
}

export interface PolicyViolation {
  /** Campo divergente, tal como se nombra en el manifiesto. */
  field: string;
  /** Valor publicado por el SDK (constante). */
  published: string;
  /** Valor esperado, declarado en `manifest.policy`. */
  expected: string;
}

/** Constantes que el SDK publica para la política XAdES-EPES de la v4.4. */
export const SDK_POLICY_CONSTANTS: PolicyConstants = {
  identifier: XADES_POLICY_URI,
  digestMethod: XADES_POLICY_HASH_ALGORITHM,
  digestValue: XADES_POLICY_HASH,
};

/**
 * Devuelve las divergencias byte a byte entre las constantes publicadas y el
 * bloque `policy` del manifiesto. Una lista vacía significa alineación total.
 * Cada divergencia nombra campo, valor publicado (constante) y valor esperado
 * (manifiesto), como exige el requisito «Las constantes publicadas de la
 * política de firma coinciden con el manifiesto».
 */
export function policyManifestViolations(
  constants: PolicyConstants,
  policy: PolicyManifestBlock,
): PolicyViolation[] {
  const fields: Array<[keyof PolicyConstants, string, string]> = [
    ["identifier", constants.identifier, policy.identifier],
    ["digestMethod", constants.digestMethod, policy.digestMethod],
    ["digestValue", constants.digestValue, policy.digestValue],
  ];
  return fields
    .filter(([, published, expected]) => published !== expected)
    .map(([field, published, expected]) => ({ field, published, expected }));
}

/** Formatea las divergencias para el mensaje de fallo del gate. */
export function formatPolicyViolations(violations: PolicyViolation[]): string {
  return violations
    .map(
      ({ field, published, expected }) =>
        `${field}: publicado=${JSON.stringify(published)} esperado=${JSON.stringify(expected)}`,
    )
    .join(", ");
}
