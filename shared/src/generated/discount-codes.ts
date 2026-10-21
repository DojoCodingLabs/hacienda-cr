// NO EDITAR — generado por `pnpm spec:generate` desde packages/sdk/schemas/codes.json y scripts/codes-generate/table-map.mjs; las ediciones manuales se pierden y las detecta el candado de verify.

export const DISCOUNT_CODES = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "99"] as const;

export type DiscountCode = (typeof DISCOUNT_CODES)[number];
