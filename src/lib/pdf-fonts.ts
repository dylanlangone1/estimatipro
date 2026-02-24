import { Font } from "@react-pdf/renderer"
import fs from "fs"
import path from "path"

/**
 * Register Inter font family for PDF rendering.
 *
 * Strategy: Try local filesystem first (fast, no network),
 * fall back to Google Fonts CDN (works on Vercel serverless
 * where public/ may not be in the function bundle).
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
      { src: path.join(FONT_DIR, "Inter-Regular.ttf"), fontWeight: 400 },
      { src: path.join(FONT_DIR, "Inter-Medium.ttf"), fontWeight: 500 },
      { src: path.join(FONT_DIR, "Inter-SemiBold.ttf"), fontWeight: 600 },
      { src: path.join(FONT_DIR, "Inter-Bold.ttf"), fontWeight: 700 },
    ],
  })
} else {
  // Fallback: Google Fonts CDN — reliable on Vercel serverless
  Font.register({
    family: "Inter",
    fonts: [
      { src: "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZg.ttf", fontWeight: 400 },
      { src: "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fMZg.ttf", fontWeight: 500 },
      { src: "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYMZg.ttf", fontWeight: 600 },
      { src: "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZg.ttf", fontWeight: 700 },
    ],
  })
}

Font.registerHyphenationCallback((word) => [word])
