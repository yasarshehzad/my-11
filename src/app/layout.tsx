import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://my-11.com"),
  alternates: {
    canonical: "https://my-11.com",
  },
  title: "MY-11 — Draft Your XI. Survive 38 Games.",
  description: "Draft your dream football XI from iconic player seasons, make tactical chemistry choices, simulate a 38-game season, and see if your squad can go unbeaten.",
  keywords: ["MY-11", "football draft", "football game", "squad builder", "football simulation", "tactics", "38-game season", "legends"],
  authors: [{ name: "MY-11" }],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MY-11",
  },
  openGraph: {
    title: "MY-11 — Draft Your XI. Survive 38 Games.",
    description: "Draft your dream football XI from iconic player seasons, simulate a 38-game season, and see if your squad can go unbeaten.",
    url: "https://my-11.com",
    siteName: "MY-11",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "MY-11 — Draft Your XI. Survive 38 Games.",
      }
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MY-11 — Draft Your XI. Survive 38 Games.",
    description: "Draft your dream football XI from iconic player seasons, simulate a 38-game season, and see if your squad can go unbeaten.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        {/* Google tag (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-C5ETLYL50J"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-C5ETLYL50J');
          `}
        </Script>
      </head>
      <body className="min-h-full flex flex-col bg-slate-950 text-foreground select-none">
        {children}
      </body>
    </html>
  );
}
