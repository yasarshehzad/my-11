import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://my-11.com"),
  title: "MY DRAFTED XI — Build Your Ultimate Football Team",
  description: "Draft your dream football XI from iconic player seasons, simulate a 38-game season, and see if your squad can go unbeaten.",
  keywords: ["football draft", "football game", "squad builder", "football simulation", "Premier League", "legends", "MY DRAFTED XI"],
  authors: [{ name: "MY DRAFTED XI Fans" }],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MY DRAFTED XI",
  },
  openGraph: {
    title: "MY DRAFTED XI — Build Your Ultimate Football Team",
    description: "Draft your dream football XI from iconic player seasons, simulate a 38-game season, and see if your squad can go unbeaten.",
    url: "https://my-11.com",
    siteName: "MY DRAFTED XI",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "MY DRAFTED XI — Build Your Ultimate Football Team",
      }
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MY DRAFTED XI — Build Your Ultimate Football Team",
    description: "Draft your dream football XI from iconic player seasons, simulate a 38-game season, and see if your squad can go unbeaten.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
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
      <body className="min-h-full flex flex-col bg-slate-950 text-white select-none">
        {children}
      </body>
    </html>
  );
}
