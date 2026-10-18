# Read-only history contract correction (issue 80)

Source: [Hacienda's API reference](https://www.hacienda.go.cr/docs/ComprobantesElectronicosAPI.html), reviewed 18 October 2026 UTC. The documented history list is a metadata array. The detail endpoint supplies metadata/references; `/recepcion/{clave}` is the distinct status/response observation. No authenticated Hacienda request was made for this implementation.

## Explicit pre-1.0 minor migration

The former wrappers assumed an undocumented object with totals, status and original XML. Keeping that promise would fabricate data. The next reviewed release keeps `listComprobantes` / `getComprobante` names but corrects shared types and outputs, with a minor Changeset for all four linked 0.x packages. Current published 0.7.0 is unchanged until a separate release; application adoption must pin that reviewed release afterward. That package version advances even though fiscal mapping/rules do not. The application must separately review current history consumption versus immutable historical FE/NC SDK 0.7 proofs/cases; this PR never relabels those tuples, changes the app pin or authorizes transport.

```ts
const page = await listComprobantes(
  http,
  {
    offset: 0,
    limit: 20,
    emisor: "02003101234567",
    receptor: "01123456789",
  },
  { signal },
);
// page.comprobantes: { clave, fecha, emisor, receptor, notasCredito?, notasDebito? }[]
// page.offset / page.limit are the explicit request sent, not an effective range.
// page.pagination: { httpStatus: 200|206, acceptRange: string|null, contentRange: string|null }
const metadata = await getComprobante(http, clave, { signal });
// Use getStatus(http, clave, { signal }) separately for status/response observation.
```

Replace `fechaEmision` with the actual metadata field `fecha`. Remove `estado`, `comprobanteXml`, `respuestaXml`, `fechaRespuesta` and `totalRegistros` assumptions. There is no fabricated next offset, effective item count or full-history flag. The SDK makes one bounded request; an absent, malformed or ambiguous range remains a raw observation. Even an empty page or HTTP 200 does not establish complete historic coverage.

Only offset/limit/emisor/receptor are accepted. The SDK explicitly requests defaults 0/50 when omitted, with a deliberate per-call safety bound of 50 and safe integer offset. Unsupported date/legacy `emisorIdentificacion` / `receptorIdentificacion` filters fail before client authentication. CLI validates raw option names before bootstrapping; MCP publishes a strict input schema and validates before authentication.

## Identity and metadata scope

Filters retain exact combined type + number strings. Domestic types 01/02/03/04 support their current v4.4 native lengths (9/10/11–12/10), and explicit left-zero padding to a 12-digit number as shown by the API example. Those numeric native widths are the current shared domestic identification policy. The [official FE 4.4 schema](https://www.hacienda.go.cr/docs/FacturaElectronica_V4.4.xsd), vendored/verified by the repository, allows broader bounded string identifiers; this history wrapper does not establish new foreign filter semantics from that fiscal schema. Current shared clave validation also preserves letters only in the taxpayer segment; history never newly restricts it to all digits. The history API does not establish free-form foreign 05/06 filtering, so those filters fail explicitly rather than being truncated to an arbitrary 14-character cap. Metadata itself preserves bounded observed identity/name strings; it is not a fiscal identification validator. Filter comparison uses a 12-digit comparison form without changing returned strings or removing original zeroes.

Both supplied party filters must match every returned row. Detail clave must equal the requested current 50-character clave. Malformed parsed successful metadata, foreign filtered identity, wrong clave, impossible metadata date-time, unexpected success status and oversized parsed pages fail through the new protocol decoder without attaching raw response metadata/Zod content. Invalid JSON and non-2xx responses still follow the existing generic HttpClient error contract; this PR does not sanitize or redesign those inherited transport errors. Optional reference arrays are retained; unrecognized status/XML fields are omitted from the safe metadata projection rather than promoted to facts.

## Evidence and operational limits

Protocol tests use the real SDK HttpClient with synthetic token/fetch responses, not authenticated provider calls. They cover documented array/detail shape, combined filters/leading zeros, 200/206, missing/ambiguous raw ranges, malformed/foreign responses, pre-auth rejection and cancellation during auth/response reads. CLI and in-memory MCP tests prove pre-auth validation and metadata-only output. A cancelled get callback cannot touch a profile/auth client. The MCP history call forwards its signal after client creation, but its preexisting shared `createMcpApiClient` bootstrap does not accept the caller signal: cancellation during initial authentication remains bounded by the internal auth timeout, not immediate caller cancellation. The SDK real-HttpClient auth/read cancellation tests do not prove MCP bootstrap cancellation. Raw range headers stay unchanged in SDK/JSON; human CLI output uses credential sanitization and terminal/control removal. Fresh tarball consumers check public types in NodeNext/Bundler, real installed HTTP wrappers, CLI rejection and strict stdio MCP discovery/rejection.

No retention horizon, received-document coverage, exhaustive history, original recovery, live filter behavior, numbering inference, resubmission or backfill completeness is certified. Real authorized empirical evidence and separate application continuation/checkpointing are still required before a backfill claim. FE/NC computation, XML order, signing and POST behavior remain unchanged.

### Local verification checkpoint

The final reviewed source passed `pnpm verify`: formatting, official spec integrity, lint/types/builds, 1,451 unit cases (shared 236, SDK 1,091, CLI 75, MCP 49), the four intentionally disabled live SDK cases, 118 script regressions and fresh all-four tarball consumers. The history protocol suite contains 10 real-HttpClient cases. These checks used synthetic fetch/auth fixtures only; no real history call, publication or application adoption occurred. Final source/reviewer SHA is recorded in the PR.
