# Exact REP source design

See the [primary evidence and complete proposed boundary](../../../docs/rep-monetary-oracle-research.md).

The SDK must not guess tax liability or choose a native-valid summary convention.
Complete named source/schema/calculation/XML and installed-consumer contracts
follow review of the current partial-payment oracle. App eligibility, actual
cash, cumulative allocation/concurrency, tax declarations, credit and fiscal
activation remain independent. No runtime implementation is authorized by this
research commit.

## Decisions

1. **Tax-first recovery.** Use `min(received, remainingTax)` and preserve the
   reviewed expected cases 5/5/3/100. Do not use a gross-payment proportional
   formula.
2. **2026-only for reference code 17.** The 2024 generation is not supported and
   must not be rewritten to code 04.
3. **CRC same-currency first.** USD and cross-currency cases remain blocked until
   an approved exchange rule exists.
4. **No authority flags.** `eligible: true` and `accepted: true` cannot substitute
   reviewed source evidence.
5. **No invented time.** Use complete chronology with fractional seconds and
   offsets; no `Date.now()` or local calendar.
6. **Archive gate.** This change must not be archived as implemented behavior. It
   is a research/design checkpoint and its spec describes required future behavior,
   not an existing producer.

## Risks / Trade-offs

- A generic REP producer could satisfy the old spec without satisfying the
  reviewed oracle. Mitigation: named cases and explicit blocking conditions.
- External research may become stale. Mitigation: preserve hashes, expected case
  values, and retrieval limits in the spec.
