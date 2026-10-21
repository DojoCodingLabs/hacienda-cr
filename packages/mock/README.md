# Internal Hacienda transport simulator

Private workspace package for deterministic protocol tests. Run `pnpm --filter
@dojocoding/hacienda-mock test` or build and run its local CLI. It binds only
literal loopback interfaces; callbacks also require literal HTTP loopback URLs
and refuse redirects. No real credentials, taxpayer data or production endpoints
belong here.

Responses are synthetic examples authored in this repository, not recorded sandbox
evidence. JSON and XML share the requested clave. Signature placeholders are not
valid signatures. Rejection example codes are illustrative and appear in
DetalleMensaje, not an invented XSD element. API states test transport handling;
they cannot establish XSD conformity, authenticity or fiscal acceptance.

The `record` option captures only this simulator's generated output. Its XML uses
a destructive allowlist projection with fixed synthetic fields; original names,
keys, attributes, CDATA and text are not preserved. It is not a reversible recorder
or a general-purpose redactor. Never feed real customer data to test fixtures.

Publishing a fifth npm package is outside this change. An external consumer use
case, packed CLI/import/protocol checks and publisher provisioning must precede
any separate publication proposal.
