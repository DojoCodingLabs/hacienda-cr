import { z } from "zod";
/** Native XSD lengths count Unicode characters. Never trim or normalize facts. */
export const exactPartyName = (min: number, max: number) =>
  z
    .string()
    .max(max * 2)
    .refine((value) => {
      const length = [...value].length;
      return length >= min && length <= max && value.trim().length > 0;
    }, `An actual name of ${min}–${max} Unicode characters is required`);
