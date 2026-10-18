/** Compare accepted ISO instants without rounding their fractional seconds.
 * Date parses only the whole-second civil/timezone portion (four-digit years,
 * safely inside integer milliseconds). Fractional text never passes Number. */
function instant(value: string): { seconds: bigint; fraction: string } | null {
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})$/.exec(
    value,
  );
  if (!match) return null;
  const milliseconds = Date.parse(`${match[1]}${match[3]}`);
  if (!Number.isSafeInteger(milliseconds)) return null;
  return { seconds: BigInt(milliseconds) / 1000n, fraction: (match[2] ?? "").replace(/0+$/, "") };
}
/** Internal chronology only; this does not establish the mandatory issuance/
 * submission-time ten-year reference-age eligibility against a trusted clock. */
export function compareNcInstants(left: string, right: string): number | null {
  const a = instant(left),
    b = instant(right);
  if (!a || !b) return null;
  if (a.seconds !== b.seconds) return a.seconds < b.seconds ? -1 : 1;
  for (let index = 0; index < Math.max(a.fraction.length, b.fraction.length); index++) {
    const x = a.fraction[index] ?? "0",
      y = b.fraction[index] ?? "0";
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}
