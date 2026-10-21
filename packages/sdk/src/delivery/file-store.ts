import { mkdir, readFile, readdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { withFileLock, writeDurableJson } from "../config/durable-file.js";
import { StoredDocumentSchema, isValidTransition } from "./types.js";
import type { DocumentStore, StoredDocument, FileStoreOptions, DeliveryState } from "./types.js";

/** Immutable bytes per clave, serialized transitions and explicit corruption errors. */
export class FileDocumentStore implements DocumentStore {
  constructor(private readonly options: FileStoreOptions) {}
  private path(clave: string): string {
    if (!/^506\d{6}[A-Za-z0-9]{12}\d{29}$/.test(clave)) throw new Error("Invalid document key");
    return join(this.options.baseDir, `${clave}.json`);
  }
  private async locked<T>(work: () => Promise<T>): Promise<T> {
    await mkdir(this.options.baseDir, { recursive: true, mode: 0o700 });
    return withFileLock(join(this.options.baseDir, ".delivery.lock"), work);
  }
  async get(clave: string): Promise<StoredDocument | null> {
    try {
      return StoredDocumentSchema.parse(JSON.parse(await readFile(this.path(clave), "utf8")));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }
  async persist(value: StoredDocument): Promise<void> {
    const doc = StoredDocumentSchema.parse(value);
    await this.locked(async () => {
      const existing = await this.get(doc.clave);
      if (existing) {
        if (
          existing.xml !== doc.xml ||
          existing.situation !== doc.situation ||
          existing.generatedAt !== doc.generatedAt
        )
          throw new Error("A clave already binds different immutable document bytes or metadata");
        return;
      }
      await writeDurableJson(this.path(doc.clave), doc);
    });
  }
  async listPending(): Promise<StoredDocument[]> {
    return this.locked(async () => {
      const result: StoredDocument[] = [];
      for (const file of await readdir(this.options.baseDir)) {
        if (!file.endsWith(".json")) continue;
        const doc = await this.get(file.slice(0, -5));
        if (doc && !["ACEPTADO", "RECHAZADO", "VENCIDO"].includes(doc.state)) result.push(doc);
      }
      return result;
    });
  }
  async transition(
    clave: string,
    from: DeliveryState,
    to: DeliveryState,
    reason?: string,
  ): Promise<void> {
    await this.locked(async () => {
      const doc = await this.get(clave);
      if (!doc || doc.state !== from || !isValidTransition(from, to))
        throw new Error("Delivery transition conflict");
      doc.state = to;
      doc.transitions.push({
        from,
        to,
        at: new Date().toISOString(),
        ...(reason ? { reason } : {}),
      });
      await writeDurableJson(this.path(clave), doc);
    });
  }
  async update(clave: string, patch: Partial<StoredDocument>): Promise<void> {
    if (Object.keys(patch).some((key) => key !== "attempts" && key !== "lastError"))
      throw new Error("Only delivery attempts and diagnostics can be patched");
    await this.locked(async () => {
      const doc = await this.get(clave);
      if (!doc) throw new Error("Document not found");
      await writeDurableJson(this.path(clave), StoredDocumentSchema.parse({ ...doc, ...patch }));
    });
  }
  async getState(clave: string): Promise<DeliveryState | null> {
    return (await this.get(clave))?.state ?? null;
  }
  /** Retention cleanup is opt-in and never deletes unresolved documents. */
  async cleanup(): Promise<number> {
    const days = this.options.retentionDays;
    if (days === undefined) return 0;
    if (!Number.isInteger(days) || days < 1) throw new RangeError("Invalid retention days");
    return this.locked(async () => {
      let removed = 0;
      for (const file of await readdir(this.options.baseDir)) {
        if (!file.endsWith(".json")) continue;
        const doc = await this.get(file.slice(0, -5));
        if (
          doc &&
          ["ACEPTADO", "RECHAZADO"].includes(doc.state) &&
          Date.now() - Date.parse(doc.generatedAt) > days * 86400000
        ) {
          await unlink(this.path(doc.clave));
          removed++;
        }
      }
      return removed;
    });
  }
}
export function createDefaultStore(configDir: string): FileDocumentStore {
  return new FileDocumentStore({ baseDir: join(configDir, "delivery") });
}
