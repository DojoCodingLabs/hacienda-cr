# Exact recipient confirmation

`ExactRecipientMessageInputSchema` and `buildExactMensajeReceptorXml` implement
`MR-domestic-ordinary-fe-iva13-v1`. Supply original exact FE facts, actual
confirmation date, buyer-owned consecutive and message 1/2/3. Partial/rejection
requires an actual 5–160 Unicode-character reason. The original clave, seller,
buyer, full tax and full total remain unchanged. No new invoice clave is created.
The original input is recalculated and never mutated.

Optional `iva` contains the accountant's explicit condition/activity and actual
credit/expense amounts. The producer never infers deductibility or eligibility.
Proportionality 05 omits activity; rejection in this named case omits IVA decisions.
Credit cannot exceed original tax and expense cannot exceed original total.
The legacy Number builder remains available with unchanged serialization.

The source API is published in [0.10.0](release-0100-published.md); recipient transport remains unimplemented. Required V1 integration still includes
original institutional acceptance, authentic buyer signer, durable current
permissions/sequence/custody, legal timing, other original families, transport,
recipient-specific recovery and institutional outcome correlation.

The [official API](https://www.hacienda.go.cr/docs/ComprobantesElectronicosAPI.html)
requires consecutivoReceptor for confirmation but documents generic status by
original clave. A response without that consecutive cannot distinguish a new
confirmation from the original invoice's result. No generic getStatus shortcut
or invented composite route is introduced. See the
[primary contract](../openspec/changes/add-exact-recipient-message/design.md).

An explicit positive credit outside proportionality requires the actual receiver
activity (annex p. 62). If supplied, condition 01 credit equals the full original
tax: note 18/footnote 47 expressly defines all paid IVA used as credit. Omission
does not invent a credit amount or prove eligibility. Condition04 cannot declare
a positive credit.

## Verification checkpoint

On base a1e0e1, full `pnpm verify` passed: 247 shared, 1,149 SDK, 75 CLI and
49 MCP tests (1,520 total), four intentionally disabled live tests, 118 script
tests and all four freshly packed consumers. Focused current/legacy recipient
suite: 33 tests. Native XML is checked against both unchanged official generations;
synthetic signing proves schema structure only. Packed tests exercise exact
maximum source total and installed strict TypeScript/public exports.

Earlier attempts are retained in private diagnostic logs: offline installation
lacked a locked tarball, the first verification rejected an imprecise test-only
number literal (replaced with an exactly representable invalid numeric input),
and a sandboxed run denied synthetic loopback sockets. The unchanged authorized
offline harness then passed outside that socket restriction. These were not
Hacienda submissions or real signer/acceptance evidence.

After rebasing onto SDK main `6297a5bcfbc8b0a232331a4455e61ea88c3cdc6f`,
runtime `21e42d09130e5ea6770e5aebe0c038ba891dbb98` passed full verification:
1,527 unit tests (247 shared, 1,156 SDK, 75 CLI, 49 MCP), four live skips,
118 script tests and all four fresh packed consumers. Independent exact-head
source review approved the contract and reran all 33 recipient tests successfully.
No npm publication, app adoption or recipient acceptance follows from this result.

See the [recipient transport and correlation audit](mr-transport-correlation-research.md) for the primary protocol evidence and required next verification.
