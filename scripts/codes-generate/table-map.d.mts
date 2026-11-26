// Types for table-map.mjs, so TypeScript specs (shared/src/generated-parity.spec.ts)
// can import the registry under strict type checking.

export interface CatalogAlias {
  readonly exportName: string;
  readonly alias: string;
  readonly canonical: string;
  readonly reason: string;
}

export interface CatalogTableEntry {
  readonly tableKeys: readonly string[];
  readonly exportName: string;
  readonly shape: string;
  // keys, namesFrom, keyType, emitType: see generate.mjs for their per-shape meaning.
  readonly [key: string]: unknown;
}

export declare const ALIASES: readonly CatalogAlias[];
export declare const TABLE_MAP: readonly CatalogTableEntry[];
