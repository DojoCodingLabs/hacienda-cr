import { POLICY_URL_CORRECTION } from "./constants.mjs";
import { currentSet } from "./manifest.mjs";
import { parseSurface } from "./parse.mjs";
import { probeSurface } from "./probe.mjs";
import { basenameOf } from "./util.mjs";

export function correctPolicyIdentifier(identifier) {
  return String(identifier).split(POLICY_URL_CORRECTION[0]).join(POLICY_URL_CORRECTION[1]);
}

export async function discover({ manifest, http }) {
  const links = [];
  const probes = [];
  const surfaceStatus = {};
  const { version } = currentSet(manifest);

  for (const surface of manifest.surfaces ?? []) {
    if (surface.type === "cdn-xml-schemas") continue;
    try {
      if (surface.type === "known-file-probe") {
        const records = await probeSurface({ manifest, surface, http });
        probes.push(...records);
        surfaceStatus[surface.id] = { probed: records.length };
        continue;
      }
      if (surface.type !== "atv-page") {
        throw new Error(`tipo de superficie no soportado: ${surface.type}`);
      }
      const html = await http.getText(surface.url);
      const parsed = parseSurface(surface, html);
      surfaceStatus[surface.id] = { count: parsed.length };
      links.push(...parsed);
    } catch (error) {
      surfaceStatus[surface.id] = { error: error.message };
    }
  }

  const policy = manifest.policy;
  if (policy?.identifier) {
    const policyUrl = correctPolicyIdentifier(policy.identifier);
    try {
      const body = await http.getBytes(policyUrl);
      const status = surfaceStatus[policy.sourceSurface] ?? { count: 0 };
      status.count = (status.count ?? 0) + 1;
      surfaceStatus[policy.sourceSurface] = status;
      links.push({
        surfaceId: policy.sourceSurface,
        surfaceType: "cdn-xml-schemas",
        url: policyUrl,
        basename: basenameOf(policyUrl),
        version,
        text: "Resolución General",
        watched: true,
        isPolicy: true,
        body,
      });
    } catch (error) {
      surfaceStatus[policy.sourceSurface] = { error: error.message };
    }
  }

  return { links, probes, surfaceStatus };
}
