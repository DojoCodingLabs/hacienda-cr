# Holiday calendar refresh runbook

The SDK embeds a reviewed civil-holiday calendar. It never fetches the network
at runtime. This runbook covers the maintenance job that detects a new official
MTSS letter and the manual steps that follow.

## Source

| Year | Letter                       | URL                                                                              |
| ---- | ---------------------------- | -------------------------------------------------------------------------------- |
| 2025 | `OFP-MTSS-DAJ-AER-956-2024`  | `https://www.mtss.go.cr/temas-laborales/feriados/feriados_calendario_2025.pdf`   |
| 2026 | `OFP-MTSS-DAJ-AER-1076-2025` | `https://www.mtss.go.cr/temas-laborales/feriados/feriados_calendario_2026.pdf`   |
| next | pattern                      | `https://www.mtss.go.cr/temas-laborales/feriados/feriados_calendario_<YEAR>.pdf` |

MTSS normally publishes the next year's letter in late November or early
December. The URL uses `GET`; `HEAD` is rejected by the CDN. `Last-Modified` is
not a reliable freshness signal, so the job compares bytes and hashes.

## When to run

- Automatically: the `Holiday calendar watch` workflow runs weekly from
  15 November to 15 January.
- Manually, any time:

```sh
pnpm holidays:watch                    # next year, control = this year
pnpm holidays:watch --year 2028 --control-year 2027
```

The default year is `current UTC year + 1`; the default control is
`year - 1`.

## Reading the result

| Control | Next year                       | Result                                                                                            | Exit |
| ------- | ------------------------------- | ------------------------------------------------------------------------------------------------- | ---- |
| 200     | 404                             | Not published yet. No action.                                                                     | 0    |
| 404     | any                             | The URL pattern changed. Treat as maintenance.                                                    | 2    |
| 200     | 200, same hash as the local PDF | No change.                                                                                        | 0    |
| 200     | 200, new or different bytes     | Review required. The job saves the PDF to a temp path and prints the extracted dates plus a diff. | 1    |

The job never edits `feriados.json`, `manifest.json` or the README.

## Reviewing a new letter

1. Open the downloaded PDF and confirm the letter id, date and table.
2. Run `pdftotext -layout <file> -` and compare the twelve rows with the job's
   extracted dates. Pay attention to Semana Santa, 31 August and any explicit
   transfer.
3. Check whether a law changed the transfer rule. As of 2025–2026 there is no
   general Monday-transfer rule: Ley 9875 was a transitory for 2020–2024.
   Expediente 23.981 is not law. If a future official source enumerates a
   transfer, record it as an explicit `observed` override for that holiday and
   year; do not add a formula.
4. Copy the PDF to
   `packages/sdk/schemas/feriados/feriados-calendario-<YEAR>.pdf`.
5. Add the year to every entry in `packages/sdk/schemas/feriados/feriados.json`,
   extend `yearRange`, and update `description`/`source` if the letters change.
6. Update `packages/sdk/schemas/feriados/README.md` with the letter id and date.
7. Add the PDF and JSON entries to `packages/sdk/schemas/manifest.json` with
   `sha256`, `bytes`, `vendored: true` and `set: null`.
8. Add or update the regressions in
   `packages/sdk/src/calendar/observed.spec.ts` and the golden table.
9. Run `pnpm spec:verify` and the SDK tests. Add a minor changeset.
10. Update the bounded range in code/tests only after the data is reviewed.

## If the URL pattern changed

The control probe returns 404 even for a year that used to work. Do not treat
that as "not published". Find the new official URL on the MTSS site, update
`holidays-watch.mjs` and this runbook, then re-run the control probe. Keep the
same review and hash rules.

## Local vs remote verification

- `pnpm spec:verify` = local integrity. It hashes every vendored file against
  `manifest.json`. It does not use the network.
- `pnpm holidays:watch` = remote freshness. It only probes and reports; it does
  not modify the calendar.
- `pnpm spec:check` does not cover the feriados directory: those entries have
  `set: null` and are not part of the XSD/ATV surfaces.
