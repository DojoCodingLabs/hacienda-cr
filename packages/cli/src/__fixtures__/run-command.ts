import type { ArgsDef, CommandDef, ParsedArgs } from "citty";

/** Arguments a test passes to a command: only the keys the command declares. */
export type TestArgs<T extends ArgsDef> = { [K in keyof T]?: string | boolean };

/** TestArgs for a command definition, e.g. `CommandArgs<typeof submitCommand>`. */
export type CommandArgs<C> = C extends CommandDef<infer T> ? TestArgs<T> : never;

/**
 * Invoke a citty command's `run` the way citty's parser would, for specs.
 *
 * citty's `ParsedArgs` types an optional string flag as a present key of type
 * `string | undefined`, while its catch-all index signature forbids `undefined`.
 * No object literal satisfies both, so this helper holds the single cast. Keys
 * are still restricted to the command's declared args, so a misspelled flag is a
 * type error.
 */
export async function runCommand<T extends ArgsDef>(
  cmd: CommandDef<T>,
  args: TestArgs<T>,
): Promise<void> {
  await cmd.run?.({
    args: { _: [], ...args } as unknown as ParsedArgs<T>,
    rawArgs: [],
    cmd,
  });
}
