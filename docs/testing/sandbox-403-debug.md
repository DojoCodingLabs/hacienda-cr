# Sandbox reception HTTP 403 investigation

Observed 2026-10-15 Costa Rica / 2026-10-16 UTC. No production requests and no additional invoice POSTs were made during this investigation.

## Finding

The documented sandbox reception URL currently returns an **AWS API Gateway authorization-format response**, before any observable Hacienda receipt validation. This reproduces outside the SDK using `/usr/bin/curl` with the same freshly issued bearer token.

The leading explanation is an unavailable/mismapped sandbox route or an inappropriate gateway authentication configuration. This is an inference, not a confirmed root cause: only the service operator can distinguish a missing API deployment/base-path mapping from an incorrectly selected IAM authorization path or another gateway configuration problem.

Changing invoice XML, CABYS, certificate PIN, signature algorithms or retry counts cannot resolve this particular status-query failure. A GET contains no invoice XML or certificate. Once reception routing works, document acceptance can still fail for separate reasons and must be tested independently.

## Checks performed

| Check                                                                        | Observed result                                                 | What it establishes                                                                              |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Password grant at official HTTPS `rut-stag` endpoint                         | HTTP 200                                                        | Supplied sandbox login is accepted by IDP                                                        |
| JWT signature against sandbox public JWKS                                    | RS256 signature valid                                           | Token is signed by the matching IDP key                                                          |
| Token timing                                                                 | Issued, not expired; no future clock anomaly                    | Expiry is not causing this attempt                                                               |
| Token authorized party                                                       | `api-stag`                                                      | Sandbox client selected                                                                          |
| Token issuer versus public OIDC discovery                                    | Both advertise the same `http://…/auth/realms/rut-stag` issuer  | HTTP issuer is provider metadata; not a local alteration. Credentials/JWKS requests stayed HTTPS |
| GET `/recepcion/{original-key}` using Node native fetch                      | 403 `IncompleteSignatureException`                              | Failure reproduced without SDK HTTP wrapper                                                      |
| GET same key using system curl                                               | Same HTTP 403 and error                                         | Not specific to Node or SDK serialization                                                        |
| GET `/comprobantes` using valid token                                        | Same error                                                      | Failure independent of original invoice key                                                      |
| GET using deliberately invalid bearer token                                  | Same error                                                      | Response does not distinguish a valid JWT at this layer                                          |
| GET without Authorization                                                    | 403 `MissingAuthenticationTokenException`                       | Gateway response changes with header presence                                                    |
| AWS-returned Authorization digest versus SHA-256/Base64 of exact sent header | Exact match, valid and invalid token requests                   | Header reached AWS unchanged                                                                     |
| Prior lowercase `bearer` / trailing slash checks                             | Same 403                                                        | These formatting variants do not fix it                                                          |
| Public nonexistent sandbox route                                             | Same missing-auth gateway response as no-token documented route | Consistent with missing/unsupported route behavior; not proof by itself                          |

No proxy environment variables were configured in the diagnostic process. Node and curl used their ordinary verified TLS transports. Direct curl used stdin configuration so credentials and bearer tokens were not command-line arguments. OAuth payloads, JWTs and authorization headers were not added to repository evidence.

The JWT audience is `account`, and realm/resource roles were ordinary Keycloak account roles. These observations alone do not prove an authorization defect: the API's configured JWT acceptance policy is not accessible. No role or audience was forged or modified.

## Primary documentation

- Hacienda [v4.4 annex, page 97](https://www.hacienda.go.cr/docs/ANEXOS_Y_ESTRUCTURAS_V4.4.pdf) explicitly publishes `https://api.comprobanteselectronicos.go.cr/recepcion-sandbox/v1/`.
- Hacienda [API documentation](https://www.hacienda.go.cr/docs/ComprobantesElectronicosAPI.html) specifies bearer-token authorization and GET `/recepcion/{clave}`.
- AWS [gateway response types](https://docs.aws.amazon.com/apigateway/latest/developerguide/supported-gateway-response-types.html) documents that missing-authentication responses include unsupported API methods/resources.
- AWS [signature troubleshooting](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_sigv-troubleshooting.html#api-request-header) documents the received-header SHA-256/Base64 comparison used here.

## Sanitized operator escalation packet — not sent

Subject: Sandbox comprobantes: documented routes return IncompleteSignatureException with valid rut-stag bearer token

At approximately 2026-10-16 01:27–01:28 UTC:

- Host: `api.comprobanteselectronicos.go.cr`
- Base path: `/recepcion-sandbox/v1`
- Methods/resources: GET `/comprobantes`, GET `/recepcion/{50-digit-original-key}`
- Authentication: fresh signed, unexpired `rut-stag` token; authorized party `api-stag`; HTTPS password grant returned 200.
- Actual result: HTTP 403, `x-amzn-errortype: IncompleteSignatureException`; gateway complains about missing equal-sign in Authorization.
- Expected contract: bearer-token reception API response, such as a status or receipt-not-found response.
- Header-integrity check: gateway's returned digest exactly matches the transmitted Authorization header.
- Reproduction: both native Node fetch and system curl, same result. Valid/invalid tokens yield the same gateway-format response.
- Valid-token receipt GET AWS request ID: `804b99a7-b392-408d-babc-ade0fc2c1e4d`
- Valid-token list GET AWS request ID: `c44b7fd6-f953-44f0-aacc-7dffc62b14c8`
- Cloudflare ray for receipt GET: `a4b347f5ada75057-MIA`

Please confirm the currently supported sandbox base URL, deployment/base-path mapping, and bearer authorizer configuration. Is `/recepcion-sandbox/v1` still deployed and expected to accept `rut-stag` / `api-stag` tokens? Is any sandbox enrollment beyond the issued API credentials required?

Do not attach access/refresh tokens, credentials, P12, PIN, issuer details or signed XML to the initial report. Private full response headers and original receipt key remain available locally if required through an appropriate private channel.

## Repeat validation: 2026-10-16 Costa Rica

Retested at 2026-10-17T04:39:43+00:00 with fresh sandbox authentication, direct Node/curl requests, and the actual PR SDK build:

- IDP authentication succeeds (HTTP 200); JWT signature and time checks pass.
- The PR SDK's `getStatus` for the original key returns HTTP 403 without a new POST.
- Direct Node and curl still reproduce `IncompleteSignatureException`; the Authorization digest still matches the header sent. Listing also fails, independently of the original invoice key.
- The supplied real P12/PIN loads; a deliberately wrong PIN is rejected. The certificate is within its validity dates and matches the one embedded in the original signed submission.
- The original and fresh signatures verify locally using XAdES/WebCrypto; an altered document fails verification. Current signed-XML XSD/identity validation passes. Revocation status and independent certificate-chain trust are still unverified.
- No TRIBU/Hacienda tab is currently open in the connected browser, so authenticated portal setup could not be rechecked. No credentials or keys were regenerated or revoked.
- No additional fiscal document was submitted and no production request was made. Private evidence remains outside the repository.

Fresh valid-token receipt GET AWS request ID: `5afd1303-eda0-4da7-bdb4-92c8d843ec8d`; list GET request ID: `85871330-27e7-4b33-acea-fe13e78184d2`.

## Next validation step

Obtain a working documented sandbox route or operator confirmation. Then GET the original key first; preserve its original signed bytes and attempt marker. Resume submission only under an explicit recovery decision once its status is resolved. No switch to production or invented alternate credential endpoint is needed for this investigation.

The runner now retains gateway error type, request IDs, response date and routing headers in its private HTTP evidence, so another failure is actionable rather than a bare 403. No token-bearing request headers are captured.
