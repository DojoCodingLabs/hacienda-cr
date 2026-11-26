/**
 * Local submission state for `hacienda submit`: one clave, one set of signed bytes.
 *
 * XAdES embeds a signing time, so signing the same draft twice yields
 * different bytes under the same clave. The CLI therefore keeps the signed
 * bytes of the first run in the SDK `FileDocumentStore` (immutable bytes per
 * clave plus delivery state) and records each authorized POST in the SDK
 * `FileSubmissionIdentityStore`. A later run for the same clave reuses the
 * stored bytes instead of signing again, and refuses before any network call
 * when the draft changed or a POST was already attempted.
 *
 * Both stores live under `<configDir>/submissions/<environment>/`, so sandbox
 * and production claves never block each other.
 *
 * @module utils/submission-state
 */

import { join } from "node:path";
import {
  createDefaultStore,
  createDefaultSubmissionIdentityStore,
  getConfigDir,
  situationFromClave,
} from "@dojocoding/hacienda-sdk";
import type {
  DeliverySituation,
  DeliveryState,
  FileDocumentStore,
  FileSubmissionIdentityStore,
  StoredDocument,
} from "@dojocoding/hacienda-sdk";

/** Stores used by `hacienda submit` for one Hacienda environment. */
export interface SubmissionStores {
  /** Directory holding both stores. */
  readonly dir: string;
  /** Signed bytes and delivery state per clave (`<dir>/delivery`). */
  readonly documents: FileDocumentStore;
  /** sha256 of the signed bytes and POST attempts per clave (`<dir>/submission-identity`). */
  readonly identities: FileSubmissionIdentityStore;
}

/** Opens the submission stores for an environment in the CLI config directory. */
export function openSubmissionStores(environment: string, configDir?: string): SubmissionStores {
  if (environment !== "sandbox" && environment !== "production")
    throw new Error(`Invalid environment for submission state: ${environment}`);
  const dir = join(getConfigDir(configDir), "submissions", environment);
  return {
    dir,
    documents: createDefaultStore(dir),
    identities: createDefaultSubmissionIdentityStore(dir),
  };
}

/**
 * What the CLI may do with a clave, decided locally before any network call.
 *
 * - `first`: nothing is stored; sign and submit as before.
 * - `unattempted`: signed bytes are stored but no POST was ever authorized;
 *   send the stored bytes without signing again.
 * - `attempted`: a POST was authorized and may have reached Hacienda; only an
 *   explicit `--retry-same-bytes` resends the stored bytes.
 * - `final`: the stored delivery state is terminal; never resend.
 * - `changed`: the input no longer matches the stored signed document.
 * - `bytes_missing`: a POST was recorded but the signed bytes are gone.
 */
export type SubmissionDecision =
  | { readonly kind: "first" }
  | { readonly kind: "unattempted"; readonly document: StoredDocument }
  | { readonly kind: "attempted"; readonly document: StoredDocument; readonly attempts: number }
  | { readonly kind: "final"; readonly state: DeliveryState }
  | { readonly kind: "changed"; readonly state: DeliveryState }
  | { readonly kind: "bytes_missing" };

const TERMINAL_STATES: ReadonlySet<DeliveryState> = new Set(["ACEPTADO", "RECHAZADO", "VENCIDO"]);

/** Inspects local state for a clave. Performs no network access. */
export async function inspectSubmission(
  stores: SubmissionStores,
  clave: string,
  unsignedXml: string,
): Promise<SubmissionDecision> {
  const [document, identity] = await Promise.all([
    stores.documents.get(clave),
    stores.identities.get(clave),
  ]);
  if (!document) return identity ? { kind: "bytes_missing" } : { kind: "first" };
  if (!signedXmlMatchesUnsigned(document.xml, unsignedXml))
    return { kind: "changed", state: document.state };
  if (TERMINAL_STATES.has(document.state)) return { kind: "final", state: document.state };
  if (!identity && document.state === "FIRMADO") return { kind: "unattempted", document };
  return { kind: "attempted", document, attempts: identity?.attempts ?? 0 };
}

const SIGNATURE_OPEN = "<ds:Signature ";
const SIGNATURE_CLOSE = "</ds:Signature>";

/**
 * Returns true when `signedXml` is exactly `unsignedXml` plus one enveloped
 * `ds:Signature` element (the SDK signer appends it as the last child of the
 * root and drops only trailing whitespace). Any other difference counts as a
 * changed draft, so an unexpected serialization fails closed.
 */
export function signedXmlMatchesUnsigned(signedXml: string, unsignedXml: string): boolean {
  const start = signedXml.indexOf(SIGNATURE_OPEN);
  if (start < 0 || signedXml.indexOf(SIGNATURE_OPEN, start + 1) !== -1) return false;
  const end = signedXml.lastIndexOf(SIGNATURE_CLOSE);
  if (end < start) return false;
  const stripped = signedXml.slice(0, start) + signedXml.slice(end + SIGNATURE_CLOSE.length);
  return stripped.trimEnd() === unsignedXml.trimEnd();
}

/** Delivery situation and provisional reference the delivery store needs. */
export interface SubmissionSituation {
  readonly situation: DeliverySituation;
  readonly provisionalReference?: string;
}

/**
 * Derives the delivery situation from the clave (digit 42) and, for
 * contingencia, the provisional comprobante it replaces.
 *
 * Anexos y Estructuras v4.4, "apartados" d) (Información de Referencia):
 * documents that replace a physical comprobante issued in contingencia must
 * reference the provisional comprobante; reference code 05 is "Sustituye
 * comprobante provisional por contingencia" (CodigoReferenciaType).
 *
 * @throws If a contingencia clave has no InformacionReferencia with code 05 and a number.
 */
export function submissionSituation(
  clave: string,
  references: readonly { readonly codigo?: string; readonly numero?: string }[] | undefined,
): SubmissionSituation {
  const situation = situationFromClave(clave);
  if (situation !== "contingencia") return { situation };
  const reference = references?.find((ref) => ref.codigo === "05" && ref.numero)?.numero;
  if (!reference)
    throw new Error(
      "A contingencia clave requires an informacionReferencia with codigo 05 and the provisional comprobante numero (Anexos y Estructuras v4.4, Información de Referencia).",
    );
  return { situation, provisionalReference: reference };
}

/** Records a terminal Hacienda status in the delivery store when the transition is valid. */
export async function recordTerminalState(
  stores: SubmissionStores,
  clave: string,
  status: string,
): Promise<void> {
  const to: DeliveryState | undefined =
    status === "aceptado" ? "ACEPTADO" : status === "rechazado" ? "RECHAZADO" : undefined;
  if (!to) return;
  const current = await stores.documents.getState(clave);
  if (current === "PENDIENTE" || current === "ENVIADO")
    await stores.documents.transition(clave, current, to, "Observed after --retry-same-bytes");
}
