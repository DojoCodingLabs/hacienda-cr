import { basenameOf, parseVersion } from "./util.mjs";
import { isWatchedBasename } from "./watched.mjs";

const ANCHOR_RE = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
const ATTR_RE = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
const ATV_PATH_RE = /docs\/esquemas\/\d+\/v(\d+)\.(\d+)\//i;

function decodeEntities(text) {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/gi, "'");
}

function stripTags(html) {
  return decodeEntities(html.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

export function extractAnchors(html) {
  const anchors = [];
  for (const match of html.matchAll(ANCHOR_RE)) {
    const attributes = {};
    for (const attr of match[1].matchAll(ATTR_RE)) {
      attributes[attr[1].toLowerCase()] = attr[2] ?? attr[3] ?? "";
    }
    anchors.push({
      href: attributes.href ?? "",
      id: attributes.id ?? "",
      title: attributes.title ?? "",
      text: stripTags(match[2]),
    });
  }
  return anchors;
}

function makeLink(surface, resolved, version, text) {
  const basename = basenameOf(resolved.href);
  return {
    surfaceId: surface.id,
    surfaceType: surface.type,
    url: resolved.href,
    basename,
    version,
    text,
    watched: isWatchedBasename(basename),
  };
}

export function parseSurface(surface, html) {
  const links = [];
  for (const anchor of extractAnchors(html)) {
    const href = anchor.href.trim();
    if (!href || /^(?:#|mailto:|javascript:|data:)/i.test(href)) continue;
    let resolved;
    try {
      resolved = new URL(href, surface.url);
    } catch {
      continue;
    }
    if (surface.type === "atv-page") {
      const match = resolved.pathname.match(ATV_PATH_RE);
      if (!match) continue;
      const version = parseVersion(`${match[1]}.${match[2]}`);
      if (!version) continue;
      links.push(makeLink(surface, resolved, version, anchor.text));
    }
  }
  return links;
}
