/**
 * Robustly extract a JSON object from AI response text.
 * Handles:
 *   - Raw JSON (ideal case)
 *   - Triple-backtick fenced blocks (```json ... ```)
 *   - JSON embedded inside prose (finds first '{', matches closing '}')
 *   - Trailing prose after the JSON object
 *   - Whitespace, BOM characters, and other cruft
 */
export function extractJson(raw: string): string {
  let text = raw.trim()

  // Strip BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)

  // Case 1: wrapped in markdown code fences (with or without language tag)
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (fenceMatch) return fenceMatch[1].trim()

  // Find the start of the JSON object
  const start = text.indexOf("{")
  if (start === -1) return text // nothing to extract — let JSON.parse surface the error

  // Use brace-counting to find the matching closing brace.
  // Correctly handles: nested objects, `}` inside string values, escape sequences.
  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (escape) { escape = false; continue }
    if (ch === "\\") { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === "{") depth++
    else if (ch === "}") {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }

  // No matching closing brace (truncated JSON) — return from start to end
  // and let JSON.parse surface the error with useful context.
  return text.slice(start)
}
