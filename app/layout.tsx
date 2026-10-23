import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { PwaProvider } from "../components/PwaProvider";
import { ThemeProvider } from "../components/ThemeProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0d5c46" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0a09" },
  ],
  width: "device-width",
  initialScale: 1,
};

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ytchaptered.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ytChaptered — YouTube Timestamped Chaptered Course Creator",
    template: "%s | ytChaptered",
  },
  description:
    "Turn long, timestamped YouTube videos into interactive chaptered courses. 100% free, local-first progress tracking, and distraction-free playback.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "ytChaptered — YouTube Timestamped Chaptered Course Creator",
    description:
      "Turn long, timestamped YouTube videos into interactive chaptered courses. 100% free, local-first progress tracking, and distraction-free playback.",
    url: siteUrl,
    siteName: "ytChaptered",
    images: [
      {
        url: "/screenshots/desktop-preview.png",
        width: 1280,
        height: 800,
        alt: "ytChaptered Course Creator and Chapter Navigation",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ytChaptered — YouTube Timestamped Chaptered Course Creator",
    description:
      "Turn long, timestamped YouTube videos into interactive chaptered courses. 100% free, local-first progress tracking, and distraction-free playback.",
    images: ["/screenshots/desktop-preview.png"],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ytChaptered",
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'ytChaptered',
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'All',
  browserRequirements: 'Requires JavaScript and HTML5 video support',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  description:
    'Turn long, timestamped YouTube videos into interactive chaptered courses with local progress tracking and distraction-free playback.',
  featureList: [
    'Automatic YouTube timestamp and chapter detection',
    'Local-first progress tracking with zero account requirement',
    'Distraction-free chapter segment playback',
    'Offline course library',
    'Installable Progressive Web App (PWA)',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cfBeaconToken =
    process.env.NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN ||
    process.env.NEXT_PUBLIC_CF_BEACON_TOKEN;
  const isProd = process.env.NODE_ENV === "production";

  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} h-full antialiased`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('yt_chaptered_theme');var d=(s&&s!=='system')?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}else{document.documentElement.classList.remove('dark');document.documentElement.style.colorScheme='light';}}catch(e){}})();`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd),
          }}
        />
      </head>
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:font-semibold focus:text-xs focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          Skip to main content
        </a>
        <ThemeProvider>
          <PwaProvider>{children}</PwaProvider>
        </ThemeProvider>
        {isProd && cfBeaconToken && (
          <Script
            src="https://static.cloudflareinsights.com/beacon.min.js"
            strategy="afterInteractive"
            data-cf-beacon={JSON.stringify({ token: cfBeaconToken })}
          />
        )}
      </body>
    </html>
  );
}
