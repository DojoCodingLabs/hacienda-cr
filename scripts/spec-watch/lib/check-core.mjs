import { analyze } from "./analyze.mjs";
import { evaluateCanary } from "./canary.mjs";
import { MIN_LINKS } from "./constants.mjs";
import { discover } from "./discover.mjs";
import { allowedHostsFor, createHttp } from "./http.mjs";
import { renderReport } from "./report.mjs";

export async function runCheck({
  manifest,
  fetchFn = fetch,
  timeoutMs,
  maxBytes,
  minLinks = MIN_LINKS,
}) {
  const http = createHttp({
    fetchFn,
    timeoutMs,
    maxBytes,
    allowedHosts: allowedHostsFor(manifest),
  });
  const discovery = await discover({ manifest, http });
  const canary = evaluateCanary({ manifest, discovery, minLinks });
  if (canary.length > 0) {
    return { code: 2, stdout: "", stderr: `${canary.join("\n")}\n`, findings: [], canary };
  }

  let analysis;
  try {
    analysis = await analyze({ manifest, discovery, http, download: true });
  } catch (error) {
    return {
      code: 2,
      stdout: "",
      stderr: `spec:watch: fallo operativo: ${error.message}\n`,
      findings: [],
      canary: [],
    };
  }

  return {
    code: analysis.findings.length > 0 ? 1 : 0,
    stdout: renderReport(analysis.findings),
    stderr: "",
    findings: analysis.findings,
    canary: [],
  };
}
