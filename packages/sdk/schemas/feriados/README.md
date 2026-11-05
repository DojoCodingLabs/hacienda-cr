# Costa Rica civil holidays — 2025–2026

Dates transcribed from two official MTSS letters, page 1:

| Year | Letter                       | Date             | Source                                                                       |
| ---- | ---------------------------- | ---------------- | ---------------------------------------------------------------------------- |
| 2025 | `OFP-MTSS-DAJ-AER-956-2024`  | 22 November 2024 | https://www.mtss.go.cr/temas-laborales/feriados/feriados_calendario_2025.pdf |
| 2026 | `OFP-MTSS-DAJ-AER-1076-2025` | 4 December 2025  | https://www.mtss.go.cr/temas-laborales/feriados/feriados_calendario_2026.pdf |

Both original PDFs are preserved here with a manifest hash. `feriados.json` is a
derived, reviewed transcription, not a byte-identical download. All twelve
dates per year are kept on their listed date ("DÍA DE DISFRUTE"). There are no
transfers in 2025–2026.

## Why there is no Monday-transfer rule

Ley 9875 was a one-time transitory that enumerated the transfers for 2020–2024;
it expired after 2024. The 2025 and 2026 MTSS letters list the nominal dates as
the day of enjoyment. Expediente 23.981 (a permanent transfer of 11 April,
1 May, 25 July and 1 December) is still _dictaminado_ and is not law. The data
model therefore keeps `dates` as the nominal date and allows an explicit
per-year `observed` override only when an official source enumerates a
transfer. No formula infers one.

## Verification boundaries

- `pnpm spec:verify` checks the **local** integrity of this directory: every
  vendored PDF and JSON must match its manifest hash and byte count.
- `pnpm holidays:watch` checks **remote** freshness: it probes a known-published
  control year and the next year, distinguishes "not published yet" from "the
  URL pattern changed", and never edits the calendar. See
  [the refresh runbook](../../../../docs/holidays-refresh.md).

`spec:check` does not probe this directory because the feriados entries have
`set: null`; the dedicated job owns remote freshness.

## Scope

The SDK embeds the JSON, returns copies, and rejects years outside 2025–2026.
This is a civil work calendar. It does not establish a fiscal deadline,
exceptional administrative closures, employer-specific rest days or a legal
infringement. Callers must independently establish the applicable deadline and
start event. The source PDF can be checked with `pdftotext`; adding a year
requires reviewing an official letter and adding regressions before changing
the bounded coverage.
