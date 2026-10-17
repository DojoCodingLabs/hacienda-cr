import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { basenameOf, foldName } from "./spec-watch/lib/util.mjs";

const root = resolve(import.meta.dirname, "..");
const override = process.env.SPEC_VERIFY_SCHEMAS_DIR;
const schemasDir = override
  ? resolve(process.cwd(), override)
  : join(root, "packages", "sdk", "schemas");

const ALLOWLIST = ["manifest.json", "README.md", "codes.json"];
const REMEDY =
  "spec:verify: remedio: revisa git diff; si el cambio es legítimo, ejecuta pnpm spec:update y revisa su diff antes de commitear";

// Cerrado a propósito: la URI del algoritmo es un identificador opaco y
// `sdkStatus` es el contrato del gate con la fase 3. Un valor nuevo exige
// actualizar gate, spec y README en el mismo commit.
const POLICY_DIGEST_METHOD = "http://www.w3.org/2001/04/xmlenc#sha256";
const POLICY_SDK_STATUSES = ["pending-sdk-migration", "aligned"];
const POLICY_REMEDY_NOTE = "pnpm spec:update no recalcula policy.*";

const violations = [];
const manifestError = (detail, expected) =>
  `spec:verify: manifest.json: ${detail} (esperado: ${expected})`;
const isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
// Los fallos del bloque `policy` añaden su propio remedio: el genérico sugiere
// `spec:update`, que nunca recalcula `policy.*` (D5).
const policyViolation = (message, remedy) => ({ message, remedy });

let manifest = null;
try {
  manifest = JSON.parse(readFileSync(join(schemasDir, "manifest.json"), "utf8"));
} catch (error) {
  violations.push(
    error.code === "ENOENT"
      ? manifestError("falta", "manifest.json presente")
      : manifestError(`JSON inválido: ${error.message}`, "JSON parseable"),
  );
}

if (manifest !== null) {
  if (manifest.schemaVersion !== 1)
    violations.push(
      manifestError(`schemaVersion=${JSON.stringify(manifest.schemaVersion)}`, "schemaVersion=1"),
    );

  const surfaces = Array.isArray(manifest.surfaces) ? manifest.surfaces : [];
  const surfaceIds = new Set(
    surfaces.filter((s) => isObject(s) && typeof s.id === "string").map((s) => s.id),
  );
  const sets = Array.isArray(manifest.sets) ? manifest.sets : [];
  const setIds = new Set(
    sets.filter((s) => isObject(s) && typeof s.id === "string").map((s) => s.id),
  );

  if (typeof manifest.currentSet !== "string" || !setIds.has(manifest.currentSet))
    violations.push(
      manifestError(
        `currentSet=${JSON.stringify(manifest.currentSet)} sin correspondencia en sets[]`,
        "un id presente en sets[]",
      ),
    );

  const checkSurface = (value, label) => {
    if (typeof value !== "string" || !surfaceIds.has(value))
      violations.push(
        manifestError(
          `${label}=${JSON.stringify(value)} sin correspondencia en surfaces[]`,
          "un id presente en surfaces[]",
        ),
      );
  };
  sets.forEach((set, index) => checkSurface(set?.sourceSurface, `sets[${index}].sourceSurface`));

  const policy = manifest.policy;
  if (!isObject(policy)) {
    violations.push(
      manifestError(
        "policy ausente o no es un objeto",
        "policy con identifier, digestMethod, digestValue y sdkStatus",
      ),
    );
  } else {
    for (const field of ["identifier", "digestMethod", "digestValue", "sdkStatus"])
      if (typeof policy[field] !== "string" || policy[field] === "")
        violations.push(
          manifestError(`policy.${field} ausente o vacío`, `policy.${field} string no vacío`),
        );
    if (typeof policy.digestMethod === "string" && policy.digestMethod !== "")
      if (policy.digestMethod !== POLICY_DIGEST_METHOD)
        violations.push(
          policyViolation(
            `spec:verify: policy.digestMethod: ${POLICY_DIGEST_METHOD} (esperado) vs ${policy.digestMethod} (obtenido)`,
            `spec:verify: remedio: ${POLICY_REMEDY_NOTE}; corrige policy.digestMethod contra la URI del Anexo 2`,
          ),
        );
    if (typeof policy.sdkStatus === "string" && policy.sdkStatus !== "")
      if (!POLICY_SDK_STATUSES.includes(policy.sdkStatus))
        violations.push(
          policyViolation(
            `spec:verify: policy.sdkStatus: valores admitidos [${POLICY_SDK_STATUSES.join(", ")}] vs ${policy.sdkStatus} (obtenido)`,
            `spec:verify: remedio: ${POLICY_REMEDY_NOTE}; corrige policy.sdkStatus contra los valores admitidos en el README`,
          ),
        );
    checkSurface(policy.sourceSurface, "policy.sourceSurface");
  }

  const files = Array.isArray(manifest.files) ? manifest.files : null;
  if (files === null) {
    violations.push(manifestError("files[] ausente o no es un array", "files[] array"));
  } else {
    const seen = new Set();
    files.forEach((file, index) => {
      const label = `files[${index}]`;
      if (!isObject(file)) {
        violations.push(
          manifestError(`${label} no es un objeto`, "entrada con path, sha256, bytes y vendored"),
        );
        return;
      }
      const { path, sha256, bytes, vendored } = file;
      if (
        typeof path !== "string" ||
        path === "" ||
        path.startsWith("/") ||
        path.split("/").includes("..")
      )
        violations.push(
          manifestError(
            `${label}.path=${JSON.stringify(path)} inválido`,
            "path relativo estilo POSIX sin / inicial ni ..",
          ),
        );
      else if (seen.has(path))
        violations.push(
          manifestError(`${label}.path=${JSON.stringify(path)} duplicado`, "rutas únicas"),
        );
      else seen.add(path);
      if (typeof sha256 !== "string" || !/^[0-9a-f]{64}$/i.test(sha256))
        violations.push(manifestError(`${label}.sha256 inválido`, "sha256 de 64 caracteres hex"));
      if (!Number.isInteger(bytes) || bytes < 0)
        violations.push(
          manifestError(`${label}.bytes=${JSON.stringify(bytes)} inválido`, "bytes entero >= 0"),
        );
      if (typeof vendored !== "boolean")
        violations.push(manifestError(`${label}.vendored inválido`, "vendored booleano"));
    });

    if (violations.length === 0) {
      const declared = new Set(files.map((file) => file.path));

      // D1: localizar el PDF de la política por el nombre plegado de
      // `policy.identifier`; cero o más de un candidato es fallo — el gate
      // nunca compara contra un archivo indeterminado.
      const policyName = foldName(basenameOf(policy.identifier));
      const policyCandidates = files.filter(
        (file) => file.vendored === true && foldName(basenameOf(file.path)) === policyName,
      );
      const policyFile = policyCandidates.length === 1 ? policyCandidates[0] : null;
      if (policyFile === null)
        violations.push(
          policyViolation(
            `spec:verify: policy.identifier: ${policyCandidates.length} candidatos (esperado: exactamente 1) entre los archivos vendored — ${policy.identifier}`,
            `spec:verify: remedio: ${POLICY_REMEDY_NOTE}; revisa que policy.identifier y el nombre vendorizado describan el mismo documento`,
          ),
        );

      let verified = 0;
      for (const file of files) {
        if (file.vendored !== true) continue;
        verified += 1;
        const expectedHash = file.sha256.toLowerCase();
        let stats;
        try {
          stats = lstatSync(join(schemasDir, file.path));
        } catch (error) {
          violations.push(
            error.code === "ENOENT"
              ? `spec:verify: ${file.path}: falta (esperado: sha256=${expectedHash} bytes=${file.bytes})`
              : `spec:verify: ${file.path}: ${error.message}`,
          );
          continue;
        }
        if (stats.isSymbolicLink()) {
          violations.push(`spec:verify: ${file.path}: enlace simbólico no soportado`);
          continue;
        }
        if (stats.size !== file.bytes)
          violations.push(
            `spec:verify: ${file.path}: bytes=${file.bytes} (esperado) vs bytes=${stats.size} (obtenido)`,
          );
        const bytes = readFileSync(join(schemasDir, file.path));
        const digest = createHash("sha256").update(bytes).digest();
        const actualHash = digest.toString("hex");
        if (actualHash !== expectedHash)
          violations.push(
            `spec:verify: ${file.path}: sha256=${expectedHash} (esperado) vs sha256=${actualHash} (obtenido)`,
          );
        // D2: el mismo digest, en Base64, contrastado contra
        // `policy.digestValue` por comparación exacta de strings (Base64
        // estándar con padding `=`; no se normaliza ni se tolera la forma sin
        // `=`, que es la transcripción errónea del INDENT).
        if (policyFile !== null && file.path === policyFile.path) {
          const actualBase64 = digest.toString("base64");
          if (actualBase64 !== policy.digestValue)
            violations.push(
              policyViolation(
                `spec:verify: policy.digestValue: ${actualBase64} (esperado) vs ${policy.digestValue} (obtenido)`,
                `spec:verify: remedio: ${POLICY_REMEDY_NOTE}; recalcula el SHA-256 en Base64 del PDF vendorizado y ponlo en policy.digestValue (o restaura el PDF, si el reemplazo no era intencional)`,
              ),
            );
        }
      }

      const walk = (dir) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          const relPath = relative(schemasDir, join(dir, entry.name));
          if (entry.isSymbolicLink()) {
            violations.push(`spec:verify: ${relPath}: enlace simbólico no soportado`);
            continue;
          }
          if (entry.isDirectory()) {
            walk(join(dir, entry.name));
            continue;
          }
          if (!entry.isFile()) continue;
          if (dir === schemasDir && ALLOWLIST.includes(entry.name)) continue;
          if (declared.has(relPath)) continue;
          violations.push(
            `spec:verify: ${relPath}: no declarado (allowlist en la raíz: manifest.json, README.md, codes.json)`,
          );
        }
      };
      walk(schemasDir);

      if (violations.length === 0) {
        process.stdout.write(`spec:verify: OK (${verified} archivos verificados)\n`);
        process.exit(0);
      }
    }
  }
}

for (const violation of violations) {
  const isPolicy = typeof violation !== "string";
  process.stderr.write(`${isPolicy ? violation.message : violation}\n${REMEDY}\n`);
  if (isPolicy) process.stderr.write(`${violation.remedy}\n`);
}
process.exit(1);
