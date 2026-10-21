/**
 * `@dojocoding/hacienda-mock` — mock server of the Costa Rica Hacienda
 * reception API (v4.4) for offline tests and CI.
 *
 * @module mock
 */
export { createMockServer } from "./server.js";
export { recordedResponse, sanitizeResponseXml } from "./responses.js";
export type {
  MockCallbackAttempt,
  MockOutcome,
  MockOutcomeSpec,
  MockRateLimit,
  MockServer,
  MockServerOptions,
  MockStatus,
  MockSubmission,
  RecordedResponse,
} from "./types.js";
