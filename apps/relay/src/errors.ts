/**
 * Error normalisation helpers.
 *
 * TypeScript types a caught value as `unknown`, which is correct but makes
 * `err.message` unavailable. Rather than reaching for `any` at every catch site
 * (which is what the relay used to do), these helpers narrow safely.
 */

/**
 * Extracts a human-readable message from an unknown thrown value.
 * Never throws, and never returns an empty string.
 */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (err !== null && typeof err === 'object' && 'message' in err) {
    const message = (err as { message: unknown }).message;
    if (typeof message === 'string') return message;
  }
  try {
    return JSON.stringify(err) ?? String(err);
  } catch {
    // JSON.stringify throws on circular structures and BigInt.
    return String(err);
  }
}