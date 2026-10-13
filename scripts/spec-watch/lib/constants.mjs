export const USER_AGENT = "curl/8.5.0";

export const DEFAULT_TIMEOUT_MS = 30_000;

export const DEFAULT_MAX_BYTES = 50 * 1024 * 1024;

export const MAX_REDIRECTS = 5;

// Baseline captured 2026-10-08 with a plain curl User-Agent:
// ATV page -> 89 links under docs/esquemas/<year>/v<major>.<minor>/.
// Only surfaces that enumerate have a minimum: OVi publishes no parseable
// listing (SPA portal, /docs/ root has no links) and probes known-file-probe.
export const MIN_LINKS = {
  "atv-page": 30,
};

export const SCHEMA_EXTENSIONS = [".xsd", ".xml"];

export const AUXILIARY_PREFIXES = ["codigodemoneda", "codificacionubicacion"];

export const POLICY_URL_CORRECTION = ["/xmlschemas/", "/xml-schemas/"];
