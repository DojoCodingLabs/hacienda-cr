# 0.12.1 release identity — 2026-10-21

The four public packages advance together to 0.12.1. This includes the reviewed
0.12.0 contract work plus a final malformed-XML correction. The private transport
simulator remains outside the public release.

An adversarial namespace smoke test found that an undeclared prefix could pass
lexical XML validation, then make xmldom throw and write a diagnostic. Signature
verifiers now parse through a quiet fail-closed helper; the new document verifier
returns InvalidXml, the response verifier keeps its typed safe error, and an
external verifier is not called for rejected input. Anonymous receivers remain
optional where the official tiquete XSD permits them; the true clave owner
retains its identification-type check. Legacy XML errors do not echo
attacker-controlled element names. Tests capture console/stderr and assert these
boundaries as well as valid signed documents and explicit leaf pins.

The v0.12.0 workflow (39652438536) was cancelled. Its tag and prepared artifacts
remain immutable for audit; no tag was moved or package overwritten. Registry
lookups after cancellation returned E404 for all four 0.12.0 versions. The corrected
release uses annotated Git tag v0.12.1 and npm latest after verified publication.

The [0.12 preparation evidence](release-0120-readiness.md), [contract and migration
limits](open-pr-remediation.md), known dependency findings, civil-calendar coverage
and separate fiscal-acceptance boundary remain applicable. The recorded mutation
baseline is a historical source-hash-bound snapshot, not a claim that every later
patch has been re-mutated. The corrected parser/signature boundaries have focused
adversarial regressions and the complete source/packed-consumer gate is rerun.
