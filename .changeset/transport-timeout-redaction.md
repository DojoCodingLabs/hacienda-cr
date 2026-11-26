---
"@dojocoding/hacienda-sdk": minor
---

Add a shared `fetchWithTimeout` (and `FetchWithTimeoutOptions`) exported from the package root, use it in `HttpClient` and `TokenManager`, and sanitize secrets when SDK errors are constructed.

`fetchWithTimeout` bounds a request until its headers arrive, defaults to
`redirect: "error"`, honours an external `init.signal` and removes its timer
and abort listener when it settles. `TokenManager` keeps one request-scoped
deadline across the token fetch and every body read, so an IDP that sends
headers and then stalls the body still fails within `requestTimeoutMs`.
`HaciendaError`, `ApiError`, `ValidationError` and `AuthError` now redact
configured credentials and credential syntax from their messages, response
bodies and details at construction time.
