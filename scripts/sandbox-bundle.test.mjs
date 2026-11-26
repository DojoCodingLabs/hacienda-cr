/** Offline tests for the evidence-bundle manifest and verifier: synthetic files only. */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  digest,
  identityFacts,
  identityMatches,
  readRunInput,
  verifyBundle,
  writeRunManifest,
} from "./sandbox-bundle.mjs";

const ISSUER = "3101234567";
const BUYER = "3109876543";
/** 50-digit synthetic clave: 506 + date + taxpayer(12) + consecutive(20) + situation + code. */
function clave(taxpayer, documentType, sequence = 1) {
  const consecutive = `00100001${documentType}${String(sequence).padStart(10, "0")}`;
  return { clave: `506181026${taxpayer.padStart(12, "0")}${consecutive}199999999`, consecutive };
}
const party = (numero) => ({ identificacion: { tipo: "02", numero } });

function feDocument() {
  const { clave: value, consecutive } = clave(ISSUER, "01");
  return {
    family: "FE",
    input: { clave: value, numeroConsecutivo: consecutive, emisor: party(ISSUER) },
  };
}
function fecDocument(taxpayer = BUYER) {
  const { clave: value, consecutive } = clave(taxpayer, "08");
  return {
    family: "FEC",
    input: {
      clave: value,
      numeroConsecutivo: consecutive,
      emisor: party(ISSUER),
      receptor: party(BUYER),
    },
  };
}

/** Lays out a complete synthetic bundle and its manifest. */
async function bundle(document, { outcomeClass = "ACCEPTED", status = "aceptado", file } = {}) {
  const directory = mkdtempSync(join(tmpdir(), "sandbox-bundle-"));
  const write = (name, content) => writeFileSync(join(directory, name), content);
  write(
    file ?? "document.json",
    JSON.stringify(file === "invoice.json" ? document.input : document),
  );
  write("unsigned.xml", "<FacturaElectronica/>");
  const signed = "<FacturaElectronica><Signature/></FacturaElectronica>";
  write("signed.xml", signed);
  write("validation-signature.json", JSON.stringify({ xmlHash: digest(signed) }));
  write(
    "request.body.json",
    JSON.stringify({
      clave: document.input.clave,
      comprobanteXml: Buffer.from(signed).toString("base64"),
    }),
  );
  write("response.raw.json", JSON.stringify({ "ind-estado": status }));
  if (status)
    write("validation-result.json", JSON.stringify({ class: outcomeClass, result: { status } }));
  await writeRunManifest({
    directory,
    clave: document.input.clave,
    identityHash: digest(document.input.clave),
    family: document.family,
    outcomeClass,
    observation: { observedAt: "2026-10-18T12:00:00Z" },
    missingReason: "unresolved at manifest build",
  });
  return directory;
}
async function withBundle(document, options, body) {
  const directory = await bundle(document, options);
  try {
    return await body(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
const failed = (verdict) => verdict.checks.filter((check) => !check.ok).map((check) => check.check);

test("a complete bundle verifies as VALID with exit code 0", async () => {
  await withBundle(feDocument(), {}, async (directory) => {
    const manifest = JSON.parse(readFileSync(join(directory, "manifest.json"), "utf8"));
    assert.equal(manifest.documentType, "01");
    assert.equal(manifest.family, "FE");
    assert.deepEqual(manifest.missing, []);
    assert.equal(manifest.links.comprobanteXmlHash, manifest.links.signedXmlHash);
    const verdict = await verifyBundle(directory);
    assert.deepEqual(failed(verdict), []);
    assert.deepEqual(verdict.summary, { ok: true, result: "VALID", causedBy: null });
    assert.equal(verdict.exitCode, 0);
  });
});

test("a legacy invoice.json bundle verifies against the issuer", async () => {
  await withBundle(feDocument(), { file: "invoice.json" }, async (directory) => {
    assert.equal((await verifyBundle(directory)).exitCode, 0);
  });
});

test("an FEC bundle binds the clave to the buyer", async () => {
  await withBundle(fecDocument(), {}, async (directory) => {
    assert.equal((await verifyBundle(directory)).exitCode, 0);
  });
  await withBundle(fecDocument(ISSUER), {}, async (directory) => {
    const verdict = await verifyBundle(directory);
    assert.deepEqual(failed(verdict), ["identity"]);
    assert.equal(verdict.exitCode, 1);
  });
});

test("a tampered artifact is reported as CORRUPT with the affected link", async () => {
  for (const [name, link] of [
    ["signed.xml", "signedXmlHash"],
    ["unsigned.xml", "unsignedXmlHash"],
    ["response.raw.json", "responseBodyHash"],
    ["document.json", "invoiceHash"],
  ]) {
    await withBundle(feDocument(), {}, async (directory) => {
      writeFileSync(join(directory, name), readFileSync(join(directory, name), "utf8") + " ");
      const verdict = await verifyBundle(directory);
      assert.ok(failed(verdict).includes(link), `${name}: ${failed(verdict)}`);
      assert.equal(verdict.summary.result, "CORRUPT");
      assert.equal(verdict.exitCode, 1);
    });
  }
});

test("a request body that carries a different comprobante breaks the chain", async () => {
  await withBundle(feDocument(), {}, async (directory) => {
    writeFileSync(
      join(directory, "request.body.json"),
      JSON.stringify({ comprobanteXml: Buffer.from("<other/>").toString("base64") }),
    );
    assert.deepEqual(failed(await verifyBundle(directory)), [
      "requestBodyHash",
      "comprobanteXmlHash",
    ]);
  });
});

test("a declared outcome that contradicts the persisted status is incoherent", async () => {
  await withBundle(
    feDocument(),
    { outcomeClass: "ACCEPTED", status: "rechazado" },
    async (directory) =>
      assert.deepEqual(failed(await verifyBundle(directory)), ["outcomeCoherence"]),
  );
});

test("a partial bundle with justified null hashes is INCOMPLETE (exit 2)", async () => {
  const directory = mkdtempSync(join(tmpdir(), "sandbox-bundle-"));
  try {
    const document = feDocument();
    writeFileSync(join(directory, "document.json"), JSON.stringify(document));
    await writeRunManifest({
      directory,
      clave: document.input.clave,
      identityHash: digest(document.input.clave),
      family: "FE",
      outcomeClass: "TRANSPORT_BLOCKED",
      missingReason: "run failed: BLOCKED",
    });
    const verdict = await verifyBundle(directory);
    assert.deepEqual(failed(verdict), []);
    assert.equal(verdict.summary.result, "INCOMPLETE");
    assert.equal(verdict.exitCode, 2);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("a null hash without a missing entry is CORRUPT", async () => {
  await withBundle(feDocument(), {}, async (directory) => {
    const path = join(directory, "manifest.json");
    const manifest = JSON.parse(readFileSync(path, "utf8"));
    manifest.links.unsignedXmlHash = null;
    writeFileSync(path, JSON.stringify(manifest));
    assert.deepEqual(failed(await verifyBundle(directory)), ["unsignedXmlHash"]);
  });
});

test("a directory without a manifest requires one", async () => {
  const directory = mkdtempSync(join(tmpdir(), "sandbox-bundle-"));
  try {
    const verdict = await verifyBundle(directory);
    assert.equal(verdict.manifestRequired, true);
    assert.equal(verdict.exitCode, 1);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("identity facts follow each family's clave owner and document type", async () => {
  const fe = feDocument();
  assert.equal(identityMatches(identityFacts({ ...fe, legacy: false })), true);
  assert.equal(
    identityMatches(identityFacts({ family: "TE", input: fe.input, legacy: false })),
    false,
  );
  assert.equal(
    identityMatches(identityFacts({ family: "NOPE", input: fe.input, legacy: false })),
    false,
  );
  const { clave: nc, consecutive } = clave(ISSUER, "03");
  const original = { emisor: party(ISSUER) };
  assert.equal(
    identityMatches(
      identityFacts({
        family: "NC",
        input: { clave: nc, numeroConsecutivo: consecutive, original },
        legacy: false,
      }),
    ),
    true,
  );
  const directory = mkdtempSync(join(tmpdir(), "sandbox-bundle-"));
  try {
    writeFileSync(join(directory, "document.json"), JSON.stringify({ input: {} }));
    await assert.rejects(readRunInput(directory), /MISSING_FAMILY/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
