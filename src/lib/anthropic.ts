import Anthropic from "@anthropic-ai/sdk"

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set")
  }
  return new Anthropic({ apiKey })
}

// Lazy singleton — only created on first use, not at import time
let _client: Anthropic | null = null
export const anthropic = new Proxy({} as Anthropic, {
  get(_target, prop) {
    if (!_client) _client = getAnthropicClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (_client as any)[prop]
  },
})

export const AI_MODEL = "claude-sonnet-4-20250514"
