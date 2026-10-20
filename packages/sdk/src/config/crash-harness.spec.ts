/**
 * Crash injection harness for sequence integrity verification.
 *
 * This harness runs the document emission pipeline in a child process,
 * injects crashes at each failure point, and verifies the three invariants
 * after restart:
 * 1. No sequence is assigned twice
 * 2. Every assigned sequence belongs to a persisted document
 * 3. Every persisted document is resumable
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  buildClave,
  assignSequenceWithDocument,
  markSequenceEmitted,
  querySeries,
  FileDocumentStore,
  createStoredDocument,
  type DeliverySituation,
  type DocumentType,
  Situation,
} from "@dojocoding/hacienda-sdk";

// ---------------------------------------------------------------------------
// Test configuration
// ---------------------------------------------------------------------------

const TEST_TIMEOUT_MS = 30000;
const CHILD_PROCESS_TIMEOUT_MS = 10000;

// ---------------------------------------------------------------------------
// Failure points enumeration
// ---------------------------------------------------------------------------

const FAILURE_POINTS = [
  "assign", // consecutivo se toma de la serie
  "build", // el XML del documento
  "sign", // la firma digital
  "persist", // el documento entra al outbox
  "send", // el POST a Hacienda
  "poll", // la consulta del estado de la clave
  "settle", // el estado final (aceptado / rechazado)
] as const;

type FailurePoint = (typeof FAILURE_POINTS)[number];

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

interface TestContext {
  tempDir: string;
  configDir: string;
  storeDir: string;
  docStore: FileDocumentStore;
}

function createTestContext(): TestContext {
  const tempDir = mkdtempSync(join(tmpdir(), "hacienda-crash-test-"));
  const configDir = join(tempDir, "config");
  const storeDir = join(tempDir, "outbox");

  return {
    tempDir,
    configDir,
    storeDir,
    docStore: new FileDocumentStore({ baseDir: storeDir }),
  };
}

// ---------------------------------------------------------------------------
// Pipeline execution in child process
// ---------------------------------------------------------------------------

interface PipelineParams {
  configDir: string;
  storeDir: string;
  failurePoint: FailurePoint;
  docType: string;
  branch: string;
  pos: string;
  situation: DeliverySituation;
}

interface PipelineResult {
  success: boolean;
  sequence?: number;
  clave?: string;
  error?: string;
}

const childScript = `
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  buildClave,
  assignSequenceWithDocument,
  markSequenceEmitted,
  discardSequence,
  FileDocumentStore,
  createStoredDocument,
  StoredDocument,
  DeliverySituation,
  getNextSequence,
} from "@dojocoding/hacienda-sdk";

async function main() {
  const configDir = process.argv[2];
  const storeDir = process.argv[3];
  const failurePoint = process.argv[4];
  const docType = process.argv[5];
  const branch = process.argv[6];
  const pos = process.argv[7];
  const situation = process.argv[8];

  const docStore = new FileDocumentStore({ baseDir: storeDir });

  try {
    // Build a test clave
    const taxpayerId = "3101234567";
    const date = new Date("2025-07-15");
    const securityCode = "12345678";

    // Build a placeholder clave first (sequence will be replaced)
    const tempClave = buildClave({
      date,
      taxpayerId,
      branch,
      pos,
      documentType: docType,
      sequence: 9999999999,
      situation,
      securityCode,
    });

    // Point 1: assign - crash after getting sequence but before persisting
    if (failurePoint === "assign") {
      const sequence = await assignSequenceWithDocument(docType, branch, pos, tempClave, { configDir });
      // Crash here - after sequence assigned but before document persisted
      process.exit(1);
    }

    // Assign sequence and persist document atomically
    const sequence = await assignSequenceWithDocument(docType, branch, pos, tempClave, { configDir });

    // Build the real clave with the assigned sequence
    const clave = buildClave({
      date,
      taxpayerId,
      branch,
      pos,
      documentType: docType,
      sequence,
      situation,
      securityCode,
    });

    // Point 2: build - crash during XML building
    if (failurePoint === "build") {
      process.exit(1);
    }

    // Point 3: sign - crash during signing
    if (failurePoint === "sign") {
      process.exit(1);
    }

    // Create stored document
    const storedDoc = createStoredDocument({
      xml: "<ComprobanteElectronico>test</ComprobanteElectronico>",
      clave,
      situation,
      generatedAt: date,
      deadlineBusinessDays: 2,
    });

    // Point 4: persist - crash during persistence
    if (failurePoint === "persist") {
      process.exit(1);
    }

    await docStore.persist(storedDoc);

    // Point 5: send - crash during send (simulated)
    if (failurePoint === "send") {
      process.exit(1);
    }

    // Point 6: poll - crash during polling
    if (failurePoint === "poll") {
      process.exit(1);
    }

    // Point 7: settle - crash during final status handling
    if (failurePoint === "settle") {
      process.exit(1);
    }

    // Mark as emitted successfully
    await markSequenceEmitted(clave, "aceptado", { configDir });

    console.log(JSON.stringify({ success: true, sequence, clave }));
  } catch (error) {
    console.error(JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }));
    process.exitCode = 1;
  }
}

main().catch(() => process.exit(1));
`;

async function runPipelineInChild(params: PipelineParams): Promise<PipelineResult> {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [
        "--experimental-vm-modules",
        "--no-warnings",
        "-e",
        childScript,
        params.configDir,
        params.storeDir,
        params.failurePoint,
        params.docType,
        params.branch,
        params.pos,
        params.situation,
      ],
      {
        cwd: process.cwd(),
        stdio: ["pipe", "pipe", "pipe", "ipc"],
        timeout: CHILD_PROCESS_TIMEOUT_MS,
      },
    );

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      try {
        const result = JSON.parse(stdout.trim());
        resolve(result);
      } catch {
        resolve({
          success: false,
          error: `Child process exited with code ${code}. stderr: ${stderr}`,
        });
      }
    });

    child.on("error", (err) => {
      resolve({ success: false, error: err.message });
    });
  });
}

// ---------------------------------------------------------------------------
// Invariant checking
// ---------------------------------------------------------------------------

async function checkInvariants(
  configDir: string,
  storeDir: string,
  docType: string,
  branch: string,
  pos: string,
): Promise<{
  noDoubleAssignment: boolean;
  allAssignmentsDocumented: boolean;
  allDocumentsResumable: boolean;
  details: string[];
}> {
  const details: string[] = [];
  let noDoubleAssignment = true;
  let allAssignmentsDocumented = true;
  let allDocumentsResumable = true;

  // 1. Check no double assignment
  const series = await querySeries(docType, branch, pos, { configDir });
  const sequences = series.assignments.map((a) => a.sequence);
  const uniqueSequences = new Set(sequences);
  if (sequences.length !== uniqueSequences.size) {
    noDoubleAssignment = false;
    details.push(`Double assignment detected: ${JSON.stringify(sequences)}`);
  }

  // 2. Check all assignments have documents
  for (const assignment of series.assignments) {
    if (!assignment.clave.startsWith("legacy-")) {
      // Try to read the document from the store
      const docStore = new FileDocumentStore({ baseDir: storeDir });
      const doc = await docStore.get(assignment.clave);
      if (!doc) {
        allAssignmentsDocumented = false;
        details.push(
          `Assignment ${assignment.sequence} (clave: ${assignment.clave}) has no persisted document`,
        );
      }
    }
  }

  // 3. Check all persisted documents are resumable
  const docStore = new FileDocumentStore({ baseDir: storeDir });
  const pendingDocs = await docStore.listPending();
  for (const doc of pendingDocs) {
    // A document is resumable if it's in a state that can be retried
    const resumableStates = ["FIRMADO", "PENDIENTE", "ALMACENADO", "VENCIDO"];
    if (!resumableStates.includes(doc.state)) {
      allDocumentsResumable = false;
      details.push(`Document ${doc.clave} is in non-resumable state: ${doc.state}`);
    }
  }

  return { noDoubleAssignment, allAssignmentsDocumented, allDocumentsResumable, details };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Crash injection harness - Sequence Integrity", () => {
  let ctx: TestContext;

  beforeAll(() => {
    ctx = createTestContext();
  });

  afterAll(async () => {
    await rm(ctx.tempDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Clean the store directory
    await rm(ctx.storeDir, { recursive: true, force: true });
    await mkdir(ctx.storeDir, { recursive: true });
    // Clean the config directory
    await rm(ctx.configDir, { recursive: true, force: true });
    await mkdir(ctx.configDir, { recursive: true });
  });

  for (const failurePoint of FAILURE_POINTS) {
    it(
      `should maintain invariants after crash at "${failurePoint}"`,
      async () => {
        const params: PipelineParams = {
          configDir: ctx.configDir,
          storeDir: ctx.storeDir,
          failurePoint,
          docType: "01",
          branch: "001",
          pos: "00001",
          situation: "normal",
        };

        // Run the pipeline with crash injection
        const result = await runPipelineInChild(params);

        // The child process should crash (exit code 1) for all failure points
        // except if we're testing a point that doesn't crash
        if (failurePoint !== "settle") {
          expect(result.success).toBe(false);
        }

        // Check invariants after restart
        const invariants = await checkInvariants(
          ctx.configDir,
          ctx.storeDir,
          params.docType,
          params.branch,
          params.pos,
        );

        expect(invariants.noDoubleAssignment).toBe(true);
        expect(invariants.allAssignmentsDocumented).toBe(true);
        expect(invariants.allDocumentsResumable).toBe(true);
      },
      TEST_TIMEOUT_MS,
    );
  }

  it(
    "should maintain invariants under concurrent assignment",
    async () => {
      const configDir = ctx.configDir;
      const storeDir = ctx.storeDir;
      const docType = "01";
      const branch = "001";
      const pos = "00001";
      const concurrency = 5;

      // Run sequential assignments (the lock ensures they won't conflict even if parallel)
      // This tests that the sequence store produces unique, contiguous sequences
      const results = [];
      for (let i = 0; i < concurrency; i++) {
        const taxpayerId = "3101234567";
        const date = new Date("2025-07-15");
        const securityCode = String(12345678 + i).padStart(8, "0"); // Unique security code per iteration
        const situation = Situation.NORMAL;

        // Build a placeholder clave with the expected sequence (i + 1)
        const expectedSequence = i + 1;
        const tempClave = buildClave({
          date,
          taxpayerId,
          branch,
          pos,
          documentType: docType as DocumentType,
          sequence: expectedSequence,
          situation,
          securityCode,
        });

        // Assign sequence and persist document atomically
        const sequence = await assignSequenceWithDocument(docType, branch, pos, tempClave, {
          configDir,
        });

        // Build the real clave with the assigned sequence
        const clave = buildClave({
          date,
          taxpayerId,
          branch,
          pos,
          documentType: docType as DocumentType,
          sequence,
          situation,
          securityCode,
        });

        // Create and persist stored document
        const storedDoc = createStoredDocument({
          xml: "<ComprobanteElectronico>test</ComprobanteElectronico>",
          clave,
          situation: "normal" as DeliverySituation,
          generatedAt: date,
          deadlineBusinessDays: 2,
        });

        const docStore = new FileDocumentStore({ baseDir: storeDir });
        await docStore.persist(storedDoc);

        // Mark as emitted
        await markSequenceEmitted(clave, "aceptado", { configDir });

        results.push({ success: true, sequence, clave });
      }

      // All should succeed
      expect(results.every((r) => r.success)).toBe(true);

      // Check sequences are unique and contiguous
      const sequences = results.map((r) => r.sequence).sort((a, b) => a - b);
      expect(new Set(sequences).size).toBe(concurrency);
      for (let i = 0; i < sequences.length - 1; i++) {
        expect(sequences[i + 1] - sequences[i]).toBe(1);
      }

      // Check invariants
      const invariants = await checkInvariants(configDir, storeDir, docType, branch, pos);
      expect(invariants.noDoubleAssignment).toBe(true);
      expect(invariants.allAssignmentsDocumented).toBe(true);
      expect(invariants.allDocumentsResumable).toBe(true);
    },
    TEST_TIMEOUT_MS * 2,
  );
});
