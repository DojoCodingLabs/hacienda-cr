---
"@dojocoding/hacienda-sdk": minor
---

Vendor the official 2025–2026 holiday calendar and stop inferring Monday transfers.

The SDK now accepts civil dates in 2025 and 2026. The calendar keeps the nominal
date unless an official source enumerates a transfer, in which case an explicit
per-year `observed` override is used. The previous 2026-only range, the stale
transfer docstring and the duplicated `CALENDAR_RANGE` are replaced by the
vendored JSON as the single source of truth.

`pnpm holidays:watch` is a maintenance job, not a runtime path: it probes a
control year and the next year, reports whether the letter is unpublished or the
URL pattern changed, and never edits the calendar without review.
