/**
 * Shared retry utilities for Anthropic API calls.
 * Handles transient errors (overloaded 529, network failures, Anthropic 500/502/503)
 * with exponential backoff.
 */

import {
  APIConnectionError,
  APIConnectionTimeoutError,
  InternalServerError,
} from "@anthropic-ai/sdk"

export function isRetryableError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false

  // SDK typed error classes — most reliable
  if (err instanceof APIConnectionError) return true
  if (err instanceof APIConnectionTimeoutError) return true
  if (err instanceof InternalServerError) return true

  // HTTP status codes: 429 (rate limit), 529 (overloaded), 502 (bad gateway), 503 (service unavailable)
  const status = (err as { status?: number }).status
  if (status === 429 || status === 529 || status === 502 || status === 503) return true

  // String-based fallback for edge cases where errors aren't SDK typed
  const msg = ((err as { message?: string }).message ?? "").toLowerCase()
  return (
    msg.includes("overloaded_error") ||
    msg.includes("overloaded") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("fetch failed")
  )
}

/** @deprecated use isRetryableError */
export const isOverloadedError = isRetryableError

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export interface RetryOptions {
  maxRetries?: number
  delays?: number[]
}

// Defaults for heavy streaming routes (generate, edit) — more retries, longer waits
const DEFAULT_MAX_RETRIES = 3
const DEFAULT_DELAYS_MS = [3000, 7000, 15000]

export async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES
  const delays = options?.delays ?? DEFAULT_DELAYS_MS

  let lastError: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = delays[attempt - 1] ?? delays[delays.length - 1]
      console.warn(
        `[${label}] Retrying after transient error (attempt ${attempt}/${maxRetries}, waiting ${delay}ms)`
      )
      await sleep(delay)
    }
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (isRetryableError(err) && attempt < maxRetries) {
        continue
      }
      throw err
    }
  }
  throw lastError
}

// Convenience options for lightweight routes (wizard, proposal, narratives)
export const LIGHT_RETRY: RetryOptions = { maxRetries: 2, delays: [2000, 6000] }
