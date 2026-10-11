const SECTION_TITLES = {
  1: "1. Versión nueva publicada",
  2: "2. Hash distinto en el set vigente o el sondeo",
  3: "3. Archivos agregados o eliminados",
  4: "4. Cambio en auxiliares (revisión humana prioritaria)",
};

function renderFinding(finding) {
  let line = `  - ${finding.path}`;
  if (finding.section === 1) {
    line += `  versión=${finding.version}  ${finding.url}`;
  }
  if (finding.section === 2 || finding.section === 4) {
    line += `  sha256 esperado=${finding.expected} obtenido=${finding.obtained}`;
  }
  if (finding.section === 3) {
    line += `  ${finding.kind}  superficie ${finding.surface}`;
    if (finding.url) line += `  ${finding.url}`;
  }
  if (finding.priority === true) line += "  [revisión humana prioritaria]";
  return line;
}

export function renderReport(findings) {
  if (findings.length === 0) return "spec:check: sin cambios\n";
  const lines = ["spec:check: deriva detectada"];
  for (const section of [1, 2, 3, 4]) {
    const items = findings.filter((finding) => finding.section === section);
    if (items.length === 0) continue;
    lines.push(`${SECTION_TITLES[section]} (${items.length})`);
    for (const item of items) lines.push(renderFinding(item));
  }
  return `${lines.join("\n")}\n`;
}
