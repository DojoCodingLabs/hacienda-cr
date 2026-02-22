/**
 * Zod schema for environment configuration validation.
 */

import { z } from "zod";
import { Environment } from "../constants/index.js";

/** Schema for the environment value. */
export const EnvironmentSchema = z.enum([Environment.SANDBOX, Environment.PRODUCTION]);

/** Schema for credential configuration. */
export const CredentialConfigSchema = z.object({
  /** Full username. */
  username: z.string().min(1).email().or(z.string().min(1)),

  /** Path to the .p12 certificate file. */
  p12Path: z.string().min(1),
});

export type CredentialConfigInput = z.infer<typeof CredentialConfigSchema>;

/** Schema for the full application configuration. */
export const AppConfigSchema = z.object({
  /** Active environment. */
  environment: EnvironmentSchema,

  /** Per-environment credential configuration. */
  credentials: z
    .object({
      [Environment.SANDBOX]: CredentialConfigSchema.optional(),
      [Environment.PRODUCTION]: CredentialConfigSchema.optional(),
    })
    .optional(),
});

export type AppConfigInput = z.infer<typeof AppConfigSchema>;
