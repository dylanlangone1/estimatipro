/**
 * Robustly extract a JSON object from AI response text.
 * Handles:
 *   - Raw JSON (ideal case)
 *   - Triple-backtick fenced blocks (```json ... ```)
 *   - JSON embedded inside prose (finds first '{' to last '}')
 *   - Whitespace, BOM characters, and other cruft
 */
export function extractJson(raw: string): string {
  let text = raw.trim()

  // Strip BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)

  // Case 1: wrapped in markdown code fences (with or without language tag)
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (fenceMatch) return fenceMatch[1].trim()

  // Case 2: starts with '{' — already bare JSON
  if (text.startsWith("{")) return text

  // Case 3: JSON object is embedded somewhere in the text
  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")
  if (start !== -1 && end !== -1 && end > start) {
    return text.slice(start, end + 1)
  }

  // Case 4: nothing found — return original and let JSON.parse surface the error
  return text
}
