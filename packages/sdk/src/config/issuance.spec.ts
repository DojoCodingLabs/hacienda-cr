import { it, expect } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assignSequenceWithDocument,
  getAssignedDocument,
  getCurrentSequence,
  getNextSequence,
  resetSequence,
  recordSequenceDiscard,
} from "./sequence-store.js";
import { createStoredDocument } from "../delivery/state-machine.js";
import { SIMPLE_INVOICE } from "../__fixtures__/invoices.js";
import { buildFacturaXml } from "../documents/factura-builder.js";
import { createTestP12 } from "../__fixtures__/signing.js";
import { signXml } from "../signing/signer.js";
it("commits signed bytes and sequence together, preserves legacy increments and never rewinds issuance", async () => {
  const directory = await mkdtemp(join(tmpdir(), "hacienda-issuance-test-")),
    options = { configDir: directory };
  const p12 = createTestP12("synthetic");
  const build = async (sequence: number) => {
    const invoice = structuredClone(SIMPLE_INVOICE);
    invoice.clave =
      invoice.clave.slice(0, 31) + String(sequence).padStart(10, "0") + invoice.clave.slice(41);
    invoice.numeroConsecutivo = invoice.clave.slice(21, 41);
    return createStoredDocument({
      clave: invoice.clave,
      xml: await signXml(buildFacturaXml(invoice), p12, "synthetic"),
      situation: "normal",
      generatedAt: new Date(invoice.fechaEmision),
    });
  };
  try {
    await expect(
      assignSequenceWithDocument(
        "01",
        () => {
          throw new Error("builder failed");
        },
        options,
      ),
    ).rejects.toThrow("builder failed");
    expect(await getCurrentSequence("01", undefined, undefined, options)).toBe(0);
    const first = await assignSequenceWithDocument("01", build, options);
    expect(first.sequence).toBe(1);
    expect(required(await getAssignedDocument(first.document.clave, options)).xml).toBe(
      first.document.xml,
    );
    expect(await getNextSequence("01", undefined, undefined, options)).toBe(2);
    const third = await assignSequenceWithDocument("01", build, options);
    expect(third.sequence).toBe(3);
    await recordSequenceDiscard(first.document.clave, "Synthetic discarded draft", options);
    expect(await getAssignedDocument(first.document.clave, options)).not.toBeNull();
    await expect(resetSequence("01", undefined, undefined, 0, options)).rejects.toThrow(/rewind/);
    await expect(
      assignSequenceWithDocument(
        "01",
        async (sequence) => ({ ...(await build(sequence)), xml: first.document.xml }),
        options,
      ),
    ).rejects.toThrow(/identity/);
    expect(await getCurrentSequence("01", undefined, undefined, options)).toBe(3);
    const persisted = JSON.parse(await readFile(join(directory, "sequences.json"), "utf8"));
    expect(Object.keys(persisted.documents)).toHaveLength(2);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

function required<T>(value: T | null | undefined): T {
  if (value == null) throw new Error("Missing required value");
  return value;
}
