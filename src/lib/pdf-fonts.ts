import { Font } from "@react-pdf/renderer"
import fs from "fs"
import path from "path"

/**
 * Register Inter font family for PDF rendering.
 *
 * Strategy: Try local filesystem first (fast, no network),
 * fall back to Bunny Fonts CDN (GDPR-friendly Google Fonts mirror).
 *
 * Bunny Fonts uses semantic (non-hash) paths so URLs never go stale:
 *   https://fonts.bunny.net/inter/files/inter-latin-{weight}-normal.ttf
 *
 * This is more reliable than fonts.gstatic.com/s/inter/v20/... URLs
 * which are version-hash-based and can break when Inter is updated.
 */

const FONT_DIR = path.join(process.cwd(), "public", "fonts")

const localFontsAvailable = (() => {
  try {
    return fs.existsSync(path.join(FONT_DIR, "Inter-Regular.ttf"))
  } catch {
    return false
  }
})()

if (localFontsAvailable) {
  Font.register({
    family: "Inter",
    fonts: [
      { src: path.join(FONT_DIR, "Inter-Regular.ttf"),  fontWeight: 400 },
      { src: path.join(FONT_DIR, "Inter-Regular.ttf"),  fontWeight: 400, fontStyle: "italic" },
      { src: path.join(FONT_DIR, "Inter-Medium.ttf"),   fontWeight: 500 },
      { src: path.join(FONT_DIR, "Inter-Medium.ttf"),   fontWeight: 500, fontStyle: "italic" },
      { src: path.join(FONT_DIR, "Inter-SemiBold.ttf"), fontWeight: 600 },
      { src: path.join(FONT_DIR, "Inter-SemiBold.ttf"), fontWeight: 600, fontStyle: "italic" },
      { src: path.join(FONT_DIR, "Inter-Bold.ttf"),     fontWeight: 700 },
      { src: path.join(FONT_DIR, "Inter-Bold.ttf"),     fontWeight: 700, fontStyle: "italic" },
    ],
  })
} else {
  // Fallback: Bunny Fonts CDN — semantic URLs that don't break on font version updates.
  // Each weight is registered twice (normal + italic) so that any italic text in PDFs
  // falls back to the normal variant rather than crashing with "could not resolve font".
  Font.register({
    family: "Inter",
    fonts: [
      { src: "https://fonts.bunny.net/inter/files/inter-latin-400-normal.ttf", fontWeight: 400 },
      { src: "https://fonts.bunny.net/inter/files/inter-latin-400-normal.ttf", fontWeight: 400, fontStyle: "italic" },
      { src: "https://fonts.bunny.net/inter/files/inter-latin-500-normal.ttf", fontWeight: 500 },
      { src: "https://fonts.bunny.net/inter/files/inter-latin-500-normal.ttf", fontWeight: 500, fontStyle: "italic" },
      { src: "https://fonts.bunny.net/inter/files/inter-latin-600-normal.ttf", fontWeight: 600 },
      { src: "https://fonts.bunny.net/inter/files/inter-latin-600-normal.ttf", fontWeight: 600, fontStyle: "italic" },
      { src: "https://fonts.bunny.net/inter/files/inter-latin-700-normal.ttf", fontWeight: 700 },
      { src: "https://fonts.bunny.net/inter/files/inter-latin-700-normal.ttf", fontWeight: 700, fontStyle: "italic" },
    ],
  })
}

Font.registerHyphenationCallback((word) => [word])
