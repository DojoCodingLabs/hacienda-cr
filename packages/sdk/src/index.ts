/**
 * @hacienda-cr/sdk
 *
 * Core SDK for Costa Rica electronic invoicing (Hacienda API v4.4).
 * Provides auth, XML generation, digital signing, and API client.
 */

export const PACKAGE_NAME = "@hacienda-cr/sdk" as const;

// Config — configuration file management and sequence persistence
export {
  // Config manager
  getConfigDir,
  getConfigPath,
  ensureConfigDir,
  loadConfig,
  saveConfig,
  listProfiles,
  deleteProfile,
  // Sequence store
  buildSequenceKey,
  getSequencesPath,
  getNextSequence,
  getCurrentSequence,
  resetSequence,
  SequenceOverflowError,
  // Schemas and constants
  EnvironmentSchema,
  CedulaTypeSchema,
  ProfileSchema,
  ConfigFileSchema,
  SequenceFileSchema,
  MAX_SEQUENCE,
  DEFAULT_BRANCH,
  DEFAULT_POS,
  // Types
  type Environment,
  type CedulaType,
  type Profile,
  type ConfigFile,
  type ResolvedConfig,
  type SequenceFile,
  type ConfigManagerOptions,
  type SequenceStoreOptions,
} from "./config/index.js";
