# Strict current FE names and payment allocations

## Why

Released 0.9 exact FE accepts native-inapplicable issuer/receiver/commercial name
lengths and zero supplied payment allocations. Native XSD enforces names but
permits zero structurally; the current annex requires positive supplied payment
amounts. These are independent current production prerequisites under SDK #85.

## What changes

Tighten only current source validation and its dependent unreleased ordinary
source APIs. Preserve a separate historical shape for read-only schema/math and
calculated output decoding, including original 0.9 behavior. Keep exact strings,
original bytes and existing valid current output unchanged. No retained builder,
compatibility flag, new fiscal case, version bump, publication or app adoption.

## Stage

Root confirmed merged PR #89 at main 7d5891a and approved the separation before
runtime implementation. Exact-head review remains required before merge.
