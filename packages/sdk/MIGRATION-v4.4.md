# Audit-fix migration notes

Continue using the v4.4 fields introduced in the root `MIGRATION.md`.
The MCP `create_invoice` tool now requires `proveedorSistemas`: supply the actual
invoicing system provider identification number. Draft templates leave it as a
placeholder instead of assuming the issuer is the provider.

Invoice summaries now use gross sales and deduct discounts once. Recalculate
stored summaries for discounted invoices. Input validation reconciles sales,
discounts, net sales, and other charges with the document detail.

`validateDocumentXml(xml)` validates offline against the existing vendored 2026
v4.4 XSDs, bundled into the SDK. Unsigned drafts are allowed by default. Pass
`{ requireSignature: true }` for submission. Present signatures are structurally
validated; cryptographic verification and Hacienda acceptance remain separate.
The CLI checks unsigned and signed XML before sending, and rejected submissions
return a nonzero exit code in both text and JSON modes.

Sequence resets and increments share a lock. A timeout does not remove another
writer's lock. After a crash, verify no writer is running before manually
removing the reported lock directory.
