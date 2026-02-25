/**
 * Shared retry utilities for Anthropic API calls.
 * Handles transient overloaded_error (529) responses with exponential backoff.
 */

export function isOverloadedError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false
  const msg = (err as { message?: string }).message ?? ""
  return (
    msg.includes("overloaded_error") ||
    msg.includes("Overloaded") ||
    (err as { status?: number }).status === 529
  )
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const MAX_RETRIES = 3
const RETRY_DELAYS_MS = [3000, 7000, 15000]

export async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_DELAYS_MS[attempt - 1]
      console.warn(
        `[${label}] Retrying after overloaded error (attempt ${attempt}/${MAX_RETRIES}, waiting ${delay}ms)`
      )
      await sleep(delay)
    }
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (isOverloadedError(err) && attempt < MAX_RETRIES) {
        continue
      }
      throw err
    }
  }
  throw lastError
}
