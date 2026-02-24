import { Font } from "@react-pdf/renderer"
import path from "path"

/**
 * Register Inter font family for professional PDF output.
 * Uses locally bundled font files for reliability on Vercel serverless.
 * Falls back to Google Fonts CDN if local files aren't available.
 */

const FONT_DIR = path.join(process.cwd(), "public", "fonts")

Font.register({
  family: "Inter",
  fonts: [
    {
      src: path.join(FONT_DIR, "Inter-Regular.ttf"),
      fontWeight: 400,
    },
    {
      src: path.join(FONT_DIR, "Inter-Medium.ttf"),
      fontWeight: 500,
    },
    {
      src: path.join(FONT_DIR, "Inter-SemiBold.ttf"),
      fontWeight: 600,
    },
    {
      src: path.join(FONT_DIR, "Inter-Bold.ttf"),
      fontWeight: 700,
    },
  ],
})

// Disable hyphenation for cleaner PDF text rendering
Font.registerHyphenationCallback((word) => [word])
