import { DEFAULT_MAX_BYTES, DEFAULT_TIMEOUT_MS, MAX_REDIRECTS, USER_AGENT } from "./constants.mjs";

function parseContentLength(response) {
  const raw = response.headers?.get?.("content-length");
  if (raw === null || raw === undefined) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function lastModifiedOf(response) {
  const raw = response.headers?.get?.("last-modified");
  return raw ?? null;
}

export function createHttp({
  fetchFn = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxBytes = DEFAULT_MAX_BYTES,
  userAgent = USER_AGENT,
  allowedHosts = [],
} = {}) {
  const hosts = allowedHosts instanceof Set ? allowedHosts : new Set(allowedHosts);
  const headers = () => ({ "user-agent": userAgent, accept: "*/*" });

  async function resolve(url, init) {
    let current = url;
    for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
      const target = new URL(current);
      if (hosts.size && !hosts.has(target.host)) {
        throw new Error(`host no declarado en el manifiesto: ${target.host}`);
      }
      const response = await fetchFn(current, init);
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers?.get?.("location");
        if (!location) throw new Error(`redirección sin Location: ${current}`);
        current = new URL(location, current).href;
        continue;
      }
      return { response, url: current };
    }
    throw new Error(`demasiadas redirecciones: ${url}`);
  }

  async function get(url, binary, withMeta) {
    const { response, url: finalUrl } = await resolve(url, {
      redirect: "manual",
      headers: headers(),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.status === 404 || response.status === 410) {
      if (withMeta) return { missing: true, url: finalUrl };
      throw new Error(`HTTP ${response.status}: ${finalUrl}`);
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${finalUrl}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > maxBytes)
      throw new Error(`respuesta excede ${maxBytes} bytes: ${finalUrl}`);
    if (withMeta) {
      return {
        body: buffer,
        lastModified: lastModifiedOf(response),
        contentLength: parseContentLength(response),
        url: finalUrl,
      };
    }
    return binary ? buffer : buffer.toString("utf8");
  }

  async function head(url) {
    const { response, url: finalUrl } = await resolve(url, {
      method: "HEAD",
      redirect: "manual",
      headers: headers(),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.status === 405 || response.status === 501) {
      return { methodNotAllowed: true, url: finalUrl };
    }
    if (response.status === 404 || response.status === 410) {
      return { missing: true, url: finalUrl };
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${finalUrl}`);
    return {
      lastModified: lastModifiedOf(response),
      contentLength: parseContentLength(response),
      url: finalUrl,
    };
  }

  return {
    getText: (url) => get(url, false, false),
    getBytes: (url) => get(url, true, false),
    getMeta: (url) => get(url, true, true),
    head,
  };
}

export function allowedHostsFor(manifest) {
  const hosts = new Set();
  for (const surface of manifest.surfaces ?? []) {
    try {
      hosts.add(new URL(surface.baseUrl ?? surface.url).host);
    } catch {
      /* ignore malformed surface URLs; discovery reports the failure */
    }
  }
  if (manifest.policy?.identifier) {
    try {
      hosts.add(new URL(manifest.policy.identifier).host);
    } catch {
      /* ignore malformed policy URL */
    }
  }
  return hosts;
}
