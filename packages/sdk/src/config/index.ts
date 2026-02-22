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
} from "./types.js";
export type {
  Environment,
  CedulaType,
  Profile,
  ConfigFile,
  ResolvedConfig,
  SequenceFile,
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
} from "./sequence-store.js";
export type { SequenceStoreOptions } from "./sequence-store.js";
