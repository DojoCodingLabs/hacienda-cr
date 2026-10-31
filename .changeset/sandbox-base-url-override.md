---
"@dojocoding/hacienda-shared": patch
"@dojocoding/hacienda-sdk": patch
---

Document how to override the sandbox reception host.

Hacienda has not confirmed the `api-sandbox` host and the v4.4 annex still lists the
old route. If the host changes again, pass your own `envConfig` with a custom
`apiBaseUrl` (for example `{ ...getEnvironmentConfig(Environment.Sandbox), apiBaseUrl }`)
to `TokenManager` and `HttpClient` instead of waiting for a release.
