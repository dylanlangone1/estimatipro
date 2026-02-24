import Anthropic from "@anthropic-ai/sdk"

let _client: Anthropic | null = null

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not set")
    }
    _client = new Anthropic({ apiKey })
  }
  return _client
}

// Lazy singleton — uses explicit getters to delegate to the real Anthropic
// client only at call time (not at import/build time). This avoids the
// build-time crash when ANTHROPIC_API_KEY is absent from the build env,
// while also ensuring the SDK's internal resource objects receive the
// correct `this` context (unlike a raw Proxy that can lose binding).
export const anthropic = {
  get messages() {
    return getClient().messages
  },
  get beta() {
    return getClient().beta
  },
} as unknown as Anthropic

export const AI_MODEL = "claude-sonnet-4-20250514"
