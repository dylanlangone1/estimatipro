import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Allow @react-pdf/renderer to bundle correctly in server components
  serverExternalPackages: ["@react-pdf/renderer"],

  images: {
    remotePatterns: [
      {
        // Vercel Blob storage for user uploads
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
      {
        // Google OAuth profile images
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },

  // Security headers for production
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  sourcemaps: { disable: true },  // don't upload or expose source maps
});
