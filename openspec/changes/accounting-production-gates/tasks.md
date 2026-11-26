## 1. Accounting review gate

- [x] 1.1 Document accountant review scope (entries only). Delivered by #133 in `docs/production-integration.md` ("Revisión contable (solo asientos)").
- [x] 1.2a Describe the synthetic invoice categories for accounting review. Delivered by #133 ("Fixtures sintéticos para revisión contable").
- [ ] 1.2b Create the concrete synthetic invoice fixtures (IVA 13 %, exonerations, referenced NC/ND, and foreign-service or used-goods cases if they apply) that the accountant reviews.
- [x] 1.3 Define accounting entry extraction from XML. Delivered as documentation by #133 ("Extracción de asientos desde XML"); no extraction code exists or is in scope.
- [x] 1.4 Define evidence bundle for accounting review. Delivered by #133 ("Evidencia para el gate contable").
- [ ] 1.5 Produce the first accounting review evidence bundle (synthetic XML, derived entries and their justification, totals reconciliation) and record the accountant's sign-off or observations.

## 2. Production readiness gate

- [x] 2.1 Create production checklist (credentials, retention, monitoring). Delivered as a documentation checklist by #133 ("Checklist de producción").
- [x] 2.2 Define evidence requirements for production gate. Delivered by #133 ("Evidencia para el gate de producción").
- [x] 2.3 Document go-live approval process. Delivered by #133 ("Aprobación de salida a producción").
- [ ] 2.4 Confirm the legal retention period against the cited regulation (Decreto N.º 44739-H and MH-DGT-RES-0027-2024) and reconcile the `production-readiness-gates` delta, which still states a 5-year period that the guide deliberately does not assert.
- [ ] 2.5 Fill in the production checklist and its evidence for a real go-live. Not started; no production release is proposed.

## 3. Documentation

- [x] 3.1 Update production-integration guide with gates. Delivered by #133.
- [x] 3.2 Run `pnpm verify` (no code changes expected). #133 was documentation-only and passed the CI gate.
- [ ] 3.3 Archive this change and sync its specs only after the evidence tasks (1.2b, 1.5, 2.4 and 2.5) are complete.
