import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import Script from "next/script"
import "./globals.css"
import { Providers } from "@/components/providers"
import { PWARegister } from "@/components/pwa-register"
import { Analytics } from "@vercel/analytics/react"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "EstimAI Pro — Your Pricing Brain. Powered by AI.",
  description:
    "The AI-powered construction estimating platform that learns from your historical pricing data. Generate accurate estimates in seconds.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "EstimAI Pro",
  },
  openGraph: {
    title: "EstimAI Pro — Next Best App for Builders & Trades",
    description:
      "AI-backed construction estimating. Built by a builder for builders. Generate accurate estimates in seconds.",
    url: "https://www.estimaipro.com",
    siteName: "EstimAI Pro",
    images: [
      {
        url: "https://www.estimaipro.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "EstimAI Pro — AI-powered estimating for builders and trades",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "EstimAI Pro — Next Best App for Builders & Trades",
    description:
      "AI-backed construction estimating. Built by a builder for builders.",
    images: ["https://www.estimaipro.com/og-image.png"],
  },
}

export const viewport: Viewport = {
  themeColor: "#E94560",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <Script async src="https://www.googletagmanager.com/gtag/js?id=G-N6YET41GMF" />
        <Script id="google-analytics">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-N6YET41GMF');
          `}
        </Script>
        <Script id="meta-pixel">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '1443639740480163');
            fbq('track', 'PageView');
          `}
        </Script>
        <Script id="tiktok-pixel">
          {`
            !function (w, d, t) {
              w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;var s=document.getElementsByTagName("script")[0];s.parentNode.insertBefore(n,s)};
              ttq.load('D6F227BC77UAM1VL5M6G');
              ttq.page();
            }(window, document, 'ttq');
          `}
        </Script>
      </head>
      <body className={`${inter.className} antialiased`}>
        <Providers>{children}</Providers>
        <PWARegister />
        <Analytics />
      </body>
    </html>
  )
}
