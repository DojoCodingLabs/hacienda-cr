/** Separate local series for every issuer and declared environment. */
import { createHash } from "node:crypto";
import { readFile, access } from "node:fs/promises";
import { join } from "node:path";
import {
  getConfigDir,
  buildClave,
  assignSequenceWithDocument,
  Situation,
  type DocumentType,
} from "@dojocoding/hacienda-sdk";

export function issuerSequenceDirectory(
  environment: "sandbox" | "production",
  idType: string,
  idNumber: string,
  configDir?: string,
): string {
  const identity = createHash("sha256")
    .update(JSON.stringify([environment, idType, idNumber]))
    .digest("hex");
  return join(getConfigDir(configDir), "issuer-sequences", environment, identity);
}

/**
 * Assigns a sequence number for a document, binding it to a placeholder clave.
 * This replaces the legacy `getNextSequence` which issued loose sequences.
 * The sequence is assigned atomically with a placeholder document record.
 * The caller MUST persist the actual document with the real clave (which includes
 * the assigned sequence) to complete the binding.
 *
 * @deprecated This function issues a sequence without a complete document.
 * Use `assignSequenceWithDocument` directly with the final document clave instead.
 */
export async function nextIssuerSequence(
  environment: "sandbox" | "production",
  idType: string,
  idNumber: string,
  documentType: string,
  branch: string,
  pos: string,
  configDir?: string,
): Promise<number> {
  const destination = issuerSequenceDirectory(environment, idType, idNumber, configDir);
  // The previous unscoped file has no issuer ownership. Never silently restart
  // a used series at one: an operator must seed the scoped series deliberately.
  try {
    const legacy: unknown = JSON.parse(
      await readFile(join(getConfigDir(configDir), "sequences.json"), "utf8"),
    );
    if (
      legacy &&
      typeof legacy === "object" &&
      Object.values(legacy).some((v) => typeof v === "number" && v > 0)
    ) {
      try {
        await access(join(destination, "sequences.json"));
      } catch {
        throw new Error(
          "Legacy numbering exists. Migrate and seed the issuer/environment series before creating a document.",
        );
      }
    }
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }

  // Build a placeholder clave with sequence 0 (will be validated as placeholder)
  const placeholderClave = buildClave({
    date: new Date(),
    taxpayerId: idNumber,
    documentType: documentType as DocumentType,
    sequence: 0,
    situation: Situation.NORMAL,
    branch,
    pos,
  });

  // Assign sequence atomically with placeholder document record
  return assignSequenceWithDocument(documentType, branch, pos, placeholderClave, {
    configDir: destination,
  });
}
