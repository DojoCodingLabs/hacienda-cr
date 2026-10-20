/**
 * Config module — configuration file management and sequence persistence.
 *
 * Manages ~/.hacienda-cr/config.toml (multi-profile config) and
 * ~/.hacienda-cr/sequences.json (document sequence numbers).
 */

// Types and schemas
export {
  EnvironmentSchema,
  CedulaTypeSchema,
  ProfileSchema,
  ConfigFileSchema,
  SequenceFileSchema,
  MAX_SEQUENCE,
  DEFAULT_BRANCH,
  DEFAULT_POS,
  FAILURE_POINTS,
  SequenceAssignmentSchema,
  SequenceDiscardSchema,
  ExtendedSequenceFileSchema,
} from "./types.js";
export type {
  Environment,
  CedulaType,
  Profile,
  ConfigFile,
  ResolvedConfig,
  SequenceFile,
  FailurePoint,
  SequenceAssignment,
  SequenceDiscard,
  ExtendedSequenceFile,
} from "./types.js";

// Config manager
export {
  getConfigDir,
  getConfigPath,
  ensureConfigDir,
  loadConfig,
  saveConfig,
  listProfiles,
  deleteProfile,
} from "./config-manager.js";
export type { ConfigManagerOptions } from "./config-manager.js";

// Sequence store
export {
  buildSequenceKey,
  getSequencesPath,
  getNextSequence,
  getCurrentSequence,
  resetSequence,
  SequenceOverflowError,
  assignSequenceWithDocument,
  markSequenceEmitted,
  discardSequence,
  querySeries,
  LegacySequenceWarning,
} from "./sequence-store.js";
export type { SequenceStoreOptions, SeriesQueryResult } from "./sequence-store.js";
