/**
 * Simple in-memory rate limiter for API routes.
 * Tracks requests per user within a sliding window.
 *
 * Note: On Vercel serverless, each function instance has its own memory,
 * so this is per-instance. It still prevents a single user from spamming
 * within a single function lifecycle, which covers most abuse patterns.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Clean up expired entries every 60 seconds
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key)
  }
}, 60_000)

/**
 * Check if a request should be rate-limited.
 * @param key - Unique identifier (usually `userId:endpoint`)
 * @param maxRequests - Max requests allowed in the window
 * @param windowMs - Time window in milliseconds (default: 60s)
 * @returns Object with `allowed` boolean and `remaining` count
 */
export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number = 60_000
): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: maxRequests - 1 }
  }

  entry.count++
  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0 }
  }

  return { allowed: true, remaining: maxRequests - entry.count }
}
