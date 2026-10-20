/**
 * Implementación de archivo del almacén de comprobantes (outbox).
 * Un archivo por documento, escritura atómica (temporal + rename).
 */

import {
  readFileSync,
  writeFileSync,
  unlinkSync,
  readdirSync,
  renameSync,
  mkdirSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  DocumentStore,
  StoredDocument,
  FileStoreOptions,
  DeliveryState,
  TransitionRecord,
} from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Genera un ID único para archivo temporal. */
function generateTempName(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.tmp`;
}

/** Almacén de comprobantes basado en archivos. */
export class FileDocumentStore implements DocumentStore {
  private readonly baseDir: string;
  private readonly retentionDays: number;

  constructor(options: FileStoreOptions) {
    this.baseDir = options.baseDir;
    this.retentionDays = options.retentionDays ?? 1825; // 5 años

    // Crear directorio si no existe
    try {
      readdirSync(this.baseDir);
    } catch {
      mkdirSync(this.baseDir, { recursive: true });
    }
  }

  /** Ruta del archivo para una clave. */
  private filePath(clave: string): string {
    // Sanitizar clave para nombre de archivo seguro
    const safe = clave.replace(/[^a-zA-Z0-9]/g, "_");
    return join(this.baseDir, `${safe}.json`);
  }

  async persist(doc: StoredDocument): Promise<void> {
    const path = this.filePath(doc.clave);
    const tempPath = join(dirname(path), generateTempName());

    const data = JSON.stringify(doc, null, 2);
    writeFileSync(tempPath, data, "utf8");
    renameSync(tempPath, path); // atómico en POSIX
  }

  async get(clave: string): Promise<StoredDocument | null> {
    const path = this.filePath(clave);
    try {
      const data = readFileSync(path, "utf8");
      return JSON.parse(data) as StoredDocument;
    } catch (e) {
      const err = e as NodeJS.ErrnoException;
      if (err.code === "ENOENT") return null;
      throw err;
    }
  }

  async listPending(): Promise<StoredDocument[]> {
    const pendingStates: DeliveryState[] = ["PENDIENTE", "ALMACENADO", "FIRMADO"];
    const results: StoredDocument[] = [];

    try {
      const files = readdirSync(this.baseDir);
      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        const path = join(this.baseDir, file);
        try {
          const data = readFileSync(path, "utf8");
          const doc = JSON.parse(data) as StoredDocument;
          if (pendingStates.includes(doc.state)) {
            results.push(doc);
          }
        } catch {
          // Ignorar archivos corruptos
        }
      }
    } catch {
      // Directorio no existe o error de lectura
    }

    return results;
  }

  async transition(
    clave: string,
    from: DeliveryState,
    to: DeliveryState,
    reason?: string,
  ): Promise<void> {
    const doc = await this.get(clave);
    if (!doc) throw new Error(`Documento no encontrado: ${clave}`);
    if (doc.state !== from) {
      throw new Error(`Estado inválido: esperado ${from}, actual ${doc.state}`);
    }

    const transition: TransitionRecord = {
      from,
      to,
      at: new Date().toISOString(),
      reason,
    };

    doc.state = to;
    doc.transitions.push(transition);
    await this.persist(doc);
  }

  async update(clave: string, patch: Partial<StoredDocument>): Promise<void> {
    const doc = await this.get(clave);
    if (!doc) throw new Error(`Documento no encontrado: ${clave}`);

    Object.assign(doc, patch);
    await this.persist(doc);
  }

  async getState(clave: string): Promise<DeliveryState | null> {
    const doc = await this.get(clave);
    return doc?.state ?? null;
  }

  /** Limpia documentos antiguos según retención. */
  async cleanup(): Promise<number> {
    let removed = 0;
    const now = Date.now();
    const maxAge = this.retentionDays * 24 * 60 * 60 * 1000;

    try {
      const files = readdirSync(this.baseDir);
      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        const path = join(this.baseDir, file);
        try {
          const data = readFileSync(path, "utf8");
          const doc = JSON.parse(data) as StoredDocument;
          const generatedAt = new Date(doc.generatedAt).getTime();
          if (now - generatedAt > maxAge) {
            unlinkSync(path);
            removed++;
          }
        } catch {
          // Ignorar errores de parseo
        }
      }
    } catch {
      // Directorio no existe
    }

    return removed;
  }
}

/** Crea el almacén por defecto del SDK. */
export function createDefaultStore(configDir: string): FileDocumentStore {
  const deliveryDir = join(configDir, "delivery");
  mkdirSync(deliveryDir, { recursive: true });
  return new FileDocumentStore({ baseDir: deliveryDir });
}
