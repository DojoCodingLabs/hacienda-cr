/**
 * Módulo de entrega (outbox) — API pública.
 */

export { FileDocumentStore, createDefaultStore } from "./file-store.js";

export {
  createStoredDocument,
  transitionDocument,
  evaluateDeadline,
  classifySendResult,
  classifyOutcome,
  situationFromClave,
  assertClaveSituationMatch,
  createObligation,
  validateSituationReference,
} from "./state-machine.js";

export {
  DEFAULT_DEADLINE_BUSINESS_DAYS,
  DELIVERY_SITUATION_FROM_DIGIT,
  DIGIT_FROM_DELIVERY_SITUATION,
  VALID_TRANSITIONS,
  isValidTransition,
} from "./types.js";

export type {
  DeliverySituation,
  DeliveryState,
  Obligation,
  TransitionRecord,
  StoredDocument,
  DocumentStore,
  DeadlineEvaluation,
  SendResult,
  DeliveryOutcome,
  StatusObservation,
  DeliverySubmitAndWaitOptions,
  CreateStoredDocumentOptions,
  FileStoreOptions,
} from "./types.js";

export {
  InvalidTransitionError,
  ImmutableSituationError,
  ClaveSituationMismatchError,
} from "./types.js";

export {
  FileSubmissionIdentityStore,
  createDefaultSubmissionIdentityStore,
  guardSubmissionIdentity,
  signedXmlSha256,
  SubmissionIdentityError,
} from "./submission-identity.js";

export type {
  SubmissionIdentityRecord,
  SubmissionIdentityStore,
  SubmissionIdentityMode,
  SubmissionIdentityClaim,
  SubmissionIdentityErrorReason,
  GuardSubmissionIdentityOptions,
  FileSubmissionIdentityStoreOptions,
} from "./submission-identity.js";
