/**
 * Módulo de entrega (outbox) — API pública.
 */

export { FileDocumentStore, createDefaultStore } from "./file-store.js";

export {
  createStoredDocument,
  transitionDocument,
  evaluateDeadline,
  classifySendResult,
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
  DeliverySubmitAndWaitOptions,
  CreateStoredDocumentOptions,
  FileStoreOptions,
} from "./types.js";

export {
  InvalidTransitionError,
  ImmutableSituationError,
  ClaveSituationMismatchError,
} from "./types.js";
