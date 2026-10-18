# Mensaje Receptor transport and outcome correlation audit

Observed 2026-10-18. Read-only public documentation research. No authenticated
Hacienda request, live submission, account access or message sent. This audit changes documentation only; it does not implement transport. The original
dirty SDK checkout was not used.

## Conclusion

The primary sources establish MR source identity, buyer signing, required POST
`consecutivoReceptor`, asynchronous callback and generic status retrieval. They
do **not** establish a receiver-specific, cryptographically bound recovery/outcome
oracle. No official receiver-specific query or MR request/response example was
found in the sources inspected. This is a bounded research result, not proof that
such an operational facility cannot exist.

The new exact MR source builder can remain source-only. A future transport helper
must not derive a composite route, interpret the original FE's accepted result as
MR acceptance, or automatically repeat an ambiguous MR POST.

## Primary evidence and exact identities

1. [Hacienda API v1 documentation](https://www.hacienda.go.cr/docs/ComprobantesElectronicosAPI.html)
   was downloaded fresh with curl. download SHA256:
   `d0bf02b8aa01fccc39a0f74d8efd4399d464bff888772e707eba2e2712bc1f87`.
   The public HTML contains legacy v4.2 navigation links and examples; its public
   availability does not establish a newly verified v4.4 runtime contract.
2. [Current 99-page annex](https://www.hacienda.go.cr/docs/ANEXOS_Y_ESTRUCTURAS_V4.4.pdf),
   reviewed official download,
   SHA256 `6e093226b29b38c5c8de825f70c1b1cb8ed81e2f4a6eb0b3ff52708fc1eb2769`.
   Relevant printed pages: 61–64, 69, 97–99. The official URL and complete source hashes are retained below.
3. [MensajeHacienda XSD](https://www.hacienda.go.cr/docs/MensajeHacienda_V4.4.xsd)
   downloaded fresh. SHA256
   `b2606156042b7aa7b7f7f61945f0ff1323661b43b5a1489ad5eafad1c52fd25e`,
   byte-identical to the reviewed SDK `2026/v4.4` vendor file. [`mr-correlation-evidence.json`](../audit/mr-correlation-evidence.json)
   records its complete direct child field inventory.

## Findings by boundary

| Boundary               | Established primary fact                                                                                                                                                                                              | Unresolved authority                                                                                                                                                                                                                                                                                                                            |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| XML parties and signer | Annex p61 identifies seller in NumeroCedulaEmisor and original buyer in NumeroCedulaReceptor; both must match the original. The introductory messages section requires the receiver's signature for its confirmation. | Certificate identity/representation must be checked by the app's independent signer/custody policy; generic synthetic signing is not proof of buyer authority.                                                                                                                                                                                  |
| HTTP submission        | POST /recepcion accepts a signed UTF-8/Base64 document. `consecutivoReceptor` is mandatory for an MR. 201 means received and validation pending.                                                                      | No distinct-party MR example establishes whether HTTP emisor/receptor refer to original invoice roles or MR sender/addressee roles. The example has equal party IDs and cannot resolve the distinction. The JSON fecha description is generic invoice date, while MR XML uses confirmation time; MR HTTP fecha mapping also needs confirmation. |
| Location               | 201 documents a server-returned Location for status consultation; the sole example ends in original clave50.                                                                                                          | No actual MR-specific Location example or documented same-clave/multiple-consecutive semantics. Preserve a future observed Location as evidence; do not invent its format or treat its presence as signed MR acceptance.                                                                                                                        |
| Generic GET            | GET /recepcion/{clave} documents maxLength50 and original clave, with clave/fecha/ind-estado/respuesta-xml.                                                                                                           | No consecutive filter, separate MR resource, original-versus-MR selector or signed request digest. Authenticated buyer-specific resource behavior is not described.                                                                                                                                                                             |
| Callback               | API and annex p99 state POST to supplied callbackUrl delivers the same JSON as GET. Annex specifies 200 acknowledgment, then up to three retries on failure, then consultation through API.                           | No callback authentication/header/signature-over-envelope specification, recipient consecutive or request hash. A callback destination token can select a local candidate, but cannot itself make the signed XML MR-specific or establish official channel semantics.                                                                           |
| Signed response        | Current MensajeHacienda contains original50-character clave, party names/IDs, message/state/detail, totals and signature.                                                                                             | No receiver consecutive, MR request digest, document family, response/request ID, or signed confirmation time. Matching clave/parties/totals plus a valid institutional signature does not distinguish the original FE outcome from MR outcome.                                                                                                 |
| Filename               | Annex p69 specifies clave-consecutivo.xml/pdf and clave-consecutivo_respuesta.xml for email/storage.                                                                                                                  | This is not documentation for GET /recepcion/clave-consecutivo or a composite clave. Do not promote a storage filename into transport authority.                                                                                                                                                                                                |
| History                | /comprobantes exposes generic taxpayer metadata and FE credit/debit references.                                                                                                                                       | It is not a documented confirmation-message outcome ledger and adds no MR consecutive correlation.                                                                                                                                                                                                                                              |

The callback annex example uses camelCase fields whereas the API schema uses
hyphenated `ind-estado`/`respuesta-xml`. Record this inconsistency; do not silently
broaden a terminal-authority decoder on the basis of the sample alone.

## Existing SDK seam, inspected at source 21e42d0

`shared/src/types/api.ts` SubmissionRequest currently has callbackUrl but no
consecutivoReceptor. `packages/sdk/src/api/submission.ts` serializes the request,
returns Location, and generic getStatus constructs /recepcion/{clave}. Thus the
source-only MR builder does not already supply a complete typed MR transport
contract. Its addition must not be presented as MR send/recovery support.

The source builder's original seller/buyer facts and recipient-owned consecutive
are not sufficient evidence to choose HTTP party roles. Do not work around the
missing type with casts or reuse the FE orchestrator's automatic lifecycle.

## Smallest next reviewable protocol work

1. Obtain an authoritative Hacienda MR-specific request/response or written
   protocol clarification: distinct seller/buyer, authenticated submitting buyer,
   HTTP fecha and party mapping, signer ownership, and two confirmations with the
   same original clave but different receiver consecutives.
2. Require exact observed 201 Location, GET result and callback payload for each,
   plus full signed response bytes. Establish how an acknowledged and a lost-ACK
   POST can recover the _same MR operation_, and how it differs from the original
   FE's accepted response. A general statement that original-clave GET works is
   insufficient without its authenticated context and selection semantics.
3. Define trusted correlation evidence separately from institutional XML signature
   validity. If correlation lives outside the signed XML, document its actual
   authenticated channel/provenance and replay properties, including callback
   duplicate/reorder and cross-consecutive tests. No unsigned JSON status alone
   may create a terminal fiscal result.
4. Only after that review, add a typed MR-specific submission/request decoder and
   bounded same-operation recovery adapter. Record signed bytes/hash, original
   clave, buyer, consecutive, operation and observed server Location atomically;
   enforce current authority before first POST and no automatic repeat after an
   ambiguous result. Response evidence remains archived even when uncorrelated.

No support request or user message was sent. An official clarification or a
separately authorized controlled sandbox observation is the remaining prerequisite;
this audit does not authorize that live stage. Neither a synthetic callback nor
an authentic original FE response can substitute for that evidence.

## Reproduction and scope

`curl --fail --location --max-time 45` fetched only the two public URLs above.
`shasum -a 256` and Python ElementTree inventoried untouched bytes. Searches were
restricted to official Hacienda/PGR sources for conclusions. Secondary provider
examples were not used as protocol authority. The first sandboxed curl failed DNS;
the authorized public-document download succeeded outside that network restriction.
No status route, account, token endpoint or callback endpoint was probed.
