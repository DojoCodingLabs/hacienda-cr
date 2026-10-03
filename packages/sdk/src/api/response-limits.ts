import { ValidationError } from "../errors.js";
import { withSignal } from "./cancellation.js";

/** Read decoded bytes with a hard cap, even when Content-Length is missing or false. */
export async function readResponseText(
  response: Response,
  maxBytes: number,
  signal?: AbortSignal,
): Promise<string> {
  const tooLarge = () =>
    new ValidationError(`HTTP response exceeds the ${String(maxBytes)}-byte limit.`);
  if (Number(response.headers.get("Content-Length")) > maxBytes) {
    void response.body?.cancel().catch(() => undefined);
    throw tooLarge();
  }
  if (!response.body) {
    const text = await withSignal(() => response.text(), signal);
    if (Buffer.byteLength(text, "utf8") > maxBytes) throw tooLarge();
    return text;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await withSignal(() => reader.read(), signal);
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw tooLarge();
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString("utf8");
  } catch (error) {
    void reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }
}
