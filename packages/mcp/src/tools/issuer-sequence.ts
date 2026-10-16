/** Separate local series for every issuer and declared environment. */
import { createHash } from "node:crypto";
import { readFile, access } from "node:fs/promises";
import { join } from "node:path";
import { getConfigDir, getNextSequence } from "@dojocoding/hacienda-sdk";

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
  return getNextSequence(documentType, branch, pos, { configDir: destination });
}
